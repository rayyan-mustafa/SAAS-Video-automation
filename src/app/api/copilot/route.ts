import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getApiKey } from '@/lib/db';

export const dynamic = 'force-dynamic';

async function executeAiLlmPrompt(systemPrompt: string, userPrompt: string): Promise<string | null> {
  // 1. Try Gemini
  const geminiKey = getApiKey('gemini');
  if (geminiKey) {
    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
    for (const model of geminiModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text && text.trim()) return text.trim();
        }
      } catch (e: any) {
        console.warn(`[Copilot] Gemini (${model}) error:`, e.message);
      }
    }
  }

  // 2. Try OpenAI
  const openAiKey = getApiKey('openai');
  if (openAiKey) {
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 600,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content;
        if (text && text.trim()) return text.trim();
      }
    } catch (e: any) {
      console.warn('[Copilot] OpenAI execution error:', e.message);
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      action,
      topic = 'General Subject',
      currentText = '',
      sceneIndex = 1,
      niche = 'General',
      tone = 'Cinematic & Authoritative',
    } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const systemInstruction = `You are AUTORA Studio Copilot, an elite cinematic YouTube director, viral scriptwriter, and prompt engineer. You produce ultra-high retention video concepts, punchy narrations, and vivid visual prompts in the "${niche}" niche.`;

    let userPrompt = '';
    let fallbackText = '';

    switch (action) {
      case 'rewrite_scene':
      case 'rewrite':
        userPrompt = `Rewrite the following scene narration to make it more cinematic, engaging, and high-impact for scene #${sceneIndex} about "${topic}":\n\n"${currentText}"`;
        fallbackText = `[Cinematic Upgrade] ${currentText || topic} — Shot in anamorphic 2.39:1 widescreen, high-contrast chiaroscuro lighting, establishing deep atmospheric focal clarity with steady dolly tracking.`;
        break;

      case 'improve_hook':
      case 'stronger_hook':
        userPrompt = `Create 3 extremely punchy, high-retention video opening hooks (under 15 words each) for a video about "${topic}" in the ${niche} niche.`;
        fallbackText = `1. "What if everything you thought was true about ${topic} was intentionally designed backwards?"\n2. "In the next 60 seconds, you will discover the exact mechanism behind ${topic}."\n3. "99% of people fail to realize the single most critical factor in ${topic}."`;
        break;

      case 'shorten':
      case 'shorten_narration':
        userPrompt = `Shorten this video scene narration by 40% while preserving maximum dramatic intensity and clarity:\n\n"${currentText}"`;
        const words = (currentText || topic).split(' ');
        fallbackText = words.slice(0, Math.max(8, Math.floor(words.length * 0.6))).join(' ') + '.';
        break;

      case 'expand':
      case 'expand_scene':
        userPrompt = `Expand this scene narration with vivid details, compelling storytelling, and sensory depth for video topic "${topic}":\n\n"${currentText}"`;
        fallbackText = `${currentText} Every detail in this environment reinforces the central premise, creating an immersive visual atmosphere with heightened emotional depth.`;
        break;

      case 'change_tone':
        userPrompt = `Rewrite the following narration in a ${tone} tone for the ${niche} audience on YouTube:\n\n"${currentText}"`;
        fallbackText = `[Tone: ${tone}] ${currentText}`;
        break;

      case 'generate_visual_prompt':
      case 'visual_prompt':
        userPrompt = `Write a photorealistic, 8k cinematic AI video generation prompt for scene #${sceneIndex} depicting: "${currentText || topic}". Include camera movement, lighting, color style, and anamorphic lens details.`;
        fallbackText = `Cinematic 8k footage of ${currentText || topic}, anamorphic 35mm lens, volumetric god rays, hyper-detailed textures, smooth slow-motion pan, 60fps color graded.`;
        break;

      case 'generate_thumbnail_ideas':
      case 'thumbnail_ideas':
        userPrompt = `Generate 3 high CTR YouTube thumbnail concepts with visual descriptions and bold 2-3 word keyword overlays for "${topic}" in ${niche}.`;
        fallbackText = `Concept A: High-contrast split portrait with glowing cyan text "${topic.substring(0, 18)}..."\nConcept B: Minimalist dark void with 3D floating chrome emblem and warning badge.\nConcept C: Extreme close-up with intense lighting and bold yellow keyword banner.`;
        break;

      case 'generate_title':
      case 'generate_titles':
        userPrompt = `Generate 5 viral, high-click-through YouTube titles for a video about "${topic}" in ${niche}.`;
        fallbackText = `1. The Hidden Truth About ${topic} (Explained)\n2. Why Most People Get ${topic} Completely Wrong\n3. How ${topic} Will Change Everything\n4. The Ultimate Masterclass Guide to ${topic}\n5. 7 Unspoken Rules of ${topic} You Need to Know`;
        break;

      case 'generate_description':
      case 'description':
        userPrompt = `Write an SEO-optimized YouTube video description with timestamps, key takeaways, and relevant hashtags for "${topic}".`;
        fallbackText = `In this deep-dive, we break down the definitive truth about ${topic}.\n\n📌 Timestamps:\n0:00 - Introduction & The Core Problem\n1:30 - The Breakdown\n4:00 - What Most People Miss\n6:30 - Final Verdict\n\n#${niche.replace(/\s+/g, '')} #${topic.replace(/\s+/g, '')} #AUTORA`;
        break;

      default:
        userPrompt = `Optimize the following text for action "${action}" on video "${topic}":\n\n"${currentText}"`;
        fallbackText = `Copilot processed action "${action}" for scene #${sceneIndex}.`;
    }

    const aiResult = await executeAiLlmPrompt(systemInstruction, userPrompt);
    const responseText = aiResult || fallbackText;

    return NextResponse.json({
      success: true,
      action,
      result: responseText,
      provider: aiResult ? 'LIVE_AI_ENGINE' : 'CONTEXTUAL_SYNTHESIS',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Copilot assistant error' }, { status: 500 });
  }
}
