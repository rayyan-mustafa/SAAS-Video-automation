# AUTORA SaaS Video Automation — Cloudflare Architecture & Antigravity Agent Execution Blueprint

> **TARGET AUDIENCE:** Antigravity AI Coding Agent & Lead Developer  
> **REPOSITORY:** `rayyan-mustafa/saas-video-automation` (`AUTORA`)  
> **OBJECTIVE:** Audit the existing Next.js + TypeScript + FFmpeg video automation codebase and integrate **Cloudflare Workers AI**, **Cloudflare AI Gateway**, **Cloudflare R2**, and **Cloudflare Developer Platform** services across all providers, pipelines, and admin interfaces without breaking existing Work Package (`WP0`–`WP8`) test suites.

---

## 0. Security & Credential Notice for Agent and Developer

1. **API Token Rotation:** The token previously shared in chat (`cfat_M9ry...`) must be rolled/revoked in the **Cloudflare Dashboard -> My Profile -> API Tokens** and replaced in `.env.local` before production deployment.
2. **Account ID:** `CLOUDFLARE_ACCOUNT_ID=aac50d67f3ec9133524158d1379bce23`
3. **Required Token Permissions:** When creating or updating the Cloudflare API Token in the dashboard, attach the following permissions:
   - `Account -> Workers AI -> Read & Edit`
   - `Account -> AI Gateway -> Read & Edit`
   - `Account -> Workers R2 Storage -> Read & Edit`
   - `Account -> Cloudflare Stream -> Read & Edit` *(Optional, for hosted HLS video previews)*

---

## 1. Full Codebase Audit: Current Implementation vs. Cloudflare Replacements

The table below maps the exact files in the `AUTORA` repository to the Cloudflare models and infrastructure services that can replace, upgrade, or act as a zero-downtime fallback for each module.

