import { NARRATIVE_FRAMEWORKS, NarrativeFramework } from '../providers/personalCreatorScriptService';
import { resolveLengthBand, LengthBand } from './lengthBands';
import { validateNarrationModeration } from './moderationGuard';
import { EngineError } from './engineErrors';
import { GeneratedScene } from '../providers/aiProvider';
import { aiProvider } from '../providers/aiProvider';

export interface PlanGenerationParams {
  topic: string;
  niche: string;
  channelName: string;
  targetLengthMinutes: number;
  language?: string;
  visualStyle?: string;
  preferredFrameworkId?: string;
}

export interface GeneratedPlanResult {
  title: string;
  framework: NarrativeFramework;
  fullNarration: string;
  wordCount: number;
  scenes: GeneratedScene[];
}

/**
 * Single PLAN Stage Generator.
 * Unifies script writing, narrative framework rotation, word-budget enforcement,
 * moderation safety check, and initial scene tier breakdown into one atomic operation.
 */
export async function generateVideoPlan(params: PlanGenerationParams): Promise<GeneratedPlanResult> {
  const {
    topic,
    niche,
    channelName,
    targetLengthMinutes,
    language = 'en',
    visualStyle = 'Cinematic High-Contrast',
    preferredFrameworkId,
  } = params;

  // 1. Initial prompt moderation check
  const promptCheck = validateNarrationModeration(topic);
  if (!promptCheck.allowed) {
    throw new EngineError('PROMPT_MODERATION_FAILED', promptCheck.reason || 'Prompt rejected by content moderation policy');
  }

  // 2. Select narrative framework
  let framework = NARRATIVE_FRAMEWORKS[0];
  if (preferredFrameworkId) {
    const found = NARRATIVE_FRAMEWORKS.find((f) => f.id === preferredFrameworkId);
    if (found) framework = found;
  } else {
    // Deterministic rotation based on topic hash
    let hash = 0;
    for (let i = 0; i < topic.length; i++) {
      hash = (hash << 5) - hash + topic.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % NARRATIVE_FRAMEWORKS.length;
    framework = NARRATIVE_FRAMEWORKS[idx];
  }

  // 3. Resolve length band & word budget
  const bandConfig = resolveLengthBand(targetLengthMinutes);
  const maxWords = bandConfig.maxWords;

  // 4. Generate structured script through AI provider
  const scriptRes = await aiProvider.generateScript({
    channelName,
    niche,
    language,
    topic,
    targetLengthMinutes,
    visualStyle,
    introStyle: framework.name,
    outroCta: 'Subscribe and leave your thoughts below',
    contentRules: `Structure based on ${framework.name}. Keep total narration strictly under ${maxWords} words.`,
  });

  let fullNarration = scriptRes.fullNarration;
  let narrationWords = fullNarration.split(/\s+/).filter(Boolean);
  if (narrationWords.length > maxWords) {
    fullNarration = narrationWords.slice(0, maxWords).join(' ');
    narrationWords = fullNarration.split(/\s+/).filter(Boolean);
  }
  const wordCount = narrationWords.length;

  // 5. Post-generation narration moderation check
  const narrationCheck = validateNarrationModeration(fullNarration);
  if (!narrationCheck.allowed) {
    throw new EngineError('PROMPT_MODERATION_FAILED', narrationCheck.reason || 'Generated narration rejected by content moderation policy');
  }

  // 6. Generate scenes with visual prompts and assign initial visual tiers
  const rawScenes = await aiProvider.generateScenes({
    script: scriptRes.script,
    niche,
    language,
    targetLengthMinutes,
    visualStyle,
  });

  // Assign initial visual tiers (Soft rule: Hook = ai_clip, body = motion_still / graphic)
  const scenes: GeneratedScene[] = rawScenes.map((s, idx) => {
    let tier: 'ai_clip' | 'motion_still' | 'graphic' = 'motion_still';
    if (idx === 0) {
      tier = 'ai_clip'; // Hook scene gets AI video
    } else {
      const hasStat = /\b(\d+%|\$\d+|\d+x|\d+\s*(million|billion|thousand|k|m|b))\b/i.test(s.narration);
      if (hasStat) {
        tier = 'graphic'; // Scene with numbers gets graphic stat card
      } else {
        tier = 'motion_still';
      }
    }

    return {
      ...s,
      visualTier: tier,
    } as any;
  });

  return {
    title: scriptRes.script.title,
    framework,
    fullNarration,
    wordCount,
    scenes,
  };
}
