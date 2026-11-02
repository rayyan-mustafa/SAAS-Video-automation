import { AgentConfig, InterviewQuestion } from './types';

export const QUESTION_BANK: InterviewQuestion[] = [
  {
    id: 'format_duration',
    step: 1,
    question: 'What video format and duration are you looking to create?',
    helperText: 'Choose the optimal length for your target platform.',
    field: 'format',
    options: [
      {
        label: 'Short (<60s) — Vertical 9:16',
        value: 'short',
        description: 'Optimized for YouTube Shorts, TikTok & IG Reels',
        badge: 'Viral Pick',
      },
      {
        label: 'Standard (60s–120s) — 9:16 or 16:9',
        value: 'standard',
        description: 'Great for deeper stories and product explainers',
      },
      {
        label: 'Extended (120s–180s) — Widescreen 16:9',
        value: 'extended',
        description: 'Mini-documentaries and YouTube longform',
      },
      {
        label: '⚡ Decide for me',
        value: 'auto_format',
        description: 'Agent picks best format based on your topic',
        isDecideForMe: true,
      },
    ],
  },
  {
    id: 'vibe_mood',
    step: 2,
    question: 'What vibe or storytelling tone fits this video best?',
    helperText: 'This shapes our script pacing, sound design, and visual styling.',
    field: 'vibe',
    options: [
      {
        label: '🔥 Dramatic & Mysterious',
        value: 'dramatic',
        description: 'Unsettling hook, intense music, high suspense',
      },
      {
        label: '⚡ Fast & Energetic',
        value: 'energetic',
        description: 'Rapid cuts, punchy cadence, high retention',
      },
      {
        label: '🎓 Educational & Crisp',
        value: 'educational',
        description: 'Clear breakdown, authority tone, data-backed',
      },
      {
        label: '❤️ Emotional & Inspiring',
        value: 'emotional',
        description: 'Story-driven, uplifting climax, deep connection',
      },
      {
        label: '⚡ Decide for me',
        value: 'auto_vibe',
        description: 'Agent auto-detects optimal vibe',
        isDecideForMe: true,
      },
    ],
  },
  {
    id: 'target_audience',
    step: 3,
    question: 'Who is the primary audience for this video?',
    helperText: 'Helps us tailor vocabulary, references, and pacing.',
    field: 'audience',
    options: [
      {
        label: '📱 Gen-Z & TikTok Viewers',
        value: 'gen_z',
        description: 'Fast pacing, punchy hooks, visual variety',
      },
      {
        label: '💼 Founders & Professionals',
        value: 'professionals',
        description: 'Sharp insights, high signal-to-noise ratio',
      },
      {
        label: '🌐 General Curious Public',
        value: 'general',
        description: 'Broad appeal, relatable analogies, viral potential',
      },
      {
        label: '⚡ Decide for me',
        value: 'auto_audience',
        description: 'Agent selects best audience demographic',
        isDecideForMe: true,
      },
    ],
  },
  {
    id: 'voice_style',
    step: 4,
    question: 'Choose your narrator voice & regional accent:',
    helperText: 'Natural neural voices included on all plans. ElevenLabs for Creator+.',
    field: 'voiceId',
    options: [
      {
        label: '🇺🇸 American Natural (Christopher Neural)',
        value: 'en-US-ChristopherNeural',
        description: 'Crisp, confident documentary narrator (Free)',
      },
      {
        label: '🇬🇧 British Studio (Ryan Neural)',
        value: 'en-GB-RyanNeural',
        description: 'Deep, authoritative BBC-style narration (Free)',
      },
      {
        label: '🇦🇺 Australian Natural (William Neural)',
        value: 'en-AU-WilliamNeural',
        description: 'Engaging, friendly conversational tone (Free)',
      },
      {
        label: '🇮🇳 Indian English (Prabhat Neural)',
        value: 'en-IN-PrabhatNeural',
        description: 'Clear, modern professional English (Free)',
      },
      {
        label: '👑 ElevenLabs Adam (Deep Cinematic)',
        value: 'elevenlabs_adam',
        description: 'The #1 viral shorts narrator voice (Creator/Pro)',
        badge: 'Pro Voice',
      },
      {
        label: '⚡ Decide for me',
        value: 'auto_voice',
        description: 'Agent matches voice to topic vibe',
        isDecideForMe: true,
      },
    ],
  },
  {
    id: 'visual_style',
    step: 5,
    question: 'Select your visual generation style:',
    helperText: 'Different visual tiers consume different credits (1 to 15 cr/scene).',
    field: 'visualTier',
    options: [
      {
        label: '🎬 Curated Stock B-Roll (1 credit/scene)',
        value: 'stock',
        description: 'Curated 1080p stock footage from Pexels & Pixabay',
        badge: 'Lowest Cost',
      },
      {
        label: '✨ Flash Motion (1 credit/scene)',
        value: 'flash_motion',
        description: 'FLUX.1 Schnell stills with dynamic Ken Burns zooms',
      },
      {
        label: '👑 Cinema AI Lite (5 credits/scene)',
        value: 'cinema_ai_lite',
        description: 'Google Veo 3.1 Lite generative AI video clips (720p)',
        badge: 'Creator Tier',
      },
      {
        label: '👑 Cinema AI Fast (8 credits/scene)',
        value: 'cinema_ai_fast',
        description: 'Google Veo 3.1 Fast generative AI video (1080p)',
        badge: 'Pro Tier',
      },
      {
        label: '⚡ Decide for me',
        value: 'auto_visual',
        description: 'Agent mixes Stock & Flash Motion for best value',
        isDecideForMe: true,
      },
    ],
  },
];

