export interface VoicePreset {
  id: string;
  name: string;
  category: 'documentary' | 'storyteller' | 'energetic' | 'autoritative' | 'cloned';
  tier: 'free' | 'paid';
  provider: 'cloudflare-aura' | 'elevenlabs';
  providerVoiceId: string;
  previewAudioUrl: string;
  description: string;
}

export const TILLERCAST_VOICE_CATALOG: VoicePreset[] = [
  // === FREE DEMO TIER VOICES (Cloudflare Deepgram Aura-2) ===
  {
    id: 'cf-aura-orion',
    name: 'Orion (Standard Documentary)',
    category: 'documentary',
    tier: 'free',
    provider: 'cloudflare-aura',
    providerVoiceId: 'orion',
    previewAudioUrl: '/sample.mp3',
    description: 'Clear, steady narration for free preview renders',
  },
  {
    id: 'cf-aura-asteria',
    name: 'Asteria (Standard Storyteller)',
    category: 'storyteller',
    tier: 'free',
    provider: 'cloudflare-aura',
    providerVoiceId: 'asteria',
    previewAudioUrl: '/sample.mp3',
    description: 'Warm, engaging pacing for short-form stories',
  },
  {
    id: 'cf-aura-arcas',
    name: 'Arcas (Standard Business & Tech)',
    category: 'autoritative',
    tier: 'free',
    provider: 'cloudflare-aura',
    providerVoiceId: 'arcas',
    previewAudioUrl: '/sample.mp3',
    description: 'Crisp, fast-paced delivery for explainers',
  },

  // === PAID PRO TIER VOICES (100% ElevenLabs) ===
  {
    id: 'el-adam-viral',
    name: 'Adam — Viral Documentary Pro',
    category: 'documentary',
    tier: 'paid',
    provider: 'elevenlabs',
    providerVoiceId: 'pNInz6obpgDQGcFmaJgB',
    previewAudioUrl: '/sample.mp3',
    description: 'The #1 viral TikTok & YouTube Shorts deep narrator voice',
  },
  {
    id: 'el-brian-cinema',
    name: 'Brian — Dark Mystery & Crime',
    category: 'documentary',
    tier: 'paid',
    provider: 'elevenlabs',
    providerVoiceId: 'nPczCjzI2devNBz1zQrb',
    previewAudioUrl: '/sample.mp3',
    description: 'Deep, cinematic movie-trailer resonance with natural breath pauses',
  },
  {
    id: 'el-chris-hormozi',
    name: 'Chris — High-Retention Creator',
    category: 'energetic',
    tier: 'paid',
    provider: 'elevenlabs',
    providerVoiceId: 'iP95p4xoKVk53GoZ742B',
    previewAudioUrl: '/sample.mp3',
    description: 'Punchy, high-conviction founder & finance storytelling',
  },
  {
    id: 'el-rachel-story',
    name: 'Rachel — Emotional Storyteller',
    category: 'storyteller',
    tier: 'paid',
    provider: 'elevenlabs',
    providerVoiceId: '21m00Tcm4TlvDq8ikWAM',
    previewAudioUrl: '/sample.mp3',
    description: 'Hyper-realistic emotional inflection for Reddit & true stories',
  },
];

export const AUTORA_VOICE_CATALOG = TILLERCAST_VOICE_CATALOG;

