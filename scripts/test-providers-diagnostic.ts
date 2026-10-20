import fs from 'fs';
import path from 'path';

function getEnvMap() {
  const envPath = path.join(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envMap: Record<string, string> = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx !== -1) {
      const k = trimmed.substring(0, idx).trim();
      const v = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      envMap[k] = v;
    }
  }
  return envMap;
}

async function main() {
  const env = getEnvMap();
  console.log('--- Testing Live AI Providers Diagnostics ---');

  // 1. OpenRouter
  const orKey = env.OPENROUTER_API_KEY;
  const orModel = env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
  console.log('\n[1] OpenRouter:');
  console.log('  Model:', orModel);
  console.log('  Key present:', !!orKey, orKey ? `(${orKey.substring(0, 10)}... len: ${orKey.length})` : '');
  if (orKey) {
    let formattedKey = orKey.trim();
    if (!formattedKey.startsWith('sk-or-v1-') && formattedKey.length === 64) {
      formattedKey = `sk-or-v1-${formattedKey}`;
    }
    const t0 = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${formattedKey}`,
          'HTTP-Referer': 'https://youtube-automation-three-neon.vercel.app/',
          'X-Title': 'YouTube Automation SaaS',
        },
        body: JSON.stringify({
          model: orModel,
          messages: [{ role: 'user', content: 'Respond with exactly: "OpenRouter active"' }],
          max_tokens: 30,
        }),
      });
      const elapsed = Date.now() - t0;
      console.log('  Status:', res.status, res.statusText, `(${elapsed}ms)`);
      const body = await res.text();
      console.log('  Response preview:', body.substring(0, 200));
    } catch (e: any) {
      console.log('  Fetch Error:', e.message);
    }
  }

  // 2. Gemini
  const geminiKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
  console.log('\n[2] Google Gemini:');
  console.log('  Key present:', !!geminiKey, geminiKey ? `(${geminiKey.substring(0, 10)}... len: ${geminiKey.length})` : '');
  if (geminiKey) {
    const modelsToTest = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const m of modelsToTest) {
      const t0 = Date.now();
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Respond with exactly: "Gemini active"' }] }],
          }),
        });
        const elapsed = Date.now() - t0;
        console.log(`  Model [${m}] Status:`, res.status, res.statusText, `(${elapsed}ms)`);
        const body = await res.text();
        console.log(`  Response preview:`, body.substring(0, 160));
      } catch (e: any) {
        console.log(`  Model [${m}] Error:`, e.message);
      }
    }
  }
}

main().catch(console.error);