/**
 * Extracts parameters from raw user prompt using keyword heuristics.
 */
export function extractConfigFromPrompt(prompt: string): Partial<AgentConfig> {
  const lower = prompt.toLowerCase();
  const config: Partial<AgentConfig> = {
    topic: prompt.trim(),
  };

  // Format & Duration detection
  if (lower.includes('9:16') || lower.includes('short') || lower.includes('tiktok') || lower.includes('reels') || lower.includes('vertical')) {
    config.format = 'short';
    config.aspectRatio = '9:16';
    config.durationSec = 45;
  } else if (lower.includes('16:9') || lower.includes('widescreen') || lower.includes('landscape') || lower.includes('youtube long') || lower.includes('3 min') || lower.includes('180s')) {
    config.format = 'extended';
    config.aspectRatio = '16:9';
    config.durationSec = 150;
  } else if (lower.includes('60s') || lower.includes('90s') || lower.includes('2 min') || lower.includes('standard')) {
    config.format = 'standard';
    config.aspectRatio = '9:16';
    config.durationSec = 90;
  }

  // Exact second duration hints (e.g. "45-second", "30s", "60 sec")
  const secMatch = lower.match(/(\d{1,3})\s*(?:s|sec|second)/);
  if (secMatch) {
    const s = parseInt(secMatch[1], 10);
    if (s > 0 && s <= 180) {
      config.durationSec = s;
      if (s <= 60) config.format = 'short';
      else if (s <= 120) config.format = 'standard';
      else config.format = 'extended';
    }
  }

  // Vibe detection
  if (lower.includes('dramatic') || lower.includes('mystery') || lower.includes('dark') || lower.includes('creepy') || lower.includes('shocking')) {
    config.vibe = 'dramatic';
  } else if (lower.includes('energy') || lower.includes('energetic') || lower.includes('fast') || lower.includes('viral') || lower.includes('hype')) {
    config.vibe = 'energetic';
  } else if (lower.includes('education') || lower.includes('explain') || lower.includes('how to') || lower.includes('tutorial') || lower.includes('science') || lower.includes('history')) {
    config.vibe = 'educational';
  } else if (lower.includes('emotion') || lower.includes('inspire') || lower.includes('heart') || lower.includes('sad') || lower.includes('story')) {
    config.vibe = 'emotional';
  }

  // Audience detection
  if (lower.includes('gen-z') || lower.includes('gen z') || lower.includes('teen') || lower.includes('tiktok')) {
    config.audience = 'gen_z';
  } else if (lower.includes('business') || lower.includes('founder') || lower.includes('professional') || lower.includes('b2b') || lower.includes('executive')) {
    config.audience = 'professionals';
  } else if (lower.includes('student') || lower.includes('kid') || lower.includes('beginner')) {
    config.audience = 'students';
  }

  // Visual tier detection
  if (lower.includes('veo') || lower.includes('cinema ai') || lower.includes('ai video') || lower.includes('genai')) {
    config.visualTier = lower.includes('fast') || lower.includes('1080p') ? 'cinema_ai_fast' : 'cinema_ai_lite';
  } else if (lower.includes('still') || lower.includes('flux') || lower.includes('ken burns')) {
    config.visualTier = 'flash_motion';
  } else if (lower.includes('stock') || lower.includes('b-roll') || lower.includes('pexels')) {
    config.visualTier = 'stock';
  }

  // Voice detection
  if (lower.includes('british') || lower.includes('uk')) {
    config.voiceId = 'en-GB-RyanNeural';
    config.voiceTier = 'google_neural2';
    config.voiceAccent = 'en-GB';
  } else if (lower.includes('australian') || lower.includes('aussie')) {
    config.voiceId = 'en-AU-WilliamNeural';
    config.voiceTier = 'google_neural2';
    config.voiceAccent = 'en-AU';
  } else if (lower.includes('indian')) {
    config.voiceId = 'en-IN-PrabhatNeural';
    config.voiceTier = 'google_neural2';
    config.voiceAccent = 'en-IN';
  } else if (lower.includes('elevenlabs') || lower.includes('adam')) {
    config.voiceId = 'elevenlabs_adam';
    config.voiceTier = 'elevenlabs';
    config.voiceAccent = 'en-US';
  }

  return config;
}

/**
 * Returns the next adaptive question based on what's already known.
 */
export function getNextInterviewQuestion(config: Partial<AgentConfig>): InterviewQuestion | null {
  for (const q of QUESTION_BANK) {
    const val = config[q.field];
    if (val === undefined || val === null || val === '') {
      return q;
    }
  }
  return null;
}

/**
 * Applies sensible defaults for any unselected parameters when user finishes or clicks "Decide for me".
 */
export function finalizeConfigDefaults(config: Partial<AgentConfig>): AgentConfig {
  return {
    topic: config.topic || 'Untitled Video Project',
    format: config.format || 'short',
    aspectRatio: config.aspectRatio || (config.format === 'extended' ? '16:9' : '9:16'),
    durationSec: config.durationSec || (config.format === 'short' ? 45 : config.format === 'standard' ? 90 : 150),
    vibe: config.vibe || 'dramatic',
    audience: config.audience || 'general',
    voiceId: config.voiceId || 'en-US-ChristopherNeural',
    voiceTier: config.voiceTier || 'google_neural2',
    voiceAccent: config.voiceAccent || 'en-US',
    visualTier: config.visualTier || 'stock',
  };
}