| Subsystem / Feature | Exact File(s) in `AUTORA` Repo | Current Implementation in Codebase | Cloudflare Service / Model to Add or Replace | Technical & Cost Impact |
| :--- | :--- | :--- | :--- | :--- |
| **1. Script, Plan & Scene JSON Generation** | `src/lib/providers/aiProvider.ts`<br>`src/lib/video/planGenerator.ts`<br>`src/lib/providers/personalCreatorScriptService.ts` | Calls OpenAI (`gpt-4o` / `gpt-4o-mini`) or Gemini APIs to generate structured scene plans and narration scripts | **Cloudflare Workers AI LLMs:**<br>- `@cf/meta/llama-3.3-70b-instruct-fp8-fast`<br>- `@cf/google/gemma-4-26b-a4b-it`<br>- `@cf/meta/llama-4-scout-17b-16e-instruct` | Supports strict JSON Schema (`response_format: { type: "json_object" }`), fast token generation, 10,000 free Neurons/day, and eliminates single-provider lock-in. |
| **2. Viral Hook, Copilot & Competitor Variations** | `src/app/api/tools/generate-hook/route.ts`<br>`src/app/api/copilot/route.ts`<br>`src/app/api/competitors/generate-variation/route.ts`<br>`src/app/api/calendar/generate-plan/route.ts` | Direct LLM provider calls for marketing hooks, content calendars, and competitor remixing | **Workers AI Reasoning & Instruct Models:**<br>- `@cf/deepseek-ai/deepseek-r1-distill-qwen-32b` (viral retention reasoning)<br>- `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (fast copilot chat) | Offloads high-frequency user tool requests (Hook Generator, Copilot, Calendar Planner) to ultra-low-cost edge inference. |
| **3. AI Scene Visuals & Motion Stills** | `src/lib/providers/cloudflareVideoProvider.ts`<br>`src/lib/video/motionStillRenderer.ts`<br>`src/lib/providers/videoProvider.ts` | `cloudflareVideoProvider.ts` exists as a provider stub/adapter alongside `veoVideoProvider.ts`, `runwayVideoProvider.ts`, `lumaVideoProvider.ts`, and `falVideoProvider.ts` | **Workers AI Text-to-Image + Motion Still Pipeline:**<br>- `@cf/black-forest-labs/flux-1-schnell` (Primary 4-step high-res generator)<br>- `@cf/bytedance/stable-diffusion-xl-lightning` (Ultra-fast fallback)<br>- `@cf/stabilityai/stable-diffusion-xl-base-1.0` | Generates crisp 9:16 (`768x1344`) and 16:9 (`1344x768`) scene keyframes in ~1.2s and pipes them into `motionStillRenderer.ts` + `ffmpegCompositor.ts` for 60fps Ken Burns pan/zoom scenes at <$0.01 per video. |
| **4. Thumbnail Generation** | `src/lib/providers/thumbnailProvider.ts`<br>`src/app/api/projects/[id]/thumbnail/route.ts` | External image generation or static frame extraction | **Workers AI Image Generation:**<br>- `@cf/black-forest-labs/flux-1-schnell` | Generates high-contrast, high-CTR custom thumbnails on demand via `/api/projects/[id]/thumbnail`. |
| **5. Voiceover Synthesis (Audio-First WP1)** | `src/lib/providers/voiceProvider.ts`<br>`src/lib/providers/personalVoiceService.ts`<br>`src/app/api/projects/[id]/scenes/[sceneId]/narration/route.ts` | ElevenLabs / OpenAI TTS or fallback audio buffers | **Workers AI Text-to-Speech (TTS):**<br>- `@cf/deepgram/aura-2-en` (Natural pacing English TTS)<br>- `@cf/myshell-ai/melotts` (Multilingual TTS) | Provides native edge TTS audio synthesis so `WP1` audio-first scene timing works out-of-the-box using only the Cloudflare API token. |
| **6. Word-Level Subtitles & Captions** | `src/lib/providers/subtitleProvider.ts` | Whisper API / local subtitle timing estimation | **Workers AI Speech-to-Text (ASR):**<br>- `@cf/openai/whisper-large-v3-turbo`<br>- `@cf/deepgram/nova-3` | Returns exact word-level timestamps (`words: [{ word, start, end }]`) and `vtt`/`srt` segments for burned-in dynamic captions in `ffmpegCompositor.ts`. |
| **7. Automated Visual Quality Control (WP4 QC v2)** | `src/lib/video/qualityControl.ts`<br>`src/lib/video/qcGoldenSet.ts` | Heuristic checks or Gemini Vision (`scripts/test-gemini-vision.ts`) | **Workers AI Multimodal Vision:**<br>- `@cf/meta/llama-3.2-11b-vision-instruct`<br>- `@cf/moonshotai/kimi-k2.6` | Inspects generated keyframes/clips for visual defects, blank frames, or prompt mismatch before final FFmpeg render. |
| **8. Content Safety & Moderation Guard** | `src/lib/video/moderationGuard.ts` | Keyword/regex filtering or external moderation endpoint | **Workers AI Safety Classification:**<br>- `@cf/meta/llama-guard-3-8b`<br>- `@cf/ibm/granite-4.0-h-micro` | Evaluates user prompts and scripts against safety taxonomies (S1–S13) in <150ms before spending GPU credits. |
| **9. Originality Radar & Semantic Deduplication (WP6)** | `src/lib/video/originalityRadar.ts`<br>`src/lib/providers/stockVideoProvider.ts` | Text similarity heuristics for originality compliance (`tests/wp6-originality-compliance.test.ts`) | **Workers AI Embeddings + Cloudflare Vectorize:**<br>- `@cf/baai/bge-m3` (1024-dim dense + sparse embeddings) | Computes true cosine similarity between user scripts, competitor transcripts, and stock B-roll descriptions. |
| **10. AI Gateway (Caching, Fallbacks & Cost Logs)** | `src/components/admin/GatewaysManager.tsx`<br>`src/app/api/admin/gateways/route.ts`<br>`src/lib/config/integrationService.ts` | Custom DB gateway table & manual provider switching | **Cloudflare AI Gateway** (`https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/...`) | Unified proxy for OpenAI, Gemini, Anthropic, Fal, and Workers AI. Adds automatic prompt caching, rate-limiting, retry fallbacks, and real-time cost tracking. |
| **11. Object Storage for Media Assets** | `src/lib/storage/index.ts`<br>`src/app/api/assets/[...key]/route.ts`<br>`src/app/api/personal-ai/upload/route.ts` | Local disk storage or S3-compatible bucket | **Cloudflare R2 Storage** | S3-compatible API (`@aws-sdk/client-s3`) with **$0 egress bandwidth fees** when serving `.mp4`, `.mp3`, and `.png` assets through `/api/assets/[...key]`. |
| **12. Background Render Queue & Scheduler** | `src/lib/queue/worker.ts`<br>`src/lib/scheduler/index.ts`<br>`src/app/api/scheduler/run/route.ts` | In-process worker queue and cron endpoint | **Cloudflare Queues + Cloudflare Workflows + Cron Triggers** | Decouples heavy multi-scene generation from HTTP request lifecycles; retries individual failed scenes durably. |
| **13. Database & Rate Limiting** | `src/lib/db/index.ts`<br>`src/lib/db/db-adapter.ts`<br>`src/lib/security/rateLimit.ts` | SQLite / Postgres (`schema.sql`, `schema.postgres.sql`) + in-memory/DB rate limiter | **Cloudflare Hyperdrive** (for Postgres pooling) or **Cloudflare D1** (SQLite) + **Cloudflare KV / WAF Rate Limiting** | Eliminates Postgres connection exhaustion and moves rate-limiting to the edge. |

---

## 2. Complete Catalog of Cloudflare Workers AI Models to Register in `AUTORA`

The Antigravity agent should register the following models in `src/lib/video/modelRegistry.ts` and expose them in `src/components/admin/AiModelsManager.tsx`:

### A. Text Generation & Script Reasoning Models (`text-generation`)
1. **`@cf/meta/llama-3.3-70b-instruct-fp8-fast`**
   - **Role:** Primary script writer, JSON scene planner, YouTube/TikTok hook generator.
   - **Capabilities:** Fast FP8 inference, native `response_format: { type: "json_object" }` and JSON schema support.
2. **`@cf/google/gemma-4-26b-a4b-it`**
   - **Role:** Long-context script generator & competitor channel analyzer (up to 256k context window).
   - **Capabilities:** Mixture-of-Experts (MoE) architecture with multimodal and structured output support.
3. **`@cf/meta/llama-4-scout-17b-16e-instruct`**
   - **Role:** Multi-document competitor intelligence & personal AI creator script service.
4. **`@cf/deepseek-ai/deepseek-r1-distill-qwen-32b`**
   - **Role:** Viral retention analyzer & narrative arc critic.
5. **`@cf/ibm/granite-4.0-h-micro`**
   - **Role:** Ultra-low-cost metadata tagger, title formatter, and hashtag generator.

### B. Visual & Keyframe Generation Models (`text-to-image`)
1. **`@cf/black-forest-labs/flux-1-schnell`**
   - **Role:** Primary visual generator for `cloudflareVideoProvider.ts` (keyframe + motion still pipeline) and `thumbnailProvider.ts`.
   - **Parameters:** `{ prompt: string, steps?: number (default 4, max 8) }` -> Returns `{ image: string (base64) }`.
2. **`@cf/bytedance/stable-diffusion-xl-lightning`**
   - **Role:** High-speed 4-step image fallback for rapid storyboard previews (`src/lib/video/storyboardPreview.ts`).
3. **`@cf/stabilityai/stable-diffusion-xl-base-1.0`**
   - **Role:** Secondary stylized visual generator for presets in `src/lib/video/visualStyles.ts`.

### C. Audio & Voiceover Models (`text-to-speech` & `automatic-speech-recognition`)
1. **`@cf/deepgram/aura-2-en`** (or `@cf/deepgram/aura-1`)
   - **Role:** Primary Cloudflare TTS engine in `src/lib/providers/voiceProvider.ts`.
   - **Parameters:** `{ text: string, speaker?: "asteria" | "arcas" | "orion" | "luna" | "stella" }` -> Returns binary audio stream (`audio/mpeg` or `audio/wav`).
2. **`@cf/myshell-ai/melotts`**
   - **Role:** Multilingual TTS voiceover generator (`en`, `es`, `fr`, `zh`, `ja`, `ko`).
   - **Parameters:** `{ prompt: string, lang?: string }` -> Returns `{ audio: string (base64) }` or binary stream.
3. **`@cf/openai/whisper-large-v3-turbo`**
   - **Role:** Primary ASR subtitle & word-timing engine in `src/lib/providers/subtitleProvider.ts`.
   - **Parameters:** `{ audio: string (base64), task: "transcribe", language?: string, vad_filter?: boolean }` -> Returns `{ text, word_count, segments, words, vtt }`.

### D. Vision QC, Moderation & Embeddings (`image-to-text` & `text-embeddings`)
1. **`@cf/meta/llama-3.2-11b-vision-instruct`**
   - **Role:** Visual Quality Control (`src/lib/video/qualityControl.ts`) to inspect scene keyframes and verify prompt adherence.
2. **`@cf/meta/llama-guard-3-8b`**
   - **Role:** Prompt & script safety filter in `src/lib/video/moderationGuard.ts`.
3. **`@cf/baai/bge-m3`**
   - **Role:** Semantic embedding generator in `src/lib/video/originalityRadar.ts` and `src/lib/providers/stockVideoProvider.ts`.

---

## 3. Step-by-Step Implementation Instructions for the Antigravity Agent

Follow these tasks in order. Before modifying any file, read its current contents to preserve existing TypeScript interfaces, exports, and test contracts.

---

### TASK 1: Update Environment Configuration & Integration Service

#### 1.1 Update `.env.example` and `src/lib/config/env-validator.ts`
Ensure the following environment variables are documented and validated as optional/configurable provider keys:
```env
# Cloudflare Workers AI & AI Gateway
CLOUDFLARE_ACCOUNT_ID=aac50d67f3ec9133524158d1379bce23
CLOUDFLARE_API_TOKEN=your_rotated_cloudflare_api_token
CLOUDFLARE_AI_GATEWAY_ID=autora-gateway

