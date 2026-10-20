import http from 'http';
import fs from 'fs';
import path from 'path';
import { getDb, addUserVoice, getUserVoices, deleteUserVoice } from '../src/lib/db';
import { createSession, SESSION_TOKEN_COOKIE } from '../src/lib/auth';
import { storage } from '../src/lib/storage';

async function httpRequest(url: string, options: any = {}): Promise<{ status: number; body: string; json: any }> {
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
        res.on('end', () => {
          let parsedJson = null;
          try {
            parsedJson = JSON.parse(data);
          } catch (_) {}
          resolve({ status: res.statusCode || 0, body: data, json: parsedJson });
        });
      }
    );
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function buildMultipartBody(fields: Record<string, string>, file?: { name: string; filename: string; contentType: string; data: Buffer }) {
  const boundary = '----WebKitFormBoundaryVoiceHardenedTest' + Date.now();
  const chunks: Buffer[] = [];

  for (const [key, val] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  if (file) {
    chunks.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`
      )
    );
    chunks.push(file.data);
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: Buffer.concat(chunks),
  };
}

async function runTests() {
  console.log('================================================================');
  console.log('VOICE CLONING STUDIO: PRODUCTION HARDENING & SECURITY TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      if (detail) console.error(`       Detail: ${detail}`);
      throw new Error(`Test failed: ${testName} - ${detail || ''}`);
    }
  }

  const BASE_URL = 'http://localhost:3000';

  // Create two distinct users in DB for isolation and IDOR checks
  const db = getDb();
  const userA = 'usr_hardened_alice_' + Date.now();
  const userB = 'usr_hardened_bob_' + Date.now();

  const nowIso = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, '', '', 'Alice', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(userA, `${userA}@test.local`, nowIso, nowIso);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
    VALUES (?, ?, '', '', 'Bob', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
  `).run(userB, `${userB}@test.local`, nowIso, nowIso);

  const tokenA = createSession(userA).sessionToken;
  const tokenB = createSession(userB).sessionToken;

  const authHeadersA = { Cookie: `${SESSION_TOKEN_COOKIE}=${tokenA}` };
  const authHeadersB = { Cookie: `${SESSION_TOKEN_COOKIE}=${tokenB}` };

  // --- 1. Authentication Enforcement ---
  console.log('--- 1. Authentication Enforcement ---');
  const unauthGet = await httpRequest(`${BASE_URL}/api/voice/my-voices`);
  assert(unauthGet.status === 401, 'GET /api/voice/my-voices rejects unauthenticated requests with 401', `Got status ${unauthGet.status}`);

  const unauthPost = await httpRequest(`${BASE_URL}/api/voice/clone`, { method: 'POST' });
  assert(unauthPost.status === 401, 'POST /api/voice/clone rejects unauthenticated requests with 401', `Got status ${unauthPost.status}`);

  const unauthDelete = await httpRequest(`${BASE_URL}/api/voice/my-voices?id=some_id`, { method: 'DELETE' });
  assert(unauthDelete.status === 401, 'DELETE /api/voice/my-voices rejects unauthenticated requests with 401', `Got status ${unauthDelete.status}`);

  // --- 2. Cross-Tenant Isolation & IDOR Protection ---
  console.log('\n--- 2. Cross-Tenant Isolation & IDOR Protection ---');
  // Seed sample voice for User A directly in DB
  const voiceA = addUserVoice(userA, 'Alice Private Voice', 'eleven_alice_voice_123', '/api/assets/sample.wav');

  // Also create a sample wav on disk to verify deletion cleanup later
  const sampleRelPath = `voices/${userA}/${voiceA.voice_id}.wav`;
  await storage.putObject(sampleRelPath, Buffer.from('RIFF_DUMMY_AUDIO_DATA_FOR_CLEANUP_CHECK'), 'audio/wav');
  const sampleFilePath = storage.getFilePath(sampleRelPath);
  assert(fs.existsSync(sampleFilePath), 'Sample audio file created on disk for cleanup test');

  // User B lists voices: User A's voice must NOT appear
  const userBList = await httpRequest(`${BASE_URL}/api/voice/my-voices`, { headers: authHeadersB });
  assert(userBList.status === 200, 'User B can fetch their empty voice list with 200');
  const bVoices = userBList.json?.voices || [];
  const leakedVoice = bVoices.find((v: any) => v.id === voiceA.id || v.voice_id === voiceA.voice_id);
  assert(!leakedVoice, "User B's list does not contain User A's cloned voice (Tenant Isolation)");

  // User B attempts to DELETE User A's voice (IDOR attempt)
  const idorDelete = await httpRequest(`${BASE_URL}/api/voice/my-voices?id=${voiceA.id}`, {
    method: 'DELETE',
    headers: authHeadersB,
  });
  assert(idorDelete.status === 404, 'User B cannot delete User A voice (HTTP 404 IDOR protected)', `Got status ${idorDelete.status}`);
  assert(fs.existsSync(sampleFilePath), "User A's audio sample remains intact on disk after IDOR delete attempt");

  // User A lists voices: response is sanitized (no user_id exposed)
  const userAList = await httpRequest(`${BASE_URL}/api/voice/my-voices`, { headers: authHeadersA });
  assert(userAList.status === 200, 'User A can fetch their voice list with 200');
  const foundA = userAList.json?.voices?.find((v: any) => v.id === voiceA.id);
  assert(!!foundA, "User A's voice found in their own list");
  assert(foundA.user_id === undefined, "Sanitization check: user_id is NOT leaked in API response");

  // --- 3. Input Validation on /api/voice/clone ---
  console.log('\n--- 3. Input Validation on /api/voice/clone ---');

  // A. Missing audio payload
  const emptyForm = buildMultipartBody({ name: 'Test Voice' });
  const missingAudioRes = await httpRequest(`${BASE_URL}/api/voice/clone`, {
    method: 'POST',
    headers: { ...authHeadersA, 'Content-Type': emptyForm.contentType },
    body: emptyForm.body,
  });
  assert(missingAudioRes.status === 400, 'Missing audio payload returns 400', `Got status ${missingAudioRes.status}`);
  assert(missingAudioRes.json?.success === false, 'Standardized error format returns success: false');

  // B. Disallowed file extension (e.g. .exe or .txt)
  const badExtForm = buildMultipartBody(
    { name: 'Malicious Upload' },
    { name: 'file', filename: 'malware.exe', contentType: 'application/octet-stream', data: Buffer.alloc(10000) }
  );
  const badExtRes = await httpRequest(`${BASE_URL}/api/voice/clone`, {
    method: 'POST',
    headers: { ...authHeadersA, 'Content-Type': badExtForm.contentType },
    body: badExtForm.body,
  });
  assert(badExtRes.status === 400, 'Disallowed extension (.exe) rejected with 400', `Got status ${badExtRes.status}`);

  // C. Too small payload (< 8KB)
  const tinyForm = buildMultipartBody(
    { name: 'Too Short Voice' },
    { name: 'file', filename: 'clip.wav', contentType: 'audio/wav', data: Buffer.alloc(1024) } // 1 KB
  );
  const tinyRes = await httpRequest(`${BASE_URL}/api/voice/clone`, {
    method: 'POST',
    headers: { ...authHeadersA, 'Content-Type': tinyForm.contentType },
    body: tinyForm.body,
  });
  assert(tinyRes.status === 400, 'Audio < 8KB rejected with min duration error (400)', `Got status ${tinyRes.status}`);

  // D. Too large payload (> 25MB check via 413 check logic)
  const hugeForm = buildMultipartBody(
    { name: 'Huge Voice' },
    { name: 'file', filename: 'huge.wav', contentType: 'audio/wav', data: Buffer.alloc(26 * 1024 * 1024) } // 26 MB
  );
  const hugeRes = await httpRequest(`${BASE_URL}/api/voice/clone`, {
    method: 'POST',
    headers: { ...authHeadersA, 'Content-Type': hugeForm.contentType },
    body: hugeForm.body,
  });
  assert(hugeRes.status === 413, 'Audio > 25MB rejected with HTTP 413 Payload Too Large', `Got status ${hugeRes.status}`);

  // E. Valid in-app audio cloning succeeds without ElevenLabs key (Built-in Studio Voice Clone Engine)
  const ffmpeg = (await import('../src/lib/providers/videoProvider')).getFfmpegPath();
  const test6sWav = path.join(process.cwd(), 'temp', 'test_speech_sample_6s.wav');
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);
  await execFileAsync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=350:duration=6', '-c:a', 'pcm_s16le', test6sWav]);
  const sampleWavBytes = fs.readFileSync(test6sWav);

  const validCloneForm = buildMultipartBody(
    { name: 'Alice Cloned Host Voice' },
    { name: 'file', filename: 'voice_sample.wav', contentType: 'audio/wav', data: sampleWavBytes }
  );
  const validCloneRes = await httpRequest(`${BASE_URL}/api/voice/clone`, {
    method: 'POST',
    headers: { ...authHeadersA, 'Content-Type': validCloneForm.contentType },
    body: validCloneForm.body,
  });
  assert(validCloneRes.status === 201, 'In-App Voice Cloning succeeds with HTTP 201 Created', `Got status ${validCloneRes.status} (${validCloneRes.json?.error || ''})`);
  assert(validCloneRes.json?.success === true, 'Response contains success: true');
  assert(validCloneRes.json?.voice?.name === 'Alice Cloned Host Voice', 'Response contains cloned voice with correct name');
  assert(!!validCloneRes.json?.voice?.voice_id, 'Response contains generated voice_id');

  // Verify voice is present in user's voice list
  const refreshedList = await httpRequest(`${BASE_URL}/api/voice/my-voices`, { headers: authHeadersA });
  const inList = refreshedList.json?.voices?.find((v: any) => v.voice_id === validCloneRes.json?.voice?.voice_id);
  assert(!!inList, 'Newly cloned voice is retrievable via GET /api/voice/my-voices');

  // --- 4. Path Traversal Protection on Asset Reverse Proxy ---
  console.log('\n--- 4. Path Traversal Protection on Asset Reverse Proxy ---');
  const traversal1 = await httpRequest(`${BASE_URL}/api/assets/%2e%2e%2f%2e%2e%2fpackage.json`);
  assert(traversal1.status === 400 || traversal1.status === 404, 'Path traversal attempt rejected safely (400 or 404)', `Got status ${traversal1.status}`);

  const traversal2 = await httpRequest(`${BASE_URL}/api/assets/test%5c%2e%2e%5csecret`);
  assert(traversal2.status === 400 || traversal2.status === 404, 'Backslash traversal attempt rejected safely (400 or 404)', `Got status ${traversal2.status}`);

  // --- 5. Legitimate Deletion & File Cleanup ---
  console.log('\n--- 5. Legitimate Deletion & Disk Cleanup ---');
  const validDelete = await httpRequest(`${BASE_URL}/api/voice/my-voices?id=${voiceA.id}`, {
    method: 'DELETE',
    headers: authHeadersA,
  });
  assert(validDelete.status === 200, 'Owner can delete their own voice with 200', `Got status ${validDelete.status}`);
  assert(validDelete.json?.success === true, 'DELETE returns success: true');

  // Verify voice is deleted from SQLite
  const remainingVoices = getUserVoices(userA);
  const stillHasVoiceA = remainingVoices.some((v) => v.id === voiceA.id);
  assert(!stillHasVoiceA, 'Voice A removed from SQLite database');

  // Verify audio sample was unlinked from disk
  assert(!fs.existsSync(sampleFilePath), 'Audio sample file was cleanly removed from disk on voice deletion');

  // --- 6. Malformed Delete ID checks ---
  console.log('\n--- 6. Malformed Delete ID Validation ---');
  const malformedDelete = await httpRequest(`${BASE_URL}/api/voice/my-voices?id=../../evil_id`, {
    method: 'DELETE',
    headers: authHeadersA,
  });
  assert(malformedDelete.status === 400, 'Malformed voice ID with traversal characters rejected with 400');

  console.log('\n================================================================');
  console.log(`ALL PRODUCTION HARDENING TESTS PASSED (${passed}/${total})! 🎉`);
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\nTest runner failed:', err);
  process.exit(1);
});
