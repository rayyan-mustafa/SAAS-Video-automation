import { getDb, DEFAULT_USER_ID } from '../db';
import { encryptToken, decryptToken } from '../security/encryption';

export type IntegrationCategory =
  | 'ai_text'
  | 'ai_video'
  | 'stock_video'
  | 'voice'
  | 'storage'
  | 'publishing'
  | 'analytics'
  | 'email';

export interface IntegrationDefinition {
  provider: string;
  category: IntegrationCategory;
  displayName: string;
  description: string;
  defaultSettings?: Record<string, any>;
  supportedModels?: string[];
  credentialFields: Array<{
    key: string;
    label: string;
    placeholder?: string;
    type?: 'password' | 'text';
    required?: boolean;
    envFallbackKey?: string;
  }>;
}

export const KNOWN_INTEGRATIONS: Record<string, IntegrationDefinition> = {
  // AI Scriptwriting & NLP
  gemini: {
    provider: 'gemini',
    category: 'ai_text',
    displayName: 'Google Gemini AI',
    description: 'High-speed structured narration, research, and multimodal prompt analysis',
    defaultSettings: {
      defaultModel: 'gemini-2.0-flash',
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
    supportedModels: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.5-flash'],
    credentialFields: [
      { key: 'apiKey', label: 'Gemini API Key', placeholder: 'AIzaSy...', type: 'password', required: true, envFallbackKey: 'GEMINI_API_KEY' },
    ],
  },
  openrouter: {
    provider: 'openrouter',
    category: 'ai_text',
    displayName: 'OpenRouter AI Hub',
    description: 'Unified gateway for DeepSeek Chat/Coder, Anthropic Claude, and Llama 3 models',
    defaultSettings: {
      defaultModel: 'deepseek/deepseek-chat',
      fallbackModel: 'google/gemini-2.0-flash-001',
      temperature: 0.7,
    },
    supportedModels: ['deepseek/deepseek-chat', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.3-70b-instruct', 'google/gemini-2.0-flash-001'],
    credentialFields: [
      { key: 'apiKey', label: 'OpenRouter API Key', placeholder: 'sk-or-v1-...', type: 'password', required: true, envFallbackKey: 'OPENROUTER_API_KEY' },
    ],
  },
  openai: {
    provider: 'openai',
    category: 'ai_text',
    displayName: 'OpenAI (GPT & Sora)',
    description: 'GPT-4o text generation, vision analysis, and Sora video synthesis',
    defaultSettings: {
      defaultModel: 'gpt-4o',
      temperature: 0.7,
    },
    supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    credentialFields: [
      { key: 'apiKey', label: 'OpenAI Secret Key', placeholder: 'sk-proj-...', type: 'password', required: true, envFallbackKey: 'OPENAI_API_KEY' },
      { key: 'organizationId', label: 'Organization ID (Optional)', placeholder: 'org-...', type: 'text', required: false, envFallbackKey: 'OPENAI_ORG_ID' },
    ],
  },

  cloudflare_text: {
    provider: 'cloudflare_text',
    category: 'ai_text',
    displayName: 'Cloudflare Workers AI (LLMs)',
    description: 'Serverless Meta Llama 3.3 70B, Google Gemma 4 26B, Llama 4 Scout, and DeepSeek R1',
    defaultSettings: {
      defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
    supportedModels: [
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/google/gemma-4-26b-a4b-it',
      '@cf/meta/llama-4-scout-17b-16e-instruct',
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      '@cf/ibm/granite-4.0-h-micro',
    ],
    credentialFields: [
      { key: 'accountId', label: 'Cloudflare Account ID', placeholder: 'aac50d67f3ec9133524158d1379bce23', type: 'text', required: true, envFallbackKey: 'CLOUDFLARE_ACCOUNT_ID' },
      { key: 'apiToken', label: 'Cloudflare API Token', placeholder: 'cfat_...', type: 'password', required: true, envFallbackKey: 'CLOUDFLARE_API_TOKEN' },
      { key: 'gatewayId', label: 'AI Gateway ID (Optional)', placeholder: 'autora-gateway', type: 'text', required: false, envFallbackKey: 'CLOUDFLARE_AI_GATEWAY_ID' },
    ],
  },

  // AI Video Diffusion
  fal: {
    provider: 'fal',
    category: 'ai_video',
    displayName: 'Fal.ai Diffusion Studio',
    description: 'Ultra-fast Wan 2.1, Kling Video, Luma Dream Machine, and Fast-SDXL diffusion',
    defaultSettings: {
      defaultModel: 'fal-ai/wan/v2.1/text-to-video',
      aspectRatio: '9:16',
      resolution: '720p',
    },
    supportedModels: [
      'fal-ai/wan/v2.1/text-to-video',
      'fal-ai/kling-video/v1/standard/text-to-video',
      'fal-ai/luma-dream-machine',
      'fal-ai/fast-sdxl',
    ],
    credentialFields: [
      { key: 'apiKey', label: 'Fal.ai API Key', placeholder: 'fal_...', type: 'password', required: true, envFallbackKey: 'FAL_KEY' },
    ],
  },
  cloudflare: {
    provider: 'cloudflare',
    category: 'ai_video',
    displayName: 'Cloudflare Workers AI (Visual & Video)',
    description: 'FLUX.1 [schnell] keyframes with 60fps Ken Burns pan/zoom, SDXL Lightning, and MiniMax video',
    defaultSettings: {
      defaultModel: '@cf/black-forest-labs/flux-1-schnell',
      fallbackModel: '@cf/bytedance/stable-diffusion-xl-lightning',
      imageModel: '@cf/black-forest-labs/flux-1-schnell',
    },
    supportedModels: [
      '@cf/black-forest-labs/flux-1-schnell',
      '@cf/bytedance/stable-diffusion-xl-lightning',
      '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      '@cf/minimax/video-01',
    ],
    credentialFields: [
      { key: 'accountId', label: 'Cloudflare Account ID', placeholder: 'aac50d67f3ec9133524158d1379bce23', type: 'text', required: true, envFallbackKey: 'CLOUDFLARE_ACCOUNT_ID' },
      { key: 'apiToken', label: 'Cloudflare API Token', placeholder: 'cfat_...', type: 'password', required: true, envFallbackKey: 'CLOUDFLARE_API_TOKEN' },
      { key: 'gatewayId', label: 'AI Gateway ID (Optional)', placeholder: 'autora-gateway', type: 'text', required: false, envFallbackKey: 'CLOUDFLARE_AI_GATEWAY_ID' },
    ],
  },
  veo: {
    provider: 'veo',
    category: 'ai_video',
    displayName: 'Google Veo Video AI',
    description: 'Google DeepMind cinematic video generation via Generative Language API',
    defaultSettings: {
      defaultModel: 'veo-3.1-generate-preview',
      resolution: '720p',
      aspectRatio: '9:16',
      personGeneration: 'allow_all',
    },
    supportedModels: ['veo-3.1-generate-preview', 'veo-2.0-generate-preview'],
    credentialFields: [
      { key: 'apiKey', label: 'Google / Veo API Key', placeholder: 'AIzaSy...', type: 'password', required: true, envFallbackKey: 'GEMINI_API_KEY' },
    ],
  },
  sora: {
    provider: 'sora',
    category: 'ai_video',
    displayName: 'OpenAI Sora Video AI (Deprecated / Preview)',
    description: 'Experimental text-to-video slot. Note: Public OpenAI Sora API is in restricted preview; falls back to Google Veo / Wan 2.1 / motion stills',
    defaultSettings: {
      defaultModel: 'sora-1.0',
      resolution: '1080p',
      aspectRatio: '16:9',
    },
    supportedModels: ['sora-1.0', 'sora-preview'],
    credentialFields: [
      { key: 'apiKey', label: 'OpenAI Sora Key', placeholder: 'sk-proj-...', type: 'password', required: true, envFallbackKey: 'OPENAI_API_KEY' },
    ],
  },
  runway: {
    provider: 'runway',
    category: 'ai_video',
    displayName: 'Runway Developer API (Gen-4.5 / Gen-4)',
    description: 'Ultra-realistic cinematic text-to-video and image-to-video generation',
    defaultSettings: {
      defaultModel: 'gen4_turbo',
      duration: 5,
      ratio: '9:16',
    },
    supportedModels: ['gen4_turbo', 'gen4_5'],
    credentialFields: [
      { key: 'apiKey', label: 'Runway API Secret Key', placeholder: 'runway_...', type: 'password', required: true, envFallbackKey: 'RUNWAY_API_KEY' },
    ],
  },
  luma: {
    provider: 'luma',
    category: 'ai_video',
    displayName: 'Luma Dream Machine (Ray 2)',
    description: 'Realistic camera motion choreography and physical world simulation',
    defaultSettings: {
      defaultModel: 'ray-2',
      duration: '5s',
      aspect_ratio: '9:16',
    },
    supportedModels: ['ray-2', 'ray-1-6'],
    credentialFields: [
      { key: 'apiKey', label: 'Luma API Key', placeholder: 'luma-...', type: 'password', required: true, envFallbackKey: 'LUMA_API_KEY' },
    ],
  },

  // Stock Video Footage
  pexels: {
    provider: 'pexels',
    category: 'stock_video',
    displayName: 'Pexels HD Video Library',
    description: 'High-definition b-roll footage and curated cinematic video clips',
    defaultSettings: {
      orientation: 'portrait',
      size: 'medium',
      minDurationSec: 4,
    },
    credentialFields: [
      { key: 'apiKey', label: 'Pexels API Key', placeholder: 'XyZ789...', type: 'password', required: true, envFallbackKey: 'PEXELS_API_KEY' },
    ],
  },
  pixabay: {
    provider: 'pixabay',
    category: 'stock_video',
    displayName: 'Pixabay Video Engine',
    description: 'Royalty-free commercial 4K/HD video footage fallback provider',
    defaultSettings: {
      videoType: 'film',
      minWidth: 1080,
    },
    credentialFields: [
      { key: 'apiKey', label: 'Pixabay API Key', placeholder: '456789-abc...', type: 'password', required: true, envFallbackKey: 'PIXABAY_API_KEY' },
    ],
  },

  // Voiceover & Neural TTS
  edge_tts: {
    provider: 'edge_tts',
    category: 'voice',
    displayName: 'Microsoft Edge Neural TTS',
    description: 'Zero-cost studio neural voices (Andrew, Christopher, Ava, Emma, Brian) with word timestamps',
    defaultSettings: {
      defaultVoice: 'en-US-ChristopherNeural',
      pitch: '+0Hz',
      rate: '+0%',
      volume: '+0%',
    },
    supportedModels: [
      'en-US-ChristopherNeural',
      'en-US-AndrewNeural',
      'en-US-AvaNeural',
      'en-US-EmmaNeural',
      'en-US-BrianNeural',
      'en-GB-RyanNeural',
    ],
    credentialFields: [], // Built-in / zero key requirement
  },
  elevenlabs: {
    provider: 'elevenlabs',
    category: 'voice',
    displayName: 'ElevenLabs Studio Voice',
    description: 'Hyper-realistic cloned voices and emotional speech synthesis',
    defaultSettings: {
      defaultModel: 'eleven_multilingual_v2',
      stability: 0.5,
      similarityBoost: 0.75,
    },
    supportedModels: ['eleven_multilingual_v2', 'eleven_turbo_v2_5', 'eleven_monolingual_v1'],
    credentialFields: [
      { key: 'apiKey', label: 'ElevenLabs API Key', placeholder: 'xi-...', type: 'password', required: true, envFallbackKey: 'ELEVENLABS_API_KEY' },
    ],
  },
  cloudflare_voice: {
    provider: 'cloudflare_voice',
    category: 'voice',
    displayName: 'Cloudflare Workers AI Voice (Aura-2 & MeloTTS)',
    description: 'Deepgram Aura-2 English natural pacing speech and MeloTTS multilingual synthesis',
    defaultSettings: {
      defaultVoice: 'cf-aura-asteria',
    },
    supportedModels: [
      'cf-aura-asteria',
      'cf-aura-orion',
      'cf-aura-arcas',
      'cf-aura-luna',
      'cf-melotts-en',
      'cf-melotts-es',
      'cf-melotts-fr',
      'cf-melotts-zh',
      'cf-melotts-ja',
    ],
    credentialFields: [
      { key: 'accountId', label: 'Cloudflare Account ID', placeholder: 'aac50d67f3ec9133524158d1379bce23', type: 'text', required: true, envFallbackKey: 'CLOUDFLARE_ACCOUNT_ID' },
      { key: 'apiToken', label: 'Cloudflare API Token', placeholder: 'cfat_...', type: 'password', required: true, envFallbackKey: 'CLOUDFLARE_API_TOKEN' },
    ],
  },

  // Cloud Storage
  s3_r2: {
    provider: 's3_r2',
    category: 'storage',
    displayName: 'Cloudflare R2 / AWS S3',
    description: 'High-speed object storage for generated videos, audio clips, and thumbnails',
    defaultSettings: {
      bucket: 'autora-assets',
      region: 'auto',
      publicUrlPrefix: 'https://cdn.autora.live',
    },
    credentialFields: [
      { key: 'accountId', label: 'R2 Account ID / S3 Host', placeholder: '14312a5d4555742372b860ffcbcb116a', type: 'text', required: true, envFallbackKey: 'R2_ACCOUNT_ID' },
      { key: 'accessKeyId', label: 'Access Key ID', placeholder: 'e3b0c44298fc...', type: 'text', required: true, envFallbackKey: 'R2_ACCESS_KEY_ID' },
      { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: '85e2b0c44298fc...', type: 'password', required: true, envFallbackKey: 'R2_SECRET_ACCESS_KEY' },
      { key: 'bucket', label: 'Bucket Name', placeholder: 'autora-assets', type: 'text', required: true, envFallbackKey: 'R2_BUCKET' },
    ],
  },

  // Publishing & Social Integrations
  youtube: {
    provider: 'youtube',
    category: 'publishing',
    displayName: 'YouTube Data API v3 (Google OAuth 2.0)',
    description: 'Direct video uploads, thumbnail publishing, automated scheduling, and playlist management',
    defaultSettings: {
      defaultVisibility: 'PRIVATE',
      notifySubscribers: true,
      category: '28', // Science & Tech
    },
    credentialFields: [
      { key: 'clientId', label: 'Google Client ID', placeholder: '123456789-xxx.apps.googleusercontent.com', type: 'text', required: true, envFallbackKey: 'GOOGLE_CLIENT_ID' },
      { key: 'clientSecret', label: 'Google Client Secret', placeholder: 'GOCSPX-...', type: 'password', required: true, envFallbackKey: 'GOOGLE_CLIENT_SECRET' },
      { key: 'redirectUri', label: 'Authorized Redirect URI', placeholder: 'https://autora.live/api/auth/youtube/callback', type: 'text', required: false, envFallbackKey: 'GOOGLE_REDIRECT_URI' },
    ],
  },
};

export const PAYMENT_GATEWAY_DEFINITIONS: Record<string, {
  provider: 'stripe' | 'polar';
  displayName: string;
  description: string;
  fields: Array<{ key: string; label: string; placeholder: string; type?: 'password' | 'text'; required?: boolean; envFallbackKey: string }>;
}> = {
  stripe: {
    provider: 'stripe',
    displayName: 'Stripe Payments',
    description: 'Global credit cards, Apple Pay, Google Pay, subscriptions, and customer portal',
    fields: [
      { key: 'secretKey', label: 'Stripe Secret Key', placeholder: 'sk_live_... or sk_test_...', type: 'password', required: true, envFallbackKey: 'STRIPE_SECRET_KEY' },
      { key: 'publishableKey', label: 'Stripe Publishable Key', placeholder: 'pk_live_... or pk_test_...', type: 'text', required: false, envFallbackKey: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY' },
      { key: 'webhookSecret', label: 'Stripe Webhook Signing Secret', placeholder: 'whsec_...', type: 'password', required: true, envFallbackKey: 'STRIPE_WEBHOOK_SECRET' },
    ],
  },
  polar: {
    provider: 'polar',
    displayName: 'Polar.sh Merchant of Record',
    description: 'Developer-first Merchant of Record handling global sales tax, VAT, and customer billing',
    fields: [
      { key: 'accessToken', label: 'Polar Organization Access Token', placeholder: 'polar_oat_...', type: 'password', required: true, envFallbackKey: 'POLAR_ACCESS_TOKEN' },
      { key: 'webhookSecret', label: 'Polar Webhook Secret', placeholder: 'polar_whs_...', type: 'password', required: true, envFallbackKey: 'POLAR_WEBHOOK_SECRET' },
      { key: 'organizationId', label: 'Organization ID', placeholder: 'org_...', type: 'text', required: false, envFallbackKey: 'POLAR_ORGANIZATION_ID' },
    ],
  },
};

// ============================================================
// CACHING LAYER
// ============================================================
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds TTL
const memoryCache: Map<string, CacheEntry<any>> = new Map();

export function invalidateIntegrationCache(): void {
  memoryCache.clear();
}

function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setInCache<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// ============================================================
// SENSITIVE MASKING UTILITY
// ============================================================
export function maskSecret(secret: string | null | undefined): string {
  if (!secret) return '';
  const s = secret.trim();
  if (s.length <= 8) return '••••••••';
  const prefix = s.slice(0, 4);
  const suffix = s.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

// ============================================================
// SERVICE IMPLEMENTATION
// ============================================================
export class IntegrationService {
  /**
   * Retrieves decrypted credentials for a provider.
   * Priority:
   * 1. Active row in integration_configs (AES-256-GCM decrypted)
   * 2. Fallback to process.env.*
   */
  static getDecryptedCredentials(provider: string): Record<string, string> {
    const norm = provider.toLowerCase().trim();
    const cacheKey = `creds:${norm}`;
    const cached = getFromCache<Record<string, string>>(cacheKey);
    if (cached) return cached;

    const result: Record<string, string> = {};

    try {
      const db = getDb();
      const row = db
        .prepare('SELECT credentials_encrypted, is_active FROM integration_configs WHERE provider = ?')
        .get(norm) as { credentials_encrypted?: string; is_active: number } | undefined;

      if (row && row.is_active && row.credentials_encrypted) {
        const decryptedJson = decryptToken(row.credentials_encrypted);
        if (decryptedJson) {
          try {
            const parsed = JSON.parse(decryptedJson);
            if (typeof parsed === 'object' && parsed !== null) {
              Object.assign(result, parsed);
            }
          } catch (e) {
            console.warn(`[IntegrationService] Failed to parse decrypted credentials for ${norm}`);
          }
        }
      }
    } catch (err: any) {
      // Database read error (e.g., during initialization), fallback silently
    }

    // Apply environment fallbacks for any missing fields
    const def = KNOWN_INTEGRATIONS[norm];
    if (def) {
      for (const field of def.credentialFields) {
        if (!result[field.key] && field.envFallbackKey && process.env[field.envFallbackKey]) {
          result[field.key] = process.env[field.envFallbackKey]!.trim();
        }
      }
    }

    // Inherit Cloudflare credentials across specialized providers
    if (norm === 'cloudflare_text' || norm === 'cloudflare_voice') {
      const baseCf = this.getDecryptedCredentials('cloudflare');
      if (!result.accountId && baseCf.accountId) result.accountId = baseCf.accountId;
      if (!result.apiToken && baseCf.apiToken) result.apiToken = baseCf.apiToken;
      if (!result.gatewayId && baseCf.gatewayId) result.gatewayId = baseCf.gatewayId;
    }

    setInCache(cacheKey, result);
    return result;
  }

  /**
   * Universal key resolver for backwards compatibility with getApiKey(provider)
   */
  static getDecryptedKey(provider: string): string | null {
    const norm = provider.toLowerCase().trim();
    const creds = this.getDecryptedCredentials(norm);

    // Common standard key properties
    if (creds.apiKey) return creds.apiKey;
    if (creds.apiToken) return creds.apiToken;
    if (creds.secretKey) return creds.secretKey;
    if (creds.accessToken) return creds.accessToken;
    if (creds.accountId && norm.includes('account')) return creds.accountId;

    // Check direct aliases
    if (norm === 'cloudflare_api_token' || norm === 'cloudflare') {
      const cf = this.getDecryptedCredentials('cloudflare');
      return cf.apiToken || process.env.CLOUDFLARE_API_TOKEN || null;
    }
    if (norm === 'cloudflare_account_id' || norm === 'cloudflare_account') {
      const cf = this.getDecryptedCredentials('cloudflare');
      return cf.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || null;
    }
    if (norm === 'cloudflare_gateway_id' || norm === 'cloudflare_ai_gateway_id') {
      const cf = this.getDecryptedCredentials('cloudflare');
      return cf.gatewayId || process.env.CLOUDFLARE_AI_GATEWAY_ID || null;
    }
    if (norm === 'fal_key' || norm === 'fal') {
      const fal = this.getDecryptedCredentials('fal');
      return fal.apiKey || process.env.FAL_KEY || process.env.FAL_AI_KEY || null;
    }
    if (norm === 'pexels_api_key' || norm === 'pexels') {
      const p = this.getDecryptedCredentials('pexels');
      return p.apiKey || process.env.PEXELS_API_KEY || null;
    }
    if (norm === 'pixabay_api_key' || norm === 'pixabay') {
      const p = this.getDecryptedCredentials('pixabay');
      return p.apiKey || process.env.PIXABAY_API_KEY || null;
    }
    if (norm === 'gemini') {
      const g = this.getDecryptedCredentials('gemini');
      return g.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
    }
    if (norm === 'openrouter') {
      const o = this.getDecryptedCredentials('openrouter');
      return o.apiKey || process.env.OPENROUTER_API_KEY || null;
    }
    if (norm === 'openai') {
      const o = this.getDecryptedCredentials('openai');
      return o.apiKey || process.env.OPENAI_API_KEY || null;
    }
    if (norm === 'elevenlabs') {
      const e = this.getDecryptedCredentials('elevenlabs');
      return e.apiKey || process.env.ELEVENLABS_API_KEY || null;
    }
    if (norm === 'runway') {
      const r = this.getDecryptedCredentials('runway');
      return r.apiKey || process.env.RUNWAY_API_KEY || null;
    }
    if (norm === 'luma') {
      const l = this.getDecryptedCredentials('luma');
      return l.apiKey || process.env.LUMA_API_KEY || null;
    }

    return null;
  }

  /**
   * Returns merged configuration for a provider, including decrypted masked secrets and settings
   */
  static getIntegration(provider: string) {
    const norm = provider.toLowerCase().trim();
    const def = KNOWN_INTEGRATIONS[norm];
    if (!def) return null;

    let dbRow: any = null;
    try {
      const db = getDb();
      dbRow = db.prepare('SELECT * FROM integration_configs WHERE provider = ?').get(norm);
    } catch {}

    const creds = this.getDecryptedCredentials(norm);
    let settings: Record<string, any> = { ...def.defaultSettings };

    if (dbRow && dbRow.settings_json) {
      try {
        const parsed = JSON.parse(dbRow.settings_json);
        settings = { ...settings, ...parsed };
      } catch {}
    }

    const maskedCreds: Record<string, string> = {};
    const configuredFields: Record<string, boolean> = {};

    for (const field of def.credentialFields) {
      const val = creds[field.key];
      const isConfigured = !!val && val.length > 0;
      configuredFields[field.key] = isConfigured;
      maskedCreds[field.key] = isConfigured ? maskSecret(val) : '';
    }

    const isFullyConfigured = def.credentialFields.length === 0 || def.credentialFields.every((f) => !f.required || configuredFields[f.key]);

    return {
      id: dbRow?.id || `cfg_${norm}`,
      provider: norm,
      category: def.category,
      displayName: def.displayName,
      description: def.description,
      isActive: dbRow ? !!dbRow.is_active : true,
      isPrimary: dbRow ? !!dbRow.is_primary : false,
      isConfigured: isFullyConfigured,
      configuredFields,
      maskedCredentials: maskedCreds,
      settings,
      supportedModels: def.supportedModels || [],
      lastTestedAt: dbRow?.last_tested_at || null,
      lastTestStatus: dbRow?.last_test_status || null,
      lastTestLatencyMs: dbRow?.last_test_latency_ms || null,
      lastTestError: dbRow?.last_test_error || null,
    };
  }

  /**
   * Returns all known integrations with their current status
   */
  static getAllIntegrations() {
    return Object.keys(KNOWN_INTEGRATIONS).map((p) => this.getIntegration(p)!);
  }

  /**
   * Saves or updates an integration with AES-256-GCM encrypted credentials
   */
  static saveIntegration(
    provider: string,
    params: {
      credentials?: Record<string, string>;
      settings?: Record<string, any>;
      isActive?: boolean;
      isPrimary?: boolean;
    },
    adminUser: string = 'admin',
    ipAddress?: string
  ): boolean {
    const norm = provider.toLowerCase().trim();
    const def = KNOWN_INTEGRATIONS[norm];
    if (!def) throw new Error(`Unknown provider: ${provider}`);

    const db = getDb();
    const now = new Date().toISOString();
    const id = `cfg_${norm}`;

    // Read existing credentials to merge non-masked updates
    const existingCreds = this.getDecryptedCredentials(norm);
    const updatedCreds = { ...existingCreds };

    if (params.credentials) {
      for (const [k, v] of Object.entries(params.credentials)) {
        if (typeof v === 'string') {
          const trimmed = v.trim();
          // If empty string, delete key
          if (trimmed === '') {
            delete updatedCreds[k];
          } else if (!trimmed.includes('••••') && !trimmed.includes('****')) {
            // Only update if not a masked string sent back from the client
            updatedCreds[k] = trimmed;
          }
        }
      }
    }

    // Encrypt updated credentials object
    const encryptedCredentials = encryptToken(JSON.stringify(updatedCreds));

    // Handle settings
    let settingsJson = JSON.stringify(def.defaultSettings || {});
    if (params.settings) {
      settingsJson = JSON.stringify(params.settings);
    } else {
      const existing = db.prepare('SELECT settings_json FROM integration_configs WHERE provider = ?').get(norm) as { settings_json?: string } | undefined;
      if (existing?.settings_json) {
        settingsJson = existing.settings_json;
      }
    }

    const isActive = params.isActive !== undefined ? (params.isActive ? 1 : 0) : 1;
    const isPrimary = params.isPrimary !== undefined ? (params.isPrimary ? 1 : 0) : 0;

    // If setting as primary, demote other integrations in the same category
    if (isPrimary === 1) {
      db.prepare('UPDATE integration_configs SET is_primary = 0 WHERE category = ?').run(def.category);
    }

    db.prepare(`
      INSERT INTO integration_configs (
        id, category, provider, display_name, credentials_encrypted, settings_json,
        is_active, is_primary, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET
        credentials_encrypted = excluded.credentials_encrypted,
        settings_json = excluded.settings_json,
        is_active = excluded.is_active,
        is_primary = excluded.is_primary,
        updated_at = excluded.updated_at
    `).run(
      id,
      def.category,
      norm,
      def.displayName,
      encryptedCredentials,
      settingsJson,
      isActive,
      isPrimary,
      now,
      now
    );

    // Record audit log
    this.logAudit({
      adminUser,
      action: 'UPDATE',
      targetType: 'integration',
      targetId: norm,
      details: {
        category: def.category,
        isActive: !!isActive,
        isPrimary: !!isPrimary,
        updatedKeys: params.credentials ? Object.keys(params.credentials).filter(k => params.credentials![k] && !params.credentials![k].includes('•••')) : [],
      },
      ipAddress,
    });

    // Invalidate cache immediately
    invalidateIntegrationCache();
    return true;
  }

  // ============================================================
  // PAYMENT GATEWAY MANAGEMENT
  // ============================================================
  static getPaymentGateway(provider: 'stripe' | 'polar') {
    const norm = provider.toLowerCase().trim() as 'stripe' | 'polar';
    const def = PAYMENT_GATEWAY_DEFINITIONS[norm];
    if (!def) return null;

    let dbRow: any = null;
    try {
      const db = getDb();
      dbRow = db.prepare('SELECT * FROM payment_gateways WHERE provider = ?').get(norm);
    } catch {}

    const mode: 'test' | 'live' = dbRow?.mode || (process.env.NODE_ENV === 'production' ? 'live' : 'test');
    const isEnabled = dbRow ? !!dbRow.is_enabled : false;
    const isDefault = dbRow ? !!dbRow.is_default : norm === 'stripe';

    // Decrypt credentials
    const creds: Record<string, string> = {};
    if (dbRow?.credentials_encrypted) {
      const decrypted = decryptToken(dbRow.credentials_encrypted);
      if (decrypted) {
        try {
          Object.assign(creds, JSON.parse(decrypted));
        } catch {}
      }
    }

    // Environment fallbacks if DB empty
    for (const f of def.fields) {
      if (!creds[f.key] && process.env[f.envFallbackKey]) {
        creds[f.key] = process.env[f.envFallbackKey]!.trim();
      }
    }

    let webhookSecret = '';
    if (dbRow?.webhook_secret_encrypted) {
      webhookSecret = decryptToken(dbRow.webhook_secret_encrypted) || '';
    } else if (norm === 'stripe') {
      webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    } else if (norm === 'polar') {
      webhookSecret = process.env.POLAR_WEBHOOK_SECRET || '';
    }

    let settings: Record<string, any> = {
      currency: 'usd',
      supportedMethods: ['card', 'link', 'google_pay', 'apple_pay'],
    };
    if (dbRow?.settings_json) {
      try {
        settings = { ...settings, ...JSON.parse(dbRow.settings_json) };
      } catch {}
    }

    const maskedCreds: Record<string, string> = {};
    for (const f of def.fields) {
      const val = creds[f.key];
      maskedCreds[f.key] = val ? maskSecret(val) : '';
    }

    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://autora.live';
    const webhookUrl = norm === 'stripe' ? `${host}/api/billing/webhook` : `${host}/api/billing/polar-webhook`;

    return {
      id: dbRow?.id || `gw_${norm}`,
      provider: norm,
      displayName: def.displayName,
      description: def.description,
      mode,
      isEnabled,
      isDefault,
      isConfigured: !!(creds.secretKey || creds.accessToken),
      maskedCredentials: maskedCreds,
      maskedWebhookSecret: webhookSecret ? maskSecret(webhookSecret) : '',
      webhookUrl,
      settings,
      lastTestedAt: dbRow?.last_tested_at || null,
      lastTestStatus: dbRow?.last_test_status || null,
      lastTestError: dbRow?.last_test_error || null,
    };
  }

  static getAllPaymentGateways() {
    return (['stripe', 'polar'] as const).map((p) => this.getPaymentGateway(p)!);
  }

  static savePaymentGateway(
    provider: 'stripe' | 'polar',
    params: {
      mode?: 'test' | 'live';
      isEnabled?: boolean;
      isDefault?: boolean;
      credentials?: Record<string, string>;
      settings?: Record<string, any>;
      webhookSecret?: string;
    },
    adminUser: string = 'admin',
    ipAddress?: string
  ): boolean {
    const norm = provider.toLowerCase().trim() as 'stripe' | 'polar';
    const def = PAYMENT_GATEWAY_DEFINITIONS[norm];
    if (!def) throw new Error(`Unknown gateway: ${provider}`);

    const db = getDb();
    const now = new Date().toISOString();
    const id = `gw_${norm}`;

    // Read existing credentials
    const existing = db.prepare('SELECT credentials_encrypted, webhook_secret_encrypted, settings_json, mode, is_enabled, is_default FROM payment_gateways WHERE provider = ?').get(norm) as any;
    const creds: Record<string, string> = {};

    if (existing?.credentials_encrypted) {
      const dec = decryptToken(existing.credentials_encrypted);
      if (dec) {
        try {
          Object.assign(creds, JSON.parse(dec));
        } catch {}
      }
    }

    if (params.credentials) {
      for (const [k, v] of Object.entries(params.credentials)) {
        if (typeof v === 'string') {
          const trimmed = v.trim();
          if (trimmed === '') {
            delete creds[k];
          } else if (!trimmed.includes('••••') && !trimmed.includes('****')) {
            creds[k] = trimmed;
          }
        }
      }
    }

    let webhookSecretEncrypted = existing?.webhook_secret_encrypted || null;
    if (params.webhookSecret !== undefined) {
      const trimmed = params.webhookSecret.trim();
      if (trimmed === '') {
        webhookSecretEncrypted = null;
      } else if (!trimmed.includes('••••') && !trimmed.includes('****')) {
        webhookSecretEncrypted = encryptToken(trimmed);
      }
    }

    let settingsJson = existing?.settings_json || JSON.stringify({ currency: 'usd' });
    if (params.settings) {
      settingsJson = JSON.stringify(params.settings);
    }

    const mode = params.mode || existing?.mode || 'test';
    const isEnabled = params.isEnabled !== undefined ? (params.isEnabled ? 1 : 0) : (existing?.is_enabled ?? 1);
    const isDefault = params.isDefault !== undefined ? (params.isDefault ? 1 : 0) : (existing?.is_default ?? 0);

    // If set as default, demote other gateways
    if (isDefault === 1) {
      db.prepare('UPDATE payment_gateways SET is_default = 0').run();
    }

    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://autora.live';
    const webhookUrl = norm === 'stripe' ? `${host}/api/billing/webhook` : `${host}/api/billing/polar-webhook`;

    db.prepare(`
      INSERT INTO payment_gateways (
        id, provider, mode, is_enabled, is_default, credentials_encrypted,
        settings_json, webhook_secret_encrypted, webhook_url, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(provider) DO UPDATE SET
        mode = excluded.mode,
        is_enabled = excluded.is_enabled,
        is_default = excluded.is_default,
        credentials_encrypted = excluded.credentials_encrypted,
        settings_json = excluded.settings_json,
        webhook_secret_encrypted = excluded.webhook_secret_encrypted,
        webhook_url = excluded.webhook_url,
        updated_at = excluded.updated_at
    `).run(
      id,
      norm,
      mode,
      isEnabled,
      isDefault,
      encryptToken(JSON.stringify(creds)),
      settingsJson,
      webhookSecretEncrypted,
      webhookUrl,
      now,
      now
    );

    this.logAudit({
      adminUser,
      action: 'UPDATE',
      targetType: 'gateway',
      targetId: norm,
      details: {
        mode,
        isEnabled: !!isEnabled,
        isDefault: !!isDefault,
        hasWebhookSecret: !!webhookSecretEncrypted,
      },
      ipAddress,
    });

    invalidateIntegrationCache();
    return true;
  }

  static setDefaultPaymentGateway(provider: 'stripe' | 'polar', adminUser: string = 'admin', ipAddress?: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare('UPDATE payment_gateways SET is_default = 0').run();
    const res = db.prepare('UPDATE payment_gateways SET is_default = 1, is_enabled = 1, updated_at = ? WHERE provider = ?').run(now, provider.toLowerCase());

    this.logAudit({
      adminUser,
      action: 'SWITCH_PRIMARY',
      targetType: 'gateway',
      targetId: provider.toLowerCase(),
      details: { defaultGateway: provider },
      ipAddress,
    });

    invalidateIntegrationCache();
    return res.changes > 0;
  }

  /**
   * Retrieves active, decrypted credentials for runtime billing operations
   */
  static getActivePaymentConfig(): {
    provider: 'stripe' | 'polar';
    mode: 'test' | 'live';
    stripe?: { secretKey: string; webhookSecret: string };
    polar?: { accessToken: string; webhookSecret: string };
  } {
    const gateways = this.getAllPaymentGateways();
    const defaultGw = gateways.find((g) => g.isDefault && g.isEnabled) || gateways.find((g) => g.isEnabled) || gateways[0];

    const provider = defaultGw?.provider || 'stripe';
    const mode = defaultGw?.mode || 'test';

    const db = getDb();
    const row = db.prepare('SELECT credentials_encrypted, webhook_secret_encrypted FROM payment_gateways WHERE provider = ?').get(provider) as any;

    const creds: Record<string, string> = {};
    if (row?.credentials_encrypted) {
      const dec = decryptToken(row.credentials_encrypted);
      if (dec) {
        try { Object.assign(creds, JSON.parse(dec)); } catch {}
      }
    }

    let webhookSecret = '';
    if (row?.webhook_secret_encrypted) {
      webhookSecret = decryptToken(row.webhook_secret_encrypted) || '';
    }

    if (provider === 'stripe') {
      return {
        provider: 'stripe',
        mode,
        stripe: {
          secretKey: creds.secretKey || process.env.STRIPE_SECRET_KEY || '',
          webhookSecret: webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '',
        },
      };
    } else {
      return {
        provider: 'polar',
        mode,
        polar: {
          accessToken: creds.accessToken || process.env.POLAR_ACCESS_TOKEN || '',
          webhookSecret: webhookSecret || process.env.POLAR_WEBHOOK_SECRET || '',
        },
      };
    }
  }

  // ============================================================
  // SPECIALIZED GETTERS FOR SYSTEM ENGINES
  // ============================================================
  static getYoutubeConfig() {
    const creds = this.getDecryptedCredentials('youtube');
    const integration = this.getIntegration('youtube');
    const host = process.env.NEXT_PUBLIC_APP_URL || 'https://autora.live';

    return {
      clientId: creds.clientId || process.env.GOOGLE_CLIENT_ID || process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: creds.clientSecret || process.env.GOOGLE_CLIENT_SECRET || process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: creds.redirectUri || process.env.GOOGLE_REDIRECT_URI || `${host}/api/auth/youtube/callback`,
      isConfigured: !!(creds.clientId || process.env.GOOGLE_CLIENT_ID),
      settings: integration?.settings || {},
    };
  }

  static getAiConfig(preferredProvider?: string) {
    const providers = ['gemini', 'openrouter', 'openai'];
    const candidates = preferredProvider ? [preferredProvider, ...providers.filter(p => p !== preferredProvider)] : providers;

    for (const p of candidates) {
      const creds = this.getDecryptedCredentials(p);
      const key = creds.apiKey;
      if (key && key.trim()) {
        const item = this.getIntegration(p);
        return {
          provider: p,
          apiKey: key.trim(),
          settings: item?.settings || {},
          defaultModel: item?.settings?.defaultModel || (p === 'gemini' ? 'gemini-2.0-flash' : p === 'openrouter' ? 'deepseek/deepseek-chat' : 'gpt-4o'),
        };
      }
    }

    return {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '',
      settings: {},
      defaultModel: 'gemini-2.0-flash',
    };
  }

  static getVideoConfig() {
    const falCreds = this.getDecryptedCredentials('fal');
    const cfCreds = this.getDecryptedCredentials('cloudflare');
    const veoCreds = this.getDecryptedCredentials('veo');

    return {
      fal: {
        apiKey: falCreds.apiKey || process.env.FAL_KEY || process.env.FAL_AI_KEY || '',
        isConfigured: !!(falCreds.apiKey || process.env.FAL_KEY),
      },
      cloudflare: {
        accountId: cfCreds.accountId || process.env.CLOUDFLARE_ACCOUNT_ID || '',
        apiToken: cfCreds.apiToken || process.env.CLOUDFLARE_API_TOKEN || '',
        isConfigured: !!(cfCreds.apiToken || process.env.CLOUDFLARE_API_TOKEN),
      },
      veo: {
        apiKey: veoCreds.apiKey || process.env.GEMINI_API_KEY || '',
        isConfigured: !!(veoCreds.apiKey || process.env.GEMINI_API_KEY),
      },
    };
  }

  // ============================================================
  // AUDIT & TELEMETRY LOGGING
  // ============================================================
  static logAudit(params: {
    adminUser: string;
    action: string;
    targetType: 'integration' | 'gateway';
    targetId: string;
    details?: any;
    ipAddress?: string;
  }): void {
    try {
      const db = getDb();
      const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      db.prepare(`
        INSERT INTO integration_audit_logs (
          id, admin_user, action, target_type, target_id, details_json, ip_address, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        params.adminUser,
        params.action,
        params.targetType,
        params.targetId,
        params.details ? JSON.stringify(params.details) : null,
        params.ipAddress || null,
        new Date().toISOString()
      );
    } catch (e: any) {
      console.error('[IntegrationService] Failed to write audit log:', e.message);
    }
  }

  static logConnectionTest(params: {
    provider: string;
    status: 'SUCCESS' | 'FAILED';
    latencyMs: number;
    endpoint?: string;
    errorSanitized?: string;
  }): void {
    try {
      const db = getDb();
      const id = `test_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO connection_test_logs (
          id, provider, status, latency_ms, endpoint, error_sanitized, tested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        params.provider,
        params.status,
        params.latencyMs,
        params.endpoint || null,
        params.errorSanitized || null,
        now
      );

      // Update provider table test status
      db.prepare(`
        UPDATE integration_configs SET
          last_tested_at = ?,
          last_test_status = ?,
          last_test_latency_ms = ?,
          last_test_error = ?
        WHERE provider = ?
      `).run(now, params.status, params.latencyMs, params.errorSanitized || null, params.provider);

      // Also update gateway table if it was a payment gateway
      db.prepare(`
        UPDATE payment_gateways SET
          last_tested_at = ?,
          last_test_status = ?,
          last_test_error = ?
        WHERE provider = ?
      `).run(now, params.status, params.errorSanitized || null, params.provider);
    } catch (e: any) {
      console.error('[IntegrationService] Failed to write connection test log:', e.message);
    }
  }

  static logWebhookEvent(params: {
    provider: string;
    eventId: string;
    eventType: string;
    payload?: any;
    status: 'PROCESSED' | 'FAILED' | 'IGNORED';
    errorMessage?: string;
  }): void {
    try {
      const db = getDb();
      const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO webhook_events (
          id, provider, event_id, event_type, payload_json, status, error_message, processed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(provider, event_id) DO UPDATE SET
          status = excluded.status,
          error_message = excluded.error_message,
          processed_at = excluded.processed_at
      `).run(
        id,
        params.provider,
        params.eventId,
        params.eventType,
        params.payload ? JSON.stringify(params.payload).substring(0, 10000) : null,
        params.status,
        params.errorMessage || null,
        now
      );
    } catch (e: any) {
      console.error('[IntegrationService] Failed to write webhook event log:', e.message);
    }
  }

  static getAuditLogs(limit: number = 50) {
    try {
      const db = getDb();
      return db.prepare('SELECT * FROM integration_audit_logs ORDER BY created_at DESC LIMIT ?').all(limit);
    } catch {
      return [];
    }
  }

  static getConnectionTestLogs(limit: number = 50) {
    try {
      const db = getDb();
      return db.prepare('SELECT * FROM connection_test_logs ORDER BY tested_at DESC LIMIT ?').all(limit);
    } catch {
      return [];
    }
  }

  static getWebhookEvents(limit: number = 50) {
    try {
      const db = getDb();
      return db.prepare('SELECT * FROM webhook_events ORDER BY processed_at DESC LIMIT ?').all(limit);
    } catch {
      return [];
    }
  }
}