# Cloudflare R2 Object Storage (S3 Compatible)
R2_ACCOUNT_ID=aac50d67f3ec9133524158d1379bce23
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=autora-media
R2_PUBLIC_URL=https://media.yourdomain.com
```

#### 1.2 Check `src/lib/config/integrationService.ts` and `src/lib/providers/config.ts`
- Ensure `cloudflare` is recognized as a first-class provider alongside `openai`, `gemini`, `fal`, `runway`, `luma`, and `elevenlabs`.
- Ensure `integrationService.ts` resolves `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `CLOUDFLARE_AI_GATEWAY_ID` from either the encrypted database `integrations` / `api_keys` table or `process.env`.

---

### TASK 2: Create the Unified Cloudflare AI Client (`src/lib/providers/cloudflareAiClient.ts`)

Create a new helper module at `src/lib/providers/cloudflareAiClient.ts` that all other providers (`aiProvider.ts`, `cloudflareVideoProvider.ts`, `voiceProvider.ts`, `subtitleProvider.ts`, `thumbnailProvider.ts`, `moderationGuard.ts`, `qualityControl.ts`, `originalityRadar.ts`) can import.

```typescript
// src/lib/providers/cloudflareAiClient.ts

export interface CloudflareCredentials {
  accountId: string;
  apiToken: string;
  gatewayId?: string;
}

export function getCloudflareCredentials(): CloudflareCredentials {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
  const apiToken = process.env.CLOUDFLARE_API_TOKEN || '';
  const gatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID || undefined;

  return { accountId, apiToken, gatewayId };
}

export function isCloudflareConfigured(): boolean {
  const { accountId, apiToken } = getCloudflareCredentials();
  return Boolean(accountId && apiToken && !apiToken.includes('placeholder'));
}

export function getCloudflareBaseUrl(creds?: Partial<CloudflareCredentials>): string {
  const { accountId, gatewayId } = { ...getCloudflareCredentials(), ...creds };
  if (!accountId) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  }
  if (gatewayId) {
    return `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewayId}/workers-ai`;
  }
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai`;
}

