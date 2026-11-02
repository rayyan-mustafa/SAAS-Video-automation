import { getApiKey } from '@/lib/db';
import { isCloudflareConfigured, runCloudflareJson } from '@/lib/providers/cloudflareAiClient';
import { calculateVideoCreditCost } from '@/lib/billing';
import { AgentConfig, AgentScript, AgentScriptScene } from './types';

export async function generateAgentScript(config: AgentConfig): Promise<AgentScript> {
  const {
    topic,
    format,
    aspectRatio,
    durationSec,
    vibe,
    audience,
    voiceId,
    voiceTier,
    visualTier,
  } = config;

  // Calculate target scene count based on duration (average 5-7 seconds per scene)
  const targetSceneCount = Math.max(4, Math.min(15, Math.round(durationSec / 6.5)));
  const targetWordCount = Math.round(durationSec * 2.2); // ~130 words per minute of narration

  const systemPrompt = `You are Tillercast's premier viral video scriptwriter and director.
Generate a high-retention, scene-by-scene video script based on the creator's requirements.

STRICT JSON OUTPUT FORMAT:
{
  "title": "Punchy Catchy Title",
  "scenes": [
    {
      "sceneIndex": 0,
      "heading": "The 3-Second Hook",
      "narration": "Spoken voiceover words for this exact scene.",
      "visual_prompt": "Cinematic visual description of what appears on screen, camera angle, lighting, subject.",
      "visual_tier": "${visualTier}",
      "estimated_duration_sec": 6,
      "subtitle_text": "Spoken voiceover words for this exact scene.",
      "camera_movement": "Slow cinematic push-in on subject"
    }
  ]
}

STRICT PRODUCTION RULES:
1. Generate EXACTLY ${targetSceneCount} scenes.
2. Scene 0 MUST be a high-stakes, scroll-stopping pattern interrupt hook.
3. Total word count across all scene narrations must be approximately ${targetWordCount} words (±15%).
4. Pacing and tone must match vibe: "${vibe}".
5. Target audience is: "${audience}".
6. Visual prompts must be highly specific, cinematic, 4K description suited for ${aspectRatio} aspect ratio.
7. Return ONLY valid raw JSON without markdown code fences or conversational text.`;

  const userPrompt = `Topic: "${topic}"
Duration: ${durationSec} seconds (${format})
Aspect Ratio: ${aspectRatio}
Vibe: ${vibe}
Audience: ${audience}
Visual Style: ${visualTier}
Voice: ${voiceId} (${voiceTier})`;

  const openRouterKey = getApiKey('openrouter') || process.env.OPENROUTER_API_KEY;
  const geminiKey = getApiKey('gemini') || process.env.GEMINI_API_KEY;

  // 1. Try Cloudflare Workers AI
  if (isCloudflareConfigured()) {
    try {
      const cfResult = await runCloudflareJson<any>(
        '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
          max_tokens: 4000,
        },
        { timeoutMs: 30_000 }
      );
      const text = cfResult?.response || cfResult?.choices?.[0]?.message?.content || cfResult;
      const parsed = typeof text === 'object' ? text : parseCleanJson(text);
      if (parsed?.scenes?.length) {
        return buildFinalScript(parsed, config);
      }
    } catch (e: any) {
      console.warn('[AgentScriptGenerator] Cloudflare AI failed, trying Gemini:', e.message);
    }
  }

  // 2. Try Gemini 2.0 / 1.5 Flash
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
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = parseCleanJson(text);
            if (parsed?.scenes?.length) {
              return buildFinalScript(parsed, config);
            }
          }
        }
      } catch (e: any) {
        console.warn(`[AgentScriptGenerator] Gemini (${model}) failed:`, e.message);
      }
    }
  }

  // 3. Try OpenRouter DeepSeek
  if (openRouterKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = parseCleanJson(content);
          if (parsed?.scenes?.length) {
            return buildFinalScript(parsed, config);
          }
        }
      }
    } catch (e: any) {
      console.warn('[AgentScriptGenerator] OpenRouter failed:', e.message);
    }
  }

  // 4. Deterministic High-Quality Algorithmic Generator Fallback
  return buildAlgorithmicScript(config, targetSceneCount);
}

