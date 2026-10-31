# Enterprise Competitor Architecture & Pipeline Execution Ledger
Reference Spec: `new enterprise_competitor_pipeline_scripting_ux_blueprint (1).md`
Owner: Rayyan Mustafa
Status: Completed

---

## Phase 1: Strict 2-Tier Voiceover Policy & Catalog (`voiceProvider.ts`) [SEQUENTIAL]
- [x] 1.1 Remove OpenAI TTS from customer-facing catalog; introduce `TILLERCAST_VOICE_CATALOG` with Free (Cloudflare Deepgram Aura-2) and Paid (ElevenLabs + Custom Cloned) tiers.
- [x] 1.2 Include static 5-second audio preview URLs (`/sample.mp3` or voice preview endpoints) for Pro ElevenLabs samples in UI catalog.
- [x] 1.3 Implement automatic tier guard in `voiceProvider.ts`: auto-downgrade free tier requests to Aura-2 (`@cf/deepgram/aura-2-en`) or return 402 upgrade required.
- [x] 1.4 Wire ElevenLabs synthesis with `eleven_turbo_v2_5` settings (`stability: 0.45`, `similarity_boost: 0.80`, `style: 0.35`, `use_speaker_boost: true`).
- [x] **Verification Gate**: `tests/phase1-voice-policy.test.ts` (PASS), `npx tsx tests/wp2-model-router.test.ts` (PASS), & `npx tsc --noEmit` (PASS).

---

## Phase 2: 3-Stage "Split-Brain" Viral Scripting Pipeline [SEQUENTIAL, Depends on Phase 1]
- [x] 2.1 **Stage 1 (Viral Narrative & Hook Writer)**: Free tier $\to$ Cloudflare Llama 3.3 70B; Paid tier $\to$ Frontier LLM via CF AI Gateway. Enforce short-form retention prompt rules (3-second curiosity gap hook $<18$ words, 6th grade reading level, retention micro-cliffhangers every 15s, ban AI slop words: delve/tapestry/beacon/etc., pacing pause markers).
- [x] 2.2 **Stage 2 (Visual Beat Splitter & Character Consistency Director)**: 100% Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`). Enforce 3-second pacing rule (Scenes 1-2: 6-9 words, 2.0-3.0s; subsequent scenes: 9-15 words, 3.0-4.5s). Extract & programmatically prepend `characterAnchor` and `styleAnchor` across all recurring scenes. Alternating non-repeating `cameraMotion`.
- [x] 2.3 **Stage 3 (Pre-flight Safety & Originality Check)**: Wire `@cf/meta/llama-guard-3-8b` and `@cf/baai/bge-m3` in pre-render pipeline.
- [x] **Verification Gate**: `tests/phase2-split-brain-pipeline.test.ts` (PASS), `npx tsx tests/wp1-audio-first-timing.test.ts` (PASS), `npx tsx tests/wp8-prompt-to-plan.test.ts` (PASS), & `npx tsc --noEmit` (PASS).

---

## Phase 3: Outcome-Based Creator UX & Per-Scene Hybrid Upgrades [Depends on Phase 2]
- [x] 3.1 Replace developer model dropdowns in `src/app/content/new/page.tsx` with 3 Creator Selectors:
  - 1. Storytelling Format (Viral Documentary, True Crime, Reddit Story, Business, Stoic History).
  - 2. Visual Style Preset (Dark Cinematic 8K, Hyper-Realistic Film, 3D Pixar, Graphic Novel, Dark Anime).
  - 3. Visual Motion Engine Tier (Tillercast Flash Motion [1x], Cinema AI Video [3x Pro], Hollywood Director [5x Pro]).
- [x] 3.2 Implement Per-Scene Hybrid Upgrade in `src/app/content/[id]/page.tsx` & `/api/projects/[id]/scenes/[sceneId]/swap/route.ts` to allow 1-click upgrade of individual scenes from Flash Motion to AI Video.
- [x] **Verification Gate**: Typecheck & Scene Editor unit test (`npx tsx tests/wp5-scene-editor.test.ts`).

---

## Phase 4: Free Demo Conversion Guards, Watermark & Export Locks [Depends on Phase 1 & 2]
- [x] 4.1 Enforce Free Demo limits in `src/app/api/projects/route.ts` & `billing.ts` (1 demo video, max 45s / 8 scenes, 100% Cloudflare stack).
- [x] 4.2 Add `"Created with Tillercast.ai"` corner watermark overlay for `free` tier in `ffmpegCompositor.ts`.
- [x] 4.3 Gate 1080p unwatermarked export & direct social publishing behind Paid Plan with `UPGRADE_REQUIRED` modal trigger.
- [x] **Verification Gate**: `npx tsx tests/module-1-security-pricing.test.ts`, `npx tsx tests/module-2-auto-refund.test.ts`.

---

## Phase 5: End-to-End Regression & Quality Gates [Final]
- [x] 5.1 Run all Work Package tests: WP0, WP1, WP2, WP3, WP4, WP5, WP6, WP8.
- [x] 5.2 Run Module 1, 2, 3 tests.
- [x] 5.3 `npx tsc --noEmit` zero error validation.
- [x] 5.4 Atomic Git commit & release log.
