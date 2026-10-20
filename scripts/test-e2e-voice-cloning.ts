import http from 'http';
import { getDb, addUserVoice, deleteUserVoice } from '../src/lib/db';
import { createSession, SESSION_TOKEN_COOKIE } from '../src/lib/auth';

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
  console.log('--- E2E TEST: In-App Voice Cloning Studio ---');

  // Create active session for test user
  const testUserId = 'user_default';
  const { sessionToken } = createSession(testUserId);
  const authHeaders = {
    Cookie: `${SESSION_TOKEN_COOKIE}=${sessionToken}`,
  };

  // 1. Check /content/new page HTML
  console.log('1. Checking /content/new UI...');
  const newPageRes = await request('http://localhost:3000/content/new', { headers: authHeaders });
  console.log(`   Status: ${newPageRes.status}`);
  if (newPageRes.status !== 200) throw new Error(`/content/new returned status ${newPageRes.status}`);
  if (!newPageRes.body.includes('Loading Studio Creator') && !newPageRes.body.includes('Create Your Video')) {
    throw new Error('Create Your Video wizard not found in HTML');
  }
  console.log('   ✓ /content/new rendered successfully.');

  // 2. Test GET /api/voice/my-voices with authenticated session
  console.log('\n2. Testing GET /api/voice/my-voices with active user session...');
  const myVoicesRes = await request('http://localhost:3000/api/voice/my-voices', { headers: authHeaders });
  console.log(`   Status: ${myVoicesRes.status}`);
  console.log(`   Response: ${myVoicesRes.body}`);
  const voicesJson = JSON.parse(myVoicesRes.body);
  if (!Array.isArray(voicesJson.voices)) {
    throw new Error('Expected voices array in response');
  }
  console.log(`   ✓ Successfully fetched voices list (${voicesJson.voices.length} existing voices).`);

  // 3. Test POST /api/voice/clone validation (no audio provided)
  console.log('\n3. Testing POST /api/voice/clone validation (missing audio payload)...');
  const emptyPostRes = await request('http://localhost:3000/api/voice/clone', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'Content-Type': 'multipart/form-data; boundary=---boundary',
    },
    body: '-----boundary\r\nContent-Disposition: form-data; name="name"\r\n\r\nTest Voice\r\n-----boundary--\r\n',
  });
  console.log(`   Status: ${emptyPostRes.status}`);
  console.log(`   Response: ${emptyPostRes.body}`);
  if (emptyPostRes.status !== 400) {
    throw new Error(`Expected status 400 for empty audio, got ${emptyPostRes.status}`);
  }
  console.log('   ✓ Correctly rejected missing audio payload with HTTP 400.');

  // 4. Test cloned voice persistence in database and retrieval via GET API
  console.log('\n4. Testing cloned voice persistence in /api/voice/my-voices...');
  const testVoice = addUserVoice(testUserId, 'Nabeel Personal Host Voice', 'vKpzJkQp78nLkWq998877', '/api/assets/sample.wav');
  console.log(`   Inserted test voice: ${testVoice.id} (${testVoice.name})`);

  const checkVoicesRes = await request('http://localhost:3000/api/voice/my-voices', { headers: authHeaders });
  const checkJson = JSON.parse(checkVoicesRes.body);
  const found = checkJson.voices.find((v: any) => v.id === testVoice.id);
  if (!found) throw new Error('Inserted voice not found in GET /api/voice/my-voices');
  console.log(`   ✓ Found cloned voice in API: "${found.name}" (ElevenLabs Voice ID: ${found.voice_id})`);

  // 5. Test DELETE /api/voice/my-voices?id=...
  console.log('\n5. Testing DELETE /api/voice/my-voices...');
  const delRes = await request(`http://localhost:3000/api/voice/my-voices?id=${testVoice.id}`, {
    method: 'DELETE',
    headers: authHeaders,
  });
  console.log(`   Status: ${delRes.status}`);
  console.log(`   Response: ${delRes.body}`);
  const delJson = JSON.parse(delRes.body);
  if (!delJson.success) throw new Error('DELETE /api/voice/my-voices failed');
  console.log('   ✓ Successfully deleted cloned voice via API.');

  console.log('\n=============================================');
  console.log('ALL E2E VOICE CLONING TESTS PASSED (5/5)! 🚀');
  console.log('=============================================');
}

main().catch((err) => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