/**
 * Execute a Cloudflare Workers AI model that returns JSON (LLMs, Whisper, Base64 FLUX, Embeddings)
 */
export async function runCloudflareJson<T = any>(
  model: string,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number; creds?: Partial<CloudflareCredentials> }
): Promise<T> {
  const creds = { ...getCloudflareCredentials(), ...options?.creds };
  if (!creds.accountId || !creds.apiToken) {
    throw new Error(`Cloudflare credentials not configured for model ${model}`);
  }

  const baseUrl = getCloudflareBaseUrl(creds);
  const url = creds.gatewayId
    ? `${baseUrl}/${model}`
    : `${baseUrl}/run/${model}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Cloudflare Workers AI error (${model}) [HTTP ${response.status}]: ${errorBody}`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      // Direct API wraps in { result, success }, Gateway may return result or OpenAI format
      return (json.result !== undefined ? json.result : json) as T;
    }

    // If the model returned raw binary (e.g. certain image/audio models), convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { binaryBase64: base64, contentType } as unknown as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Execute a Cloudflare Workers AI model that returns a binary Buffer (e.g. Aura-2 TTS or binary PNG/JPEG)
 */
export async function runCloudflareBinary(
  model: string,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number; creds?: Partial<CloudflareCredentials> }
): Promise<Buffer> {
  const creds = { ...getCloudflareCredentials(), ...options?.creds };
  if (!creds.accountId || !creds.apiToken) {
    throw new Error(`Cloudflare credentials not configured for binary model ${model}`);
  }

  const baseUrl = getCloudflareBaseUrl(creds);
  const url = creds.gatewayId
    ? `${baseUrl}/${model}`
    : `${baseUrl}/run/${model}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 60_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Cloudflare Workers AI binary error (${model}) [HTTP ${response.status}]: ${errorBody}`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      const b64 = json?.result?.image || json?.result?.audio || json?.image || json?.audio;
      if (typeof b64 === 'string') {
        return Buffer.from(b64, 'base64');
      }
      throw new Error(`Expected binary or base64 payload from ${model}, got JSON: ${JSON.stringify(json).slice(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}
```

---

### TASK 3: Upgrade `src/lib/providers/cloudflareVideoProvider.ts`

Inspect `src/lib/providers/cloudflareVideoProvider.ts` and `src/lib/video/motionStillRenderer.ts`.
Ensure `cloudflareVideoProvider.ts` supports:
1. **Primary Model:** `@cf/black-forest-labs/flux-1-schnell` (4–6 steps) for photorealistic/cinematic scene keyframes.
2. **Fallback Models:** `@cf/bytedance/stable-diffusion-xl-lightning` and `@cf/stabilityai/stable-diffusion-xl-base-1.0`.
3. **Motion Still Conversion:** Takes the generated image buffer from FLUX.1 [schnell] and passes it through `motionStillRenderer.ts` / `ffmpegCompositor.ts` to produce a real `.mp4` video clip matching the exact `durationSec` of the scene's audio narration (`WP1` audio-first timing compliance) and aspect ratio (`9:16` or `16:9`), storing the result via `src/lib/storage/index.ts`.
4. **Honest Failure Contract (`WP0`):** Never return fake/sample video URLs if Cloudflare credentials are missing or invalid—throw structured `EngineError` from `src/lib/video/engineErrors.ts` so `tests/wp0-engine-honest-failures.test.ts` and `tests/module-2-auto-refund.test.ts` continue to pass 100%.

---

### TASK 4: Wire Cloudflare LLMs into `aiProvider.ts` & Script Services

Inspect `src/lib/providers/aiProvider.ts`, `src/lib/video/planGenerator.ts`, and `src/lib/providers/personalCreatorScriptService.ts`:
1. Add Cloudflare LLM support using `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (default) and `@cf/google/gemma-4-26b-a4b-it` (long-context/documentary).
2. Use Cloudflare's OpenAI-compatible chat completion endpoint (`/v1/chat/completions`) or `runCloudflareJson('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages, response_format: { type: 'json_object' }, temperature: 0.7 })`.
3. Configure the provider priority chain in `aiProvider.ts`:
   - If the user/project explicitly selects a Cloudflare model (or if OpenAI/Gemini keys are absent while `isCloudflareConfigured()` is `true`), route script generation, hook generation (`/api/tools/generate-hook`), copilot (`/api/copilot`), and competitor variation (`/api/competitors/generate-variation`) through Cloudflare Workers AI.

---

### TASK 5: Wire Cloudflare TTS into `src/lib/providers/voiceProvider.ts`

Inspect `src/lib/providers/voiceProvider.ts`:
1. Add `'cloudflare'` (or voice IDs prefixed with `cf-aura-` / `cf-melotts-`) as a supported TTS provider.
2. Map voice presets:
   - `cf-aura-asteria` -> `@cf/deepgram/aura-2-en` (`speaker: "asteria"`)
   - `cf-aura-orion` -> `@cf/deepgram/aura-2-en` (`speaker: "orion"`)
   - `cf-aura-arcas` -> `@cf/deepgram/aura-2-en` (`speaker: "arcas"`)
   - `cf-aura-luna` -> `@cf/deepgram/aura-2-en` (`speaker: "luna"`)
   - `cf-melotts-en` -> `@cf/myshell-ai/melotts` (`lang: "en"`)
3. Measure or parse the exact duration of the returned audio buffer so `WP1` audio-first scene timing (`tests/wp1-audio-first-timing.test.ts`) receives accurate `audioDurationMs` / `durationSec`.

---

### TASK 6: Wire Cloudflare Whisper Large v3 Turbo into `src/lib/providers/subtitleProvider.ts`

Inspect `src/lib/providers/subtitleProvider.ts`:
1. Add a Cloudflare ASR transcription method using `@cf/openai/whisper-large-v3-turbo`:
   ```typescript
   const whisperResult = await runCloudflareJson<{
     text: string;
     words?: Array<{ word: string; start: number; end: number }>;
     segments?: Array<{ start: number; end: number; text: string }>;
     vtt?: string;
   }>('@cf/openai/whisper-large-v3-turbo', {
     audio: audioBuffer.toString('base64'),
     task: 'transcribe',
     language: 'en',
     vad_filter: true,
   });
   ```
2. Map `whisperResult.words` into the subtitle provider's word-level timing structure so burned-in captions sync to the millisecond with the generated voiceover.

---

### TASK 7: Wire Cloudflare FLUX.1 [schnell] into `src/lib/providers/thumbnailProvider.ts`

Inspect `src/lib/providers/thumbnailProvider.ts`:
1. When generating a project thumbnail, allow using `@cf/black-forest-labs/flux-1-schnell` via `runCloudflareBinary('@cf/black-forest-labs/flux-1-schnell', { prompt: enhancedThumbnailPrompt, steps: 4 })`.
2. Save the resulting image buffer through `src/lib/storage/index.ts` and update the project's `thumbnail_url`.

---

### TASK 8: Upgrade Moderation, Vision QC, and Originality Radar

1. **`src/lib/video/moderationGuard.ts`:**
   - Add an optional async check using `@cf/meta/llama-guard-3-8b` when `isCloudflareConfigured()` is true, while keeping the synchronous keyword/regex rules intact so existing unit tests pass without network calls when offline.
2. **`src/lib/video/qualityControl.ts`:**
   - Add a vision QC helper using `@cf/meta/llama-3.2-11b-vision-instruct` to score generated scene frames on visual clarity, prompt relevance, and absence of garbled artifacts.
3. **`src/lib/video/originalityRadar.ts`:**
   - Add an embedding helper using `@cf/baai/bge-m3` to compute cosine similarity vectors for script originality checks.

---

### TASK 9: Update `modelRegistry.ts` & Admin UI Components

1. Inspect `src/lib/video/modelRegistry.ts`:
   - Ensure the Cloudflare visual/video models (e.g., `cloudflare-flux-motion`, `cloudflare-sdxl-lightning`) and LLM/TTS models are registered with accurate metadata (tier, cost per second/scene, capabilities, provider `'cloudflare'`).
   - Verify that `tests/wp2-model-router.test.ts` and `tests/wp3-visual-tiers.test.ts` pass without any regressions.
2. Inspect `src/components/admin/AiModelsManager.tsx`, `src/components/admin/GatewaysManager.tsx`, and `src/components/admin/IntegrationsManager.tsx`:
   - Ensure **Cloudflare Workers AI**, **Cloudflare AI Gateway**, and **Cloudflare R2** can be configured, toggled, and tested directly from the Admin Dashboard (`/admin`).
3. Inspect `src/app/api/admin/integrations/test/route.ts` and `src/app/api/admin/gateways/test/route.ts`:
   - Add a real connectivity check for Cloudflare that calls:
     `GET https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?per_page=5`
     with `Authorization: Bearer ${apiToken}` and returns `{ ok: true, latencyMs, modelsAvailable }`.

---

### TASK 10: Verify Cloudflare R2 Storage in `src/lib/storage/index.ts`

Inspect `src/lib/storage/index.ts` and `src/app/api/assets/[...key]/route.ts`:
1. Ensure that when `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME` are present, `src/lib/storage/index.ts` uses the S3 endpoint:
   `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
2. Ensure `/api/assets/[...key]/route.ts` supports byte-range (`Range: bytes=...`) streaming from R2 or redirects to `R2_PUBLIC_URL` if configured.

---

### TASK 11: Create Live Cloudflare Verification Script (`scripts/verify-cloudflare-models.ts`)

Create `scripts/verify-cloudflare-models.ts` so the developer or agent can test the live Cloudflare API token and Account ID against all integrated models from the terminal:

```typescript
// scripts/verify-cloudflare-models.ts
import { runCloudflareJson, runCloudflareBinary, getCloudflareCredentials } from '../src/lib/providers/cloudflareAiClient';

async function main() {
  const creds = getCloudflareCredentials();
  console.log('=== AUTORA Cloudflare Workers AI Verification ===');
  console.log(`Account ID: ${creds.accountId ? creds.accountId.slice(0, 6) + '...' : 'MISSING'}`);
  console.log(`Gateway ID: ${creds.gatewayId || '(Direct API)'}`);

  if (!creds.accountId || !creds.apiToken) {
    console.error('ERROR: Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in your environment.');
    process.exit(1);
  }

  // 1. Verify Token & List Models
  const searchRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/models/search?per_page=10`,
    { headers: { Authorization: `Bearer ${creds.apiToken}` } }
  );
  const searchJson = await searchRes.json();
  if (!searchRes.ok || !searchJson.success) {
    console.error('Token verification failed:', searchJson);
    process.exit(1);
  }
  console.log(`[PASS] Token verified. Sample models count: ${searchJson.result.length}`);

  // 2. Test LLM Script Generation (Llama 3.3 70B FP8 Fast)
  const llmRes = await runCloudflareJson<{ response: string }>(
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    {
      messages: [
        { role: 'system', content: 'Return JSON only: {"hook": string}' },
        { role: 'user', content: 'Give me a 1-sentence hook about AI video automation.' },
      ],
      response_format: { type: 'json_object' },
    }
  );
  console.log('[PASS] Llama 3.3 70B JSON Output:', llmRes);

  // 3. Test FLUX.1 [schnell] Keyframe Generation
  const imgBuf = await runCloudflareBinary('@cf/black-forest-labs/flux-1-schnell', {
    prompt: 'Cinematic neon cyberpunk studio, 8k, photorealistic',
    steps: 4,
  });
  console.log(`[PASS] FLUX.1 [schnell] Image Generated: ${imgBuf.byteLength} bytes`);

  // 4. Test Embeddings (BGE-M3)
  const embRes = await runCloudflareJson<{ data: number[][] }>('@cf/baai/bge-m3', {
    text: ['Autonomous video generation pipeline'],
  });
  console.log(`[PASS] BGE-M3 Embedding Dimension: ${embRes.data?.[0]?.length}`);

  console.log('=== ALL CLOUDFLARE CHECKS PASSED ===');
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
```

---

## 4. Agent Validation Checklist (Must Run Before Completing Task)

After applying the changes above, the Antigravity agent **must** run the following verification commands and confirm zero errors:

1. **TypeScript Typecheck:**
   ```bash
   npx tsc --noEmit
   ```
2. **Work Package Regression Tests (`WP0` - `WP8`):**
   ```bash
   npx tsx tests/wp0-engine-honest-failures.test.ts
   npx tsx tests/wp1-audio-first-timing.test.ts
   npx tsx tests/wp2-model-router.test.ts
   npx tsx tests/wp3-visual-tiers.test.ts
   npx tsx tests/wp4-qc-v2.test.ts
   npx tsx tests/wp6-originality-compliance.test.ts
   ```
3. **Live Cloudflare Diagnostic Check:**
   ```bash
   npx tsx scripts/verify-cloudflare-models.ts
   ```