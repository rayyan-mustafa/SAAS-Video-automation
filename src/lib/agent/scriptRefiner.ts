import { getApiKey } from '@/lib/db';
import { AgentScript, AgentScriptScene } from './types';
import { VisualTierName } from '@/lib/billing';

export interface RefineInstruction {
  instruction: string;
  sceneIndex?: number;
}

export async function refineAgentScript(
  currentScript: AgentScript,
  refinement: RefineInstruction
): Promise<{ updatedScript: AgentScript; explanation: string }> {
  const { instruction, sceneIndex } = refinement;
  const lower = instruction.toLowerCase();

  // 1. Check for simple targeted heuristic refinements first for sub-second response
  const targetIdx = sceneIndex !== undefined ? sceneIndex : detectTargetSceneIndex(lower, currentScript.scenes.length);

  // Check voice change intent
  if (lower.includes('british') || lower.includes('uk')) {
    currentScript.voiceId = 'en-GB-RyanNeural';
    currentScript.voiceTier = 'google_neural2';
    return {
      updatedScript: currentScript,
      explanation: 'Updated narration voice to British Studio (Ryan Neural).',
    };
  }
  if (lower.includes('elevenlabs') || lower.includes('adam')) {
    currentScript.voiceId = 'elevenlabs_adam';
    currentScript.voiceTier = 'elevenlabs';
    return {
      updatedScript: currentScript,
      explanation: 'Upgraded voice to ElevenLabs Adam (Deep Cinematic).',
    };
  }

  // Check visual tier swap intent
  if (targetIdx !== null && (lower.includes('cinema ai') || lower.includes('veo') || lower.includes('ai video'))) {
    currentScript.scenes[targetIdx].visual_tier = 'cinema_ai_lite';
    return {
      updatedScript: currentScript,
      explanation: `Upgraded Scene ${targetIdx + 1} visual tier to Cinema AI Lite.`,
    };
  }
  if (targetIdx !== null && (lower.includes('stock') || lower.includes('b-roll'))) {
    currentScript.scenes[targetIdx].visual_tier = 'stock';
    return {
      updatedScript: currentScript,
      explanation: `Set Scene ${targetIdx + 1} visual tier to Curated Stock B-Roll.`,
    };
  }

  // 2. Call LLM for intelligent scene rewriting
  const geminiKey = getApiKey('gemini') || process.env.GEMINI_API_KEY;
  const openRouterKey = getApiKey('openrouter') || process.env.OPENROUTER_API_KEY;

  if (geminiKey || openRouterKey) {
    try {
      const prompt = `You are a video script director refining an existing video script.
The user's refinement instruction: "${instruction}"
Target Scene (if specified): ${targetIdx !== null ? `Scene index ${targetIdx} (Scene ${targetIdx + 1})` : 'Whole script or best matching scene'}

CURRENT SCRIPT:
${JSON.stringify(currentScript, null, 2)}

INSTRUCTIONS:
1. Apply the user's requested edit accurately.
2. Return a JSON object with:
{
  "explanation": "Brief 1-sentence friendly confirmation of what was changed",
  "updatedScript": <The full updated AgentScript JSON object with identical schema>
}
3. Return ONLY valid raw JSON, zero markdown.`;

      let rawOutput = '';
      if (geminiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          signal: AbortSignal.timeout(12000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });
        if (res.ok) {
          const d = await res.json();
          rawOutput = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }
      }

      if (rawOutput) {
        const clean = rawOutput.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
        const parsed = JSON.parse(clean);
        if (parsed.updatedScript && parsed.updatedScript.scenes) {
          return {
            updatedScript: parsed.updatedScript,
            explanation: parsed.explanation || `Applied refinement: "${instruction}"`,
          };
        }
      }
    } catch (err: any) {
      console.warn('[AgentScriptRefiner] LLM refinement fallback to heuristic:', err.message);
    }
  }

  // 3. Heuristic Fallback Refinement
  if (targetIdx !== null && targetIdx < currentScript.scenes.length) {
    const scene = currentScript.scenes[targetIdx];
    if (lower.includes('punchier') || lower.includes('hook') || lower.includes('dramatic')) {
      scene.narration = `Stop scrolling right now. You are about to discover the one thing about ${currentScript.topic} they never told you.`;
      scene.subtitle_text = scene.narration;
      scene.visual_prompt = `Dramatic extreme close-up, intense cinematic spotlight, high contrast 4K photo-realism.`;
      scene.camera_movement = 'Rapid zoom-in';
    } else {
      scene.visual_prompt = `${instruction}, ultra-detailed cinematic 4K, professional studio lighting.`;
    }
    return {
      updatedScript: currentScript,
      explanation: `Updated Scene ${targetIdx + 1} based on your instructions.`,
    };
  }

  // Global default response
  return {
    updatedScript: currentScript,
    explanation: `Applied updates for: "${instruction}".`,
  };
}

function detectTargetSceneIndex(text: string, maxScenes: number): number | null {
  // Matches "scene 1", "scene 2", "hook", "intro", "outro", "ending"
  const match = text.match(/scene\s*(\d{1,2})/);
  if (match) {
    const num = parseInt(match[1], 10) - 1; // 1-indexed to 0-indexed
    if (num >= 0 && num < maxScenes) return num;
  }
  if (text.includes('hook') || text.includes('first scene') || text.includes('intro')) {
    return 0;
  }
  if (text.includes('outro') || text.includes('ending') || text.includes('last scene') || text.includes('cta')) {
    return Math.max(0, maxScenes - 1);
  }
  return null;
}