function parseCleanJson(raw: string): any {
  try {
    const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
    return JSON.parse(clean);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

function buildFinalScript(parsed: any, config: AgentConfig): AgentScript {
  const scenes: AgentScriptScene[] = (parsed.scenes || []).map((s: any, idx: number) => ({
    sceneIndex: idx,
    heading: s.heading || `Scene ${idx + 1}`,
    narration: (s.narration || '').trim(),
    visual_prompt: (s.visual_prompt || s.visualPrompt || `Cinematic shot related to ${config.topic}`).trim(),
    visual_tier: (s.visual_tier || config.visualTier) as any,
    estimated_duration_sec: Math.max(3, Math.min(15, Number(s.estimated_duration_sec) || 6)),
    subtitle_text: (s.subtitle_text || s.narration || '').trim(),
    camera_movement: s.camera_movement || 'Dynamic push-in',
  }));

  const totalWords = scenes.reduce((acc, s) => acc + s.narration.split(/\s+/).filter(Boolean).length, 0);
  const totalSec = scenes.reduce((acc, s) => acc + s.estimated_duration_sec, 0);

  return {
    title: parsed.title || config.topic,
    topic: config.topic,
    aspectRatio: config.aspectRatio,
    targetDurationSec: config.durationSec,
    totalEstimatedSec: totalSec,
    vibe: config.vibe,
    audience: config.audience,
    voiceId: config.voiceId,
    voiceTier: config.voiceTier,
    visualTier: config.visualTier,
    scenes,
    wordCount: totalWords,
    sceneCount: scenes.length,
  };
}

function buildAlgorithmicScript(config: AgentConfig, sceneCount: number): AgentScript {
  const { topic, vibe, visualTier } = config;

  const headings = [
    'The Scroll-Stopping Hook',
    'The Unseen Truth',
    'The Turning Point',
    'The Breakthrough Evidence',
    'The Actionable Secret',
    'The Viral Takeaway',
    'The Closing Call to Action',
  ];

  const narrations = [
    `What if everything you were told about ${topic} was completely backwards?`,
    `Behind closed doors, the top 1% have been exploiting a hidden leverage point that almost nobody notices.`,
    `When you look at the raw data, the pattern becomes undeniable.`,
    `This single variable changes the entire equation and flips conventional wisdom on its head.`,
    `Here is the exact framework you can apply starting today to capitalize on this insight.`,
    `Once you see this in motion, you can never look at ${topic} the same way again.`,
    `Drop your thoughts in the comments, and follow for more insights like this.`,
  ];

  const cameraMoves = [
    'Fast cinematic zoom-in',
    'Slow dramatic tracking shot',
    'Rapid dynamic whip-pan',
    'High-angle orbital pan',
    'Macro focus pull',
    'Smooth low-angle push',
    'Steady centered hero shot',
  ];

  const count = Math.min(sceneCount, narrations.length);
  const scenes: AgentScriptScene[] = [];
  let totalWords = 0;
  let totalSec = 0;

  for (let i = 0; i < count; i++) {
    const narration = narrations[i];
    const duration = Math.round(narration.split(' ').length / 2.3);
    totalWords += narration.split(' ').length;
    totalSec += duration;

    scenes.push({
      sceneIndex: i,
      heading: headings[i] || `Scene ${i + 1}`,
      narration,
      visual_prompt: `High-definition 4K cinematic visualization of ${topic}, dramatic atmospheric lighting, ${vibe} mood, highly detailed photo-realism.`,
      visual_tier: visualTier,
      estimated_duration_sec: Math.max(4, duration),
      subtitle_text: narration,
      camera_movement: cameraMoves[i % cameraMoves.length],
    });
  }

  return {
    title: topic.length > 50 ? topic.slice(0, 47) + '...' : topic,
    topic,
    aspectRatio: config.aspectRatio,
    targetDurationSec: config.durationSec,
    totalEstimatedSec: totalSec,
    vibe: config.vibe,
    audience: config.audience,
    voiceId: config.voiceId,
    voiceTier: config.voiceTier,
    visualTier: config.visualTier,
    scenes,
    wordCount: totalWords,
    sceneCount: scenes.length,
  };
}

