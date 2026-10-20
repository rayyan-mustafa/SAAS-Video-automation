import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

async function testGeminiRaw() {
  const apiKey = process.env.GEMINI_API_KEY;
  const testImgPath = path.resolve(process.cwd(), 'temp/test_frame.jpg');
  const base64Img = fs.readFileSync(testImgPath).toString('base64');

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: base64Img,
              },
            },
            { text: 'Describe what you see in this image in one short sentence.' },
          ],
        },
      ],
    }),
  });

  const text = await res.text();
  console.log('Gemini HTTP Status:', res.status);
  console.log('Gemini HTTP Response:', text.substring(0, 500));
}

testGeminiRaw().catch(console.error);
