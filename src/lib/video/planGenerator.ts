import { NARRATIVE_FRAMEWORKS, NarrativeFramework } from '../providers/personalCreatorScriptService';
import { resolveLengthBand, LengthBand } from './lengthBands';
import { validateNarrationModeration, validateNarrationModerationWithLlamaGuard } from './moderationGuard';
import { originalityRadar } from './originalityRadar';
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
  userPlan?: string;
  userId?: string;
}

export interface GeneratedPlanResult {
  title: string;
  framework: NarrativeFramework;
  fullNarration: string;
  wordCount: number;
  scenes: GeneratedScene[];
}

/**
 * Single PLAN Stage Generator (3-Stage Viral Pipeline).
 * Stage 1: The Viral Narrative & Hook Writer (Prompt-engineered short-form script with tier routing).
 * Stage 2: The Visual Beat Splitter & Character Consistency Director (3-second visual pacing & alternating camera motion).
 * Stage 3: Pre-Flight Safety & Originality Check (Llama Guard 3-8B & BGE-M3 originality radar).
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
    userPlan = 'free',
    userId,
  } = params;

  // ── STAGE 3A: INITIAL PROMPT MODERATION (Llama Guard 3-8B & Heuristics) ──
  const promptCheck = await validateNarrationModerationWithLlamaGuard(topic);
  if (!promptCheck.allowed) {
    throw new EngineError('PROMPT_MODERATION_FAILED', promptCheck.reason || 'Prompt rejected by content moderation policy');
  }

  // Select narrative framework
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

  // Resolve length band & word budget
  const bandConfig = resolveLengthBand(targetLengthMinutes);
  const maxWords = bandConfig.maxWords;

  // ── STAGE 1: THE VIRAL NARRATIVE & HOOK WRITER ────────────────────────────
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
    userPlan,
  });

  let fullNarration = scriptRes.fullNarration;
  let narrationWords = fullNarration.split(/\s+/).filter(Boolean);
  if (narrationWords.length > maxWords) {
    fullNarration = narrationWords.slice(0, maxWords).join(' ');
    narrationWords = fullNarration.split(/\s+/).filter(Boolean);
  }
  const wordCount = narrationWords.length;

  // ── STAGE 3B: POST-GENERATION SAFETY & ORIGINALITY CHECK ─────────────────
  const narrationCheck = await validateNarrationModerationWithLlamaGuard(fullNarration);
  if (!narrationCheck.allowed) {
    throw new EngineError('PROMPT_MODERATION_FAILED', narrationCheck.reason || 'Generated narration rejected by content moderation policy');
  }

  // Originality radar verification against workspace publications
  if (userId) {
    try {
      const origCheck = originalityRadar.checkOriginality({
        userId,
        proposedTitle: scriptRes.script.title,
        proposedHook: scriptRes.script.hook,
        proposedFramework: framework.id,
      });
      if (!origCheck.passed) {
        console.warn(`[PlanGenerator] Originality Radar Notice: ${origCheck.alert}`);
      }
    } catch {
      // In-flight or test environment without published videos table
    }
  }

  // ── STAGE 2: THE VISUAL BEAT SPLITTER & CHARACTER CONSISTENCY DIRECTOR ───
  const rawScenes = await aiProvider.generateScenes({
    script: scriptRes.script,
    niche,
    language,
    targetLengthMinutes,
    visualStyle,
    userPlan,
  });

  const isShorts = targetLengthMinutes <= 1.5;

  // Enforce 3-Second Visual Beat Rule & Visual Tiers
  const scenes: GeneratedScene[] = rawScenes.map((s, idx) => {
    let tier: 'ai_clip' | 'motion_still' | 'graphic' | 'stock_footage' = 'motion_still';
    if (idx === 0) {
      tier = userPlan === 'free' ? 'motion_still' : 'ai_clip'; // Hook hero scene gets AI video on paid plans, motion still for free demo
    } else {
      const hasStat = /\b(\d+%|\$\d+|\d+x|\d+\s*(million|billion|thousand|k|m|b))\b/i.test(s.narration);
      if (hasStat) {
        tier = 'graphic'; // Scene with stats gets glassmorphic card
      } else {
        tier = 'motion_still';
      }
    }

    // 3-Second Pacing Guard for Short-Form Videos:
    // Scene 1 & 2: 2.0 to 3.0 seconds (6-9 spoken words)
    // Scenes 3+: 3.0 to 4.5 seconds (never exceed 5.0s)
    let durationSec = s.estimatedDurationSec;
    if (isShorts) {
      if (idx < 2) {
        durationSec = Math.max(2.0, Math.min(3.0, durationSec));
      } else {
        durationSec = Math.max(3.0, Math.min(4.5, durationSec));
      }
    }

    return {
      ...s,
      estimatedDurationSec: durationSec,
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
