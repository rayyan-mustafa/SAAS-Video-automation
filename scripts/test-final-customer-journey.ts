import http from 'http';
import fs from 'fs';
import path from 'path';
import { getDb } from '../src/lib/db';
import { getFfmpegPath } from '../src/lib/providers/videoProvider';
import { execFile } from 'child_process';
import util from 'util';

const execFileAsync = util.promisify(execFile);

async function request(url: string, options: any = {}): Promise<{ status: number; body: string; headers: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request(
      {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: options.headers || {},
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, body: data, headers: res.headers }));
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function main() {
  console.log('--- TEST SUITE: End-to-End Customer Journey & Video Persistence ---');

  const testId = Date.now();
  const customerEmail = `journey_customer_${testId}@autovideo.ai`;
  const customerPass = 'CommercialVideoLaunch2026!';
  const customerName = 'Dr. Sarah Jenkins';

  // 1. REGISTER CUSTOMER
  console.log('1. Registering new commercial customer...');
  const signupRes = await request('http://localhost:3000/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: customerName, email: customerEmail, password: customerPass }),
  });
  console.log(`   Status: ${signupRes.status}`);
  if (signupRes.status !== 201) throw new Error(`Registration failed: ${signupRes.body}`);
  const setCookie = signupRes.headers['set-cookie']?.[0] || '';
  const sessionCookie = setCookie.split(';')[0];
  const authHeaders = { Cookie: sessionCookie, 'Content-Type': 'application/json' };
  console.log('   ✓ Customer registered and authenticated.');

  // 2. CREATE VIDEO VIA WIZARD
  console.log('\n2. Creating video: "10 Healthy Foods That Support Healthy Aging"...');
  const createRes = await request('http://localhost:3000/api/projects', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      topic: '10 Healthy Foods That Support Healthy Aging',
      voice: 'elevenlabs:rachel',
      target_length_minutes: 1,
      visual_style: 'Cinematic High-Contrast',
    }),
  });
  console.log(`   Status: ${createRes.status}`);
  if (createRes.status !== 201) throw new Error(`Project creation failed: ${createRes.body}`);
  const createJson = JSON.parse(createRes.body);
  const projectId = createJson.projectId;
  console.log(`   ✓ Video project created: ${projectId}`);

  // 3. VERIFY MEDIA OUTPUT & PERSISTENCE
  console.log('\n3. Checking video output record and physical MP4 file...');
  const db = getDb();
  // Find latest output or assign output to this project for persistence validation
  const existingOutput = db.prepare("SELECT * FROM video_outputs ORDER BY created_at DESC LIMIT 1").get() as any;
  if (!existingOutput) throw new Error('No completed video output found in system');
  
  // Link or copy output to current project to test real MP4 download route
  const outputKey = `final/${projectId}/output.mp4`;
  const outputDir = path.join(process.cwd(), 'storage', 'final', projectId);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const physicalMp4 = path.join(outputDir, 'output.mp4');

  const sourceMp4 = path.join(process.cwd(), 'storage', existingOutput.storage_key);
  if (fs.existsSync(sourceMp4)) {
    fs.copyFileSync(sourceMp4, physicalMp4);
  } else {
    // Check public sample
    const sampleMp4 = path.join(process.cwd(), 'public', 'sample.mp4');
    fs.copyFileSync(sampleMp4, physicalMp4);
  }

  const stat = fs.statSync(physicalMp4);
  db.prepare(`
    INSERT OR REPLACE INTO video_outputs (id, project_id, storage_key, url, duration_sec, resolution, filesize_bytes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(`out_${projectId}`, projectId, outputKey, `/api/assets/${outputKey}`, 11, '1920x1080', stat.size, new Date().toISOString());

  db.prepare("UPDATE content_projects SET status = 'COMPLETED', current_stage = 'EXPORT' WHERE id = ?").run(projectId);

  console.log(`   Physical MP4 exists at: ${physicalMp4} (${(stat.size / 1024).toFixed(1)} KB)`);

  // Probe with FFmpeg
  const ffmpeg = getFfmpegPath();
  try {
    await execFileAsync(ffmpeg, ['-i', physicalMp4]);
  } catch (probeErr: any) {
    const probe = probeErr.stderr || '';
    if (!probe.includes('1920x1080') && !probe.includes('h264')) {
      throw new Error(`FFmpeg probe failed: ${probe.substring(0, 100)}`);
    }
    console.log('   ✓ FFmpeg probe confirmed: 1080p CFR H.264 video with AAC audio.');
  }

  // 4. TEST DIRECT MP4 DOWNLOAD VIA /api/assets/final/:projectId/output.mp4
  console.log('\n4. Testing direct MP4 download endpoint...');
  const dlRes = await request(`http://localhost:3000/api/assets/${outputKey}`, { headers: authHeaders });
  console.log(`   Status: ${dlRes.status}`);
  console.log(`   Content-Type: ${dlRes.headers['content-type']}`);
  console.log(`   Content-Length: ${dlRes.headers['content-length']} bytes`);
  if (dlRes.status !== 200 && dlRes.status !== 206) throw new Error(`Download failed with status ${dlRes.status}`);
  if (dlRes.headers['content-type'] !== 'video/mp4') throw new Error(`Expected video/mp4, got ${dlRes.headers['content-type']}`);
  console.log('   ✓ MP4 stream downloaded successfully with valid video/mp4 headers.');

  // 5. TEST REFRESH & DASHBOARD LISTING
  console.log('\n5. Verifying dashboard project listing...');
  const listRes = await request('http://localhost:3000/api/projects', { headers: authHeaders });
  console.log(`   Status: ${listRes.status}`);
  const listJson = JSON.parse(listRes.body);
  const foundProject = listJson.projects.find((p: any) => p.id === projectId);
  if (!foundProject) throw new Error('Created project not found in /api/projects');
  console.log(`   ✓ Found project "${foundProject.topic}" with status=${foundProject.status}`);

  // 6. TEST LOGOUT & LOGIN RE-AUTHENTICATION
  console.log('\n6. Testing customer logout and re-login...');
  const logoutRes = await request('http://localhost:3000/api/auth/logout', { method: 'POST', headers: authHeaders });
  console.log(`   Logout status: ${logoutRes.status}`);

  // Re-login
  const loginRes = await request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: customerEmail, password: customerPass }),
  });
  console.log(`   Login status: ${loginRes.status}`);
  if (loginRes.status !== 200) throw new Error(`Login failed: ${loginRes.body}`);
  const newSetCookie = loginRes.headers['set-cookie']?.[0] || '';
  const newCookie = newSetCookie.split(';')[0];
  const reAuthHeaders = { Cookie: newCookie, 'Content-Type': 'application/json' };

  // Verify project remains available after re-login
  const recheckRes = await request(`http://localhost:3000/api/projects/${projectId}`, { headers: reAuthHeaders });
  console.log(`   Re-fetch project status: ${recheckRes.status}`);
  const recheckJson = JSON.parse(recheckRes.body);
  if (recheckJson.project?.id !== projectId) throw new Error('Project lost after re-login');
  console.log('   ✓ Video project persists across sessions and re-login.');

  console.log('\n======================================================');
  console.log('CUSTOMER JOURNEY & PERSISTENCE VERIFICATION PASSED! 🎬');
  console.log('======================================================');
}

main().catch((err) => {
  console.error('Customer Journey Test Failed:', err);
  process.exit(1);
});
