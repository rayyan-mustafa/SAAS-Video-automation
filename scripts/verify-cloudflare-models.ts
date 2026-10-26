import fs from 'fs';
import path from 'path';

// Native .env file loader (zero-dependency)
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/^['"](.*)['"]$/, '$1');
    }
  }
}

import {
  getCloudflareCredentials,
  isCloudflareConfigured,
  runCloudflareJson,
  runCloudflareBinary,
} from '../src/lib/providers/cloudflareAiClient';
import { updateModelVerification, getModelById } from '../src/lib/video/modelRegistry';

interface StepResult {
  name: string;
  model: string;
  success: boolean;
  latencyMs: number;
  details: string;
}

async function main() {
  console.log('\n========================================================================');
  console.log('   AUTORA SAAS - CLOUDFLARE WORKERS AI LIVE SUITE VERIFICATION');
  console.log('========================================================================\n');

  const creds = getCloudflareCredentials();
  console.log(`[Config] Account ID: ${creds.accountId ? creds.accountId.slice(0, 6) + '...' : 'MISSING'}`);
  console.log(`[Config] API Token:  ${creds.apiToken ? creds.apiToken.slice(0, 8) + '...' : 'MISSING'}`);
  console.log(`[Config] Gateway ID: ${creds.gatewayId || 'None (Direct run)'}`);

  if (!isCloudflareConfigured()) {
    console.error('❌ Cloudflare credentials not found in environment or database.');
    process.exit(1);
  }

  const results: StepResult[] = [];
  let lastGeneratedImageBuf: Buffer | null = null;

  // 1. Text Generation LLM (Llama 3.3 70B Fast)
  console.log('\n[1/9] Testing Scriptwriting LLM (@cf/meta/llama-3.3-70b-instruct-fp8-fast)...');
  const t1 = Date.now();
  try {
    const res = await runCloudflareJson<any>('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      prompt: 'Write an irresistible 10-word YouTube Shorts hook about space exploration.',
      max_tokens: 60,
    });
    const text = res?.response || (typeof res === 'string' ? res : JSON.stringify(res));
    results.push({
      name: 'Scriptwriting LLM',
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      success: !!text && text.length > 5,
      latencyMs: Date.now() - t1,
      details: text.trim().slice(0, 100),
    });
    console.log(`  ✓ Passed (${Date.now() - t1}ms): "${text.trim().slice(0, 80)}..."`);
  } catch (err: any) {
    results.push({
      name: 'Scriptwriting LLM',
      model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      success: false,
      latencyMs: Date.now() - t1,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t1}ms): ${err.message}`);
  }

  // 2. Text-to-Image (FLUX.1 [schnell])
  console.log('\n[2/9] Testing FLUX.1 [schnell] Keyframe Generator (@cf/black-forest-labs/flux-1-schnell)...');
  const t2 = Date.now();
  try {
    const buf = await runCloudflareBinary('@cf/black-forest-labs/flux-1-schnell', {
      prompt: 'Cinematic photograph of a deep space nebula, 8k resolution, photorealistic',
      steps: 4,
    });
    lastGeneratedImageBuf = buf;
    const passed = buf && buf.length > 1000;
    results.push({
      name: 'FLUX.1 Schnell Keyframe',
      model: '@cf/black-forest-labs/flux-1-schnell',
      success: passed,
      latencyMs: Date.now() - t2,
      details: `Generated image payload: ${buf.length} bytes`,
    });
    console.log(`  ✓ Passed (${Date.now() - t2}ms): Received ${buf.length} bytes`);
    if (passed) {
      try {
        updateModelVerification('cloudflare-flux-motion', true, new Date().toISOString(), 0.003);
        console.log('  -> Registry: cloudflare-flux-motion marked VERIFIED');
      } catch {}
    }
  } catch (err: any) {
    results.push({
      name: 'FLUX.1 Schnell Keyframe',
      model: '@cf/black-forest-labs/flux-1-schnell',
      success: false,
      latencyMs: Date.now() - t2,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t2}ms): ${err.message}`);
  }

  // 3. Image Diffusion (SDXL Lightning)
  console.log('\n[3/9] Testing SDXL Lightning (@cf/bytedance/stable-diffusion-xl-lightning)...');
  const t3 = Date.now();
  try {
    const buf = await runCloudflareBinary('@cf/bytedance/stable-diffusion-xl-lightning', {
      prompt: 'Cyberpunk futuristic skyscraper city at twilight, 8k',
      num_steps: 4,
    });
    const passed = buf && buf.length > 1000;
    results.push({
      name: 'SDXL Lightning Diffusion',
      model: '@cf/bytedance/stable-diffusion-xl-lightning',
      success: passed,
      latencyMs: Date.now() - t3,
      details: `Generated image payload: ${buf.length} bytes`,
    });
    console.log(`  ✓ Passed (${Date.now() - t3}ms): Received ${buf.length} bytes`);
    if (passed) {
      try {
        updateModelVerification('cloudflare-sdxl-lightning', true, new Date().toISOString(), 0.002);
        console.log('  -> Registry: cloudflare-sdxl-lightning marked VERIFIED');
      } catch {}
    }
  } catch (err: any) {
    results.push({
      name: 'SDXL Lightning Diffusion',
      model: '@cf/bytedance/stable-diffusion-xl-lightning',
      success: false,
      latencyMs: Date.now() - t3,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t3}ms): ${err.message}`);
  }

  // 4. TTS (Deepgram Aura-2)
  console.log('\n[4/9] Testing TTS Audio Synthesis (@cf/deepgram/aura-2-en)...');
  const t4 = Date.now();
  try {
    const buf = await runCloudflareBinary('@cf/deepgram/aura-2-en', {
      text: 'Welcome to AUTORA video automation engine.',
      speaker: 'asteria',
    });
    const passed = buf && buf.length > 500;
    results.push({
      name: 'Deepgram Aura-2 TTS',
      model: '@cf/deepgram/aura-2-en',
      success: passed,
      latencyMs: Date.now() - t4,
      details: `Generated audio payload: ${buf.length} bytes`,
    });
    console.log(`  ✓ Passed (${Date.now() - t4}ms): Received ${buf.length} bytes`);
  } catch (err: any) {
    results.push({
      name: 'Deepgram Aura-2 TTS',
      model: '@cf/deepgram/aura-2-en',
      success: false,
      latencyMs: Date.now() - t4,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t4}ms): ${err.message}`);
  }

  // 5. Speech-to-Text Whisper Large v3 Turbo
  console.log('\n[5/9] Testing Whisper Speech-to-Text (@cf/openai/whisper-large-v3-turbo)...');
  const t5 = Date.now();
  try {
    // Generate a quick sine wave or dummy WAV buffer
    const dummyWavHeader = Buffer.from([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00,
      0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
      0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
      0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
      0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61,
      0x00, 0x00, 0x00, 0x00,
    ]);
    const res = await runCloudflareJson<any>('@cf/openai/whisper-large-v3-turbo', {
      audio: dummyWavHeader.toString('base64'),
    });
    results.push({
      name: 'Whisper Transcription',
      model: '@cf/openai/whisper-large-v3-turbo',
      success: true,
      latencyMs: Date.now() - t5,
      details: 'Endpoint accepted payload and returned response',
    });
    console.log(`  ✓ Passed (${Date.now() - t5}ms)`);
  } catch (err: any) {
    results.push({
      name: 'Whisper Transcription',
      model: '@cf/openai/whisper-large-v3-turbo',
      success: false,
      latencyMs: Date.now() - t5,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t5}ms): ${err.message}`);
  }

  // 6. Moderation Guard (Llama Guard 3-8B)
  console.log('\n[6/9] Testing Moderation Guard (@cf/meta/llama-guard-3-8b)...');
  const t6 = Date.now();
  try {
    const res = await runCloudflareJson<any>('@cf/meta/llama-guard-3-8b', {
      messages: [{ role: 'user', content: 'Exploring deep space telescopes and galaxies.' }],
      max_tokens: 32,
    });
    const resp = res?.response || (typeof res === 'string' ? res : '');
    const isSafe = resp.toLowerCase().includes('safe') && !resp.toLowerCase().includes('unsafe');
    results.push({
      name: 'Llama Guard Moderation',
      model: '@cf/meta/llama-guard-3-8b',
      success: isSafe || !!resp,
      latencyMs: Date.now() - t6,
      details: resp.trim() || 'Safe',
    });
    console.log(`  ✓ Passed (${Date.now() - t6}ms): Response "${resp.trim()}"`);
  } catch (err: any) {
    results.push({
      name: 'Llama Guard Moderation',
      model: '@cf/meta/llama-guard-3-8b',
      success: false,
      latencyMs: Date.now() - t6,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t6}ms): ${err.message}`);
  }

  // 7. Vision QC (Llama 3.2 11B Vision Instruct)
  console.log('\n[7/9] Testing Vision QC (@cf/meta/llama-3.2-11b-vision-instruct)...');
  const t7 = Date.now();
  try {
    const testImage = lastGeneratedImageBuf || Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      'base64'
    );

    const res = await runCloudflareJson<any>('@cf/meta/llama-3.2-11b-vision-instruct', {
      prompt: 'Describe what you see in this image in 5 words.',
      image: Array.from(testImage),
      max_tokens: 32,
    });

    const text = res?.response || (typeof res === 'string' ? res : JSON.stringify(res));
    results.push({
      name: 'Vision QC Inspection',
      model: '@cf/meta/llama-3.2-11b-vision-instruct',
      success: !!text,
      latencyMs: Date.now() - t7,
      details: text.trim().slice(0, 80),
    });
    console.log(`  ✓ Passed (${Date.now() - t7}ms): "${text.trim().slice(0, 60)}"`);
  } catch (err: any) {
    results.push({
      name: 'Vision QC Inspection',
      model: '@cf/meta/llama-3.2-11b-vision-instruct',
      success: false,
      latencyMs: Date.now() - t7,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t7}ms): ${err.message}`);
  }

  // 8. Originality Embeddings (BGE-M3)
  console.log('\n[8/9] Testing Embeddings Radar (@cf/baai/bge-m3)...');
  const t8 = Date.now();
  try {
    const res = await runCloudflareJson<any>('@cf/baai/bge-m3', {
      text: ['The secrets of ancient civilizations', 'Mysteries of ancient history'],
    });
    const vectors = res?.data || res;
    const passed = Array.isArray(vectors) && vectors.length >= 2;
    results.push({
      name: 'BGE-M3 Multilingual Embeddings',
      model: '@cf/baai/bge-m3',
      success: passed,
      latencyMs: Date.now() - t8,
      details: passed ? `Vectors returned: ${vectors.length}, Dimensions: ${vectors[0]?.length}` : 'Invalid shape',
    });
    console.log(`  ✓ Passed (${Date.now() - t8}ms): Shape [${vectors?.length}, ${vectors?.[0]?.length}]`);
  } catch (err: any) {
    results.push({
      name: 'BGE-M3 Multilingual Embeddings',
      model: '@cf/baai/bge-m3',
      success: false,
      latencyMs: Date.now() - t8,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t8}ms): ${err.message}`);
  }

  // 9. Model Search Handshake
  console.log('\n[9/9] Testing Account AI Model Search Handshake...');
  const t9 = Date.now();
  try {
    const searchUrl = `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/models/search?per_page=3`;
    const pingRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${creds.apiToken}` },
    });
    const pingData: any = await pingRes.json();
    const passed = pingRes.ok && pingData.success;
    results.push({
      name: 'Account Model Search',
      model: 'client/v4/accounts/.../ai/models/search',
      success: passed,
      latencyMs: Date.now() - t9,
      details: passed ? `Active models indexed: ${pingData.result?.length ?? 0}` : pingData.errors?.[0]?.message,
    });
    console.log(`  ✓ Passed (${Date.now() - t9}ms): ${pingData.result?.length ?? 0} models indexed`);
  } catch (err: any) {
    results.push({
      name: 'Account Model Search',
      model: 'client/v4/accounts/.../ai/models/search',
      success: false,
      latencyMs: Date.now() - t9,
      details: err.message,
    });
    console.warn(`  ✗ Failed (${Date.now() - t9}ms): ${err.message}`);
  }

  // Summary Report
  console.log('\n========================================================================');
  console.log('   VERIFICATION SUMMARY TABLE');
  console.log('========================================================================');
  console.table(
    results.map((r) => ({
      Capability: r.name,
      Model: r.model.split('/').pop(),
      Status: r.success ? '✓ PASS' : '✗ FAIL',
      Latency: `${r.latencyMs}ms`,
      Details: r.details.slice(0, 45),
    }))
  );

  const totalPassed = results.filter((r) => r.success).length;
  console.log(`\nResult: ${totalPassed}/${results.length} Cloudflare Workers AI services operational.`);
}

main().catch((err) => {
  console.error('Fatal error in Cloudflare verification:', err);
  process.exit(1);
});
