# AUTORA — Market Gap Analysis & Video Engine Upgrade Plan

Prepared: 2026-10-21 · Repo: `rayyan-mustafa/SAAS-Video-automation` @ `e0140bb` (main)
Audience: Antigravity (coding agent). Read §0 first, then execute work packages in order.

---

## 0. Operating rules for the agent

1. **Plan first.** Use Planning mode. Produce an implementation plan per work package (WP) and wait for approval before editing code.
2. **One WP = one branch** (`fix/…` or `feat/…`), small PRs (<400 lines where possible), Conventional Commits with the scopes defined in `agents.md` (`pipeline`, `video`, `billing`, `publishing`, `qa`, `ci`, …).
3. **Do not start WP N+1 until WP N's acceptance tests pass.** Paste test output into the PR.
4. **Never invent facts about provider APIs or prices.** Prices and model endpoint IDs in this file are research snapshots from Oct 2026 and sources disagree. At implementation time, verify against the provider's own pricing/docs page and record the URL + date in the registry (WP2).
5. **No fake success.** Any code path that returns a placeholder file, silent fallback, or zero-byte asset and marks the job successful is a bug (see E1).
6. Things this plan marks **UNVERIFIED** were not read or run. Verify before relying on them.
7. Do not rewrite or force-push history. Do not commit secrets.

---

## 1. Bottom line

- **The market is converging on three things:** (a) many generative models behind one subscription (InVideo claims 200+, Revid 100+, Higgsfield 30+), (b) an *agent* that turns one prompt into an editable draft, and (c) *editable* output, so users fix a scene instead of re-rolling the whole video. AUTORA has a decent pipeline but none of (b) or (c), and a thin slice of (a).
- **The incumbents' biggest weakness is credit opacity.** Review pages for InVideo, Revid and others are full of users who burned credits on failed or unusable renders and were refused refunds. AUTORA already has the right idea (cost preview, auto-refund), but the engine does not actually deliver it (see E1, E8).
- **The video engine's real problems are not missing models.** They are: silent fake-success fallbacks, narration/caption timing computed from estimates, strictly sequential rendering, QC that mostly scores prompt text, no cost metering, and a first-key-wins router that can pick the most expensive model.
- **Unit economics break if "real AI video" is the default.** At $49 / 30 videos, revenue is ~$1.63/video; a 60 s video made entirely of AI clips costs $3–$15 on current API prices. The product must be **hybrid** (AI clips for the hook and key beats, motion stills/stock elsewhere) with a per-plan AI-seconds budget (§6).
- **Positioning (commit to this):** *"The channel-automation engine that shows the price before it renders, refunds what fails, and keeps your channel out of YouTube's mass-production bucket."* Do not try to out-aggregate InVideo or out-avatar HeyGen.

---

## 2. What the market is doing (Oct 2026)

| Tool | What it sells | Entry price (sources disagree; annual vs monthly) | Edge | Weak spot |
|---|---|---|---|---|
| **InVideo AI** | Prompt → edit-ready video via an agent; 200+ bundled models (Veo 3.1, Kling 3.0, Seedance 2.0, etc.); new AI **Editor** (launched Sep 1, 2026) that hands every AI choice back as an editable clip | ~$17–28 Plus; ~$50–85 Max; ~$100–170 Generative | Breadth, editor, brand | Credits burn on failed/retried renders, don't roll over, refunds disputed. Trustpilot roughly 2–3.2/5 depending on which InVideo page |
| **Revid.ai** | Faceless short-form, **Auto-Mode workers** (scheduled daily generation + auto-post to TikTok/IG/YT), 100+ AI tools, public REST API + MCP server + CLI, 3M+ viral-video remix library | $39 → $199 | Automation + dev surface | Credit math: ~15 credits per 5 s base clip, ~60 for pro model; reviewers say real cost is ~2× the sticker |
| **Opus Clip** | Long video → captioned vertical clips, virality score, scheduler to 9 platforms | $15 / $29 | Cheap, focused | Needs source footage; not generation |
| **HeyGen** | Avatars (1,100+), 175+ languages, dubbing, Video Agent | ~$24–29+ | Best-in-class avatars/localization | Not a faceless-channel factory |
| **Pictory / Fliki** | Blog/article → video, strong voices | ~$19–29 | Repurposing, voice quality | Template look |
| **Higgsfield** | 30+ models in one credit pool, Marketing Studio (1,500+ templates); raised at $1.3B valuation (Jan 2026) | ~$15–19 | Model access + ad templates | Ad-focused |

### What the winners do right
1. **Model aggregation as the product** — users want Veo/Kling/Seedance-class output without managing keys.
2. **Agentic drafting** — one prompt → a complete, editable first cut.
3. **Editable output** — timeline/scene control after generation (InVideo Editor, Revid timeline, Opus editor).
4. **Built-in distribution** — auto-post/scheduling (Revid Auto-Mode, Opus scheduler).
5. **Developer surfaces** — API/MCP/CLI (Revid).

### What the market does wrong (AUTORA's opening)
1. **Opaque credits, no real refunds** — the loudest theme across InVideo, Revid, Fliki, Pictory reviews.
2. **Templated, repetitive output** — exactly what YouTube's *inauthentic content* policy targets (mass-produced / templated / "generic AI template" content is non-monetizable). Faceless and AI are *not* banned; sameness is.
3. **No compliance tooling** — AI-disclosure, originality warnings, platform audit status.

---

## 3. AUTORA vs market (verified from code unless marked)

| Capability | Market standard | AUTORA today | Verdict |
|---|---|---|---|
| Prompt → script → scenes → voice → render → thumbnail | Yes | 7-stage worker (`SCRIPT, SCENES, VIDEO, VOICE, SUBTITLES, FINAL_VIDEO, THUMBNAIL`) | **Have** |
| Real generative clips | Default | Cascade exists; output depends on which keys are set; stale model list | **Partial** |
| Model breadth | 30–200 | OpenAI(dead), Veo, Runway, Luma, FAL (Wan 2.1 / Kling 1.5 / LTX), Cloudflare Hailuo | **Partial / stale** |
| Cost control & transparency | Per-credit (opaque) | Cost-preview API exists; telemetry `cost: 'UNAVAILABLE'`; no budget cap | **Missing** |
| Caption timing | Word-level, animated | Cues built from scene *estimates* | **Broken** |
| Post-generation editing | Scene/timeline editor | Project retry/re-render only | **Missing** |
| Render speed | Parallel | Sequential scenes, sequential sub-clips | **Slow** |
| Quality control | Mostly human re-roll | 8-check QC, 6 checks score prompt text | **Weak** |
| Failure handling | Credits lost | Auto-refund only on *thrown* stage errors | **Partial** |
| Multi-platform publish | YT/TikTok/IG | Providers exist for YT/TikTok/IG/FB; scheduling is YouTube-only | **Partial** |
| Competitor intel / own-channel loop | Syllaby/VidIQ-style | API dirs + commits present (`/api/competitors`, `/api/analytics`) — **UNVERIFIED functionally** | **Present, unverified** |
| Avatars | HeyGen/Synthesia | `avatarProvider.ts` external call is a stub that always returns `false` | **Stub** |
| Repurposing long→short | Opus Clip | None | **Missing** |

### Already fixed since the Oct 13 audit
- `api/admin/auth/route.ts` no longer has fallback credentials, fails closed (503) if env missing, rate-limits login (5 per 5 min), uses timing-safe compares.
- History compacted to 22 commits; CI workflows (`ci.yml`, `cd.yml`, `check-upstream.yml`) exist.
- Instagram/TikTok/Facebook providers and competitor/analytics API directories exist.

---

## 4. Engine findings (file-level)

Severity: **C** critical, **H** high, **M** medium, **L** low.

**E1 (C) Fake success paths.**
- `src/lib/providers/videoProvider.ts` (end of `generateVideoClip`): if every tier fails it copies a hot-linked Coverr sample or writes a 32-byte "minimal MP4 header" and returns normally.
- `src/lib/queue/worker.ts`, `FINAL_VIDEO`: if no clips exist it fabricates a clip (same header); if no audio it writes `Buffer.alloc(2048, 0)`.
- `worker.ts`, `VIDEO`: a scene error is caught with "continuing pipeline with fallback"; a scene with zero clips is silently skipped.
- Effect: project reaches `COMPLETED`, customer is charged, refund never fires (refund only runs when a stage *throws*). The "zero-waste" promise is false for the most common failure mode.

**E2 (H) Timing order bug.** `PIPELINE_STAGES` runs `SCENES` and `VIDEO` *before* `VOICE`. `SCENES` calibrates durations to actual audio length, but on a first run no audio exists, so it falls back to `target_length_minutes * 60`. `SUBTITLES` builds cues from scene estimates, and `FINAL_VIDEO` trims to real audio duration → captions, visuals and narration drift apart.

**E3 (H) Recorded vs actual clip duration.** `generateVideoClipsForScene` stores the *planned* `durationSec`; it never probes the file. In `falVideoProvider.ts` Wan requests are capped at `num_frames = 81` at 16 fps (~5 s) even when 8 s is requested, and the result reports `targetDuration`. Timeline math uses the wrong numbers.

**E4 (H) Strictly sequential rendering.** Scenes loop with `await`, sub-clips loop with `await`, each FAL attempt polls up to 240 s and tries up to 3 models (worst case ~12 min *per clip*). Worker `maxConcurrency = 2` projects and the waiting queue is in-memory (lost on restart).

**E5 (H) Retries multiply cost.** QC loop runs up to 2 attempts and each attempt regenerates *all* sub-clips of the scene; the `VIDEO` stage deletes all clip rows on retry and regenerates everything. On a paid model that is 2–N× spend.

**E6 (H) QC does not gate and mostly isn't QC.** In `video/qualityControl.ts`, six of eight checks are string heuristics on the *prompt* (keyword overlap, "mentions cinematic", "contains 'dramatic'"). Vision runs on **one frame at t = 1 s**, only if a Gemini key exists. After max attempts a failed clip is still used. The "procedural fallback" detector is a JPEG-size threshold (<50 KB).

**E7 (H) Stale and dead models.** FAL provider is hard-coded to `wan/v2.1`, `kling-video/v1.5/pro`, `ltx-video/v0.9.7`. No Kling 3.0, Seedance 2.0, Veo 3.1 Lite/Fast tiering, Hailuo 2.3 via FAL, or newer Wan. The OpenAI/Sora provider is tried **first** in `generateVideoClip` although Sora is shut down / API sunset (sources give March 2026 and Sept 24 2026).

**E8 (H) Router is first-configured-wins with no cost awareness.** Order: OpenAI → Veo → Runway → Luma → FAL → Cloudflare. Whatever key is set first is used for every clip, regardless of price or scene importance. `telemetry.cost` is the literal string `'UNAVAILABLE'`; `providerUsed` reports configuration priority, not the provider that actually rendered each clip.

**E9 (M/H) Safety, legal, build hygiene.**
- `falVideoProvider.ts` sets `enable_safety_checker = false` for Wan.
- Coverr hot-link fallback (license forbids offering its videos as part of a service); Pollinations is a free third-party image endpoint with unverified commercial terms.
- `next.config.js` still has `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`; CSP allows `unsafe-eval`/`unsafe-inline`. Any "0 errors / production ready" claim is unsupported until these are off.

**E10 (M) Publishing realism.**
- `publishingProvider.ts` always sends TikTok `privacyLevel: 'PUBLIC_TO_EVERYONE'`. TikTok's Direct Post restricts **unaudited** clients to private posts and 5 posting users per 24 h; guidelines also require fetching creator info and offering commercial-content disclosure.
- Instagram needs a **public HTTPS** `video_url`; `storage.getUrl()` with local storage likely returns an app-relative path. Meta app review is reported at 2–4 weeks and API Reels reportedly cap at ~90 s (secondary sources — verify in current docs).
- Only YouTube implements `scheduleVideo`; other platforms return "not configured".

**E11 (L) Avatars are a stub** (`avatarProvider.ts`: external path returns `false`).

**E12 (M) Claims drift.** README "Production Ready" badge; credit/quota numbers differ across docs (README/agents.md: 100 / 250 credits; master plan: 750 / 2,250 credits; gap analysis: 25 credits per video, 30/90 videos); license switched BSL → proprietary within one day; README asserts sole IP ownership (see §8 item 1).

**Not re-verified since Oct 13 (UNVERIFIED):** `src/middleware.ts` (allowed every path), `lib/security/adminAuth.ts` signing-secret fallback, `oauth-state.ts` fallback secrets, `youtubeProvider.ts` AI-disclosure flag, `voiceProvider.ts` (Edge TTS vs Azure), `ffmpegCompositor.ts`, Veo/Runway/Luma/Cloudflare providers, all tests, and whether `tsc` passes.

---

## 5. Strategy

**Build**
1. Honest failure + refund semantics (WP0).
2. Audio-first timing and word-level captions (WP1) — the most visible quality gain per hour of work.
3. Model registry + cost-aware router + cost ledger (WP2).
4. Hybrid planner, parallel/resumable rendering (WP3).
5. Real QC (WP4).
6. Scene editor-lite (WP5) — closes the biggest competitive gap without building a full timeline editor.
7. Publishing hardening + compliance toggles (WP6).

**Do not build (for the sale window)**
- A 100-model aggregator, avatar studio, multi-language dubbing, template marketplace, or full timeline editor. Incumbents own these and each is weeks of work with little sale value.
- Long→short repurposing (Opus Clip territory) — list as post-sale roadmap only.

**Pricing/credits (decision needed, recommendation given):** one model across all docs — fixed credits per baseline video (stills + voice), AI-clip upgrades priced in extra credits shown *before* spend, failed/degraded scenes refunded proportionally in the ledger. Pro at $99 / 90 videos yields only ~$1.10 per video, below Creator's ~$1.63; recommend **Pro = 60 videos** (~$1.65/video) or a proportionally smaller AI budget.

---

## 6. Unit economics (use to set `aiClipBudgetSec`)

API price snapshots (per generated second; **verify at build time**, sources conflict):

| Route | $/sec | Note |
|---|---|---|
| Veo 3.1 Lite (720p) | ~0.05 | Google pricing per Aug 2026 summary |
| Veo 3.1 Fast (720p) | ~0.10 | |
| Veo 3.1 standard | ~0.40 | Do not route here by default |
| Kling 3.0 | ~0.03 on fal (one source) vs ~0.084–0.168 official | Wide spread — verify |
| Seedance 2.0 on fal | ~0.30 std / ~0.24 fast | 720p ceiling on fal |

Formula: `aiBudgetSec = (revenuePerVideo × (1 − targetMargin) − nonAiCost) / usdPerSec`, with `nonAiCost ≈ $0.10` (voice, stills, storage, compute — measure it in WP2).

At **60% target gross margin**:

| Plan | Revenue / video | COGS budget (after $0.10 non-AI) | AI seconds @ $0.05 | @ $0.10 | @ $0.24 |
|---|---|---|---|---|---|
| Creator $49 / 30 | $1.63 | ~$0.55 | ~11 s | ~5.5 s | ~2.3 s |
| Pro $99 / 90 (as documented) | $1.10 | ~$0.34 | ~6.8 s | ~3.4 s | ~1.4 s |
| Pro $99 / 60 (recommended) | $1.65 | ~$0.56 | ~11 s | ~5.6 s | ~2.3 s |

A fully-AI 60 s video costs ~$3.00 at $0.05/s, ~$6 at $0.10/s, ~$14.40 at $0.24/s. The master plan's COGS ($0.20–0.40 per clip) only holds for the cheapest route with 5 s clips. **Therefore: hook scene + 1–2 peak scenes get AI clips; everything else is motion-still or licensed stock.**

---

## 7. Work packages

### WP0 — Stop fake success (1–2 days) · branch `fix/engine-honest-failures`
1. Delete the "minimal MP4 header" and zero-byte-audio fallbacks in `videoProvider.ts` and `worker.ts` (`FINAL_VIDEO`). Throw a typed `EngineError` (`NO_VALID_CLIPS`, `NO_VALID_AUDIO`).
2. Add per-scene `deliveredTier` (`ai_clip | motion_still | stock | procedural`). `procedural` must never ship: treat as scene failure. Define *degraded* = delivered tier lower than planner-assigned tier. Refund `ceil(creditsCharged × degradedScenes / totalScenes)` with a ledger line per degraded scene.
3. `VIDEO` stage: a scene with zero valid clips fails the stage (→ existing refund path), not skipped.
4. Remove OpenAI/Sora from the cascade and admin key list (keep file behind `ENABLE_LEGACY_SORA=0` default off, or delete).
5. `falVideoProvider.ts`: `enable_safety_checker: true`.
6. Remove the Coverr hot-link; gate Pollinations behind `ALLOW_POLLINATIONS=1` (default off); review `stockVideoProvider.ts` against Pexels/Pixabay terms.
7. `next.config.js`: set both ignore flags to `false`; fix resulting errors; confirm `ci.yml` runs `typecheck` + `build`.
8. Probe every produced clip with `inspectMedia` and store **actual** duration (fixes E3).
- **Acceptance:** (a) mocked run where all providers throw → project `FAILED` + exactly one `REFUND` row; (b) a procedural frame is never present in a `COMPLETED` project; (c) deliberate type error fails `npm run build`; (d) stored clip duration equals ffprobe duration ±0.1 s.

### WP1 — Audio-first timing & word-level captions (3–4 days) · `feat/audio-first-timing`
1. New order: `SCRIPT → VOICE → SCENES → VIDEO → SUBTITLES → FINAL_VIDEO → THUMBNAIL`.
2. Generate narration **per scene/paragraph segment** (store `scene_audio` rows). Exact segment durations replace estimates; this also enables per-scene edits (WP5). Verify prosody at segment joins; group by sentence boundaries.
3. Word timings: use provider alignment/word-boundary events when available; otherwise forced alignment on the server (faster-whisper / whisper.cpp, small model). Store `words_json`.
4. `subtitleProvider.ts`: ASS output with word-highlight (karaoke) styling, 3 presets, platform safe zones for 9:16.
5. Compositor consumes segment durations; clips trimmed/looped to segment length.
- **Acceptance:** on 3 test narrations caption word starts are within ±120 ms of alignment output; final video duration = audio duration ±0.3 s; no scene duration derives from an LLM estimate.

### WP2 — Model registry, router, cost ledger (4–5 days) · `feat/model-router`
1. `src/lib/video/modelRegistry.ts`: entries `{id, provider, endpoint, maxDurationSec, resolutions, aspectRatios, nativeAudio, i2v, usdPerSec, pricedAt, priceSourceUrl}`. Seed with Veo 3.1 Lite/Fast, Kling 3.0, Seedance 2.0 Fast, Hailuo 2.3, current Wan on fal. **Verify endpoint IDs and prices on fal.ai / provider docs first.**
2. `src/lib/video/router.ts`: `pickModels({planTier, remainingBudgetUsd, sceneImportance, needI2V, aspect})` → ordered candidates by cost/quality; per-provider circuit breaker (3 failures / 10 min → skip 15 min).
3. Cost ledger: write `cost_usd` and `provider`/`model` per clip into `generated_assets.metadata_json`; replace `telemetry.cost: 'UNAVAILABLE'` with the real sum; `providerUsed` = per-clip actual.
4. `billing.ts`: `aiClipBudgetSec(plan)` from §6 formula; hard stop → remaining scenes use `motion_still`.
5. Refactor `falVideoProvider.ts` to use the registry (no hard-coded model strings); keep Veo/Runway/Luma behind flags, default off.
6. Admin view: COGS/video, p50/p95 render time, fallback rate, per-provider failure rate.
- **Acceptance:** router unit tests (budget exhausted → `motion_still`; failing provider → next; cost recorded); report of COGS for 10 mocked projects; no project exceeds its plan AI budget across 20 randomized runs.

### WP3 — Hybrid planner, parallel + resumable render (4–5 days) · `feat/hybrid-planner`
1. `SCENES` output adds `visualTier` and `importance` (hook, reveals, key numbers). Planner assigns AI-clip tier within the WP2 budget.
2. Bounded parallelism: per-project pool (start at 3) with per-provider caps; make worker concurrency configurable; persist the waiting queue in SQLite so restarts don't lose jobs.
3. Idempotent per-scene cache keyed by `hash(prompt, model, aspect, seed)`; retry skips completed scenes. QC retry: 1 for paid AI clips, 2 for stills; each retry cost shown in ledger.
4. Provider timeouts: single model attempt ≤ 120 s on short clips; overall scene deadline; no 3×240 s stacking.
- **Acceptance:** record sequential baseline first; 3-minute 16:9 benchmark renders ≥2.5× faster; retrying one scene re-generates only that scene; server restart mid-render resumes.

### WP4 — Real QC (3 days) · `feat/qc-v2`
1. ffprobe/ffmpeg gates: duration tolerance, resolution/aspect, `blackdetect`, `freezedetect`, audio stream presence.
2. Vision check on **3 frames** (start, middle, end−0.5 s) with a current Gemini Flash model; strict JSON schema; fail closed if vision is configured but errors twice.
3. Remove prompt-string heuristics from the score (keep as prompt lint only).
4. Gate: fail → regenerate once per WP3 policy → lower tier → flagged `degraded` (WP0.2). QC never passes a clip it cannot verify.
- **Acceptance:** golden set of 20 clips (10 good; 10 bad: black, frozen, wrong aspect, glitch, procedural) classified ≥90% correctly; QC cannot pass procedural frames.

### WP5 — Scene editor-lite (1–2 weeks) · `feat/scene-editor`
Project page scene list with thumbnail, narration, duration. Actions: regenerate visual (choose tier; **exact price shown before spend**), swap to still/stock, upload own clip, edit narration (re-TTS that segment only), reorder, delete, re-compose without touching other scenes. API: `POST /api/projects/:id/scenes/:sceneId/regenerate` (and `/narration`, `/reorder`).
- **Acceptance:** editing one scene's narration re-renders only that segment + compose; previewed credits equal charged credits exactly; ledger shows every action.

### WP6 — Publishing hardening & compliance (≈1 week + external waits) · `feat/publishing-hardening`
1. **TikTok:** call creator-info endpoint, derive allowed `privacy_level` from it, add commercial-content disclosure toggle, UI banner "private-only until TikTok audit"; submit the audit.
2. **Instagram:** fail early unless `video_url` is public HTTPS (require R2 public/signed URL); enforce API duration limit after checking current docs; start Meta app review.
3. Scheduling for non-YouTube platforms through the in-app scheduler at publish time.
4. **YouTube:** `status.containsSyntheticMedia` toggle (default on for photoreal AI scenes) and per-channel made-for-kids (currently hard-coded false per the Oct 13 audit — verify); keep the AI-disclosure choice visible in UI.
5. Pre-publish originality check: warn when the last N uploads share structure/hook/title patterns; confirm the 5 narrative frameworks actually rotate.
6. Remove "guarantee monetization/approval" language from blog posts and marketing.
- **Acceptance:** unaudited TikTok app posts succeed as private and UI says so; Instagram publish refuses non-public URLs with a clear error; scheduled IG/TikTok post fires at the right time in a test.

### WP7 — Proof assets for the sale (parallel, 2–3 days)
Honest README (drop "Production Ready"/"0 errors" until true); one credit/pricing model in all docs; one license text; public benchmark of render time and COGS from the ledger; screenshot of a refunded failure; a demo channel produced end-to-end by the tool (10 videos) and a 3-minute walkthrough. Buyers with no MRR price code quality and evidence.

### WP8 — Prompt-to-plan with approval gate (≈1 week, after WP1–WP3) · `feat/prompt-to-plan`
Goal: "one prompt → finished video" without blind spending. Do **not** build an open-ended tool-using agent.
1. New stage `PLAN` before `SCRIPT`: user enters one description + chips (length, aspect ratio, voice, AI-clip budget). LLM returns a structured plan: hook, outline, scene list with `visualTier` and `importance` per scene (reuses WP3 planner).
2. **Storyboard preview:** generate cheap still previews per scene (image model, cents total) + show the **exact credit price and the visual mix** (e.g. "3 AI clips · 9 motion stills · 2 stock"). Nothing expensive renders until the user approves.
3. Per-scene override before approval: change tier, edit narration, regenerate preview.
4. After render, revision by instruction ("make the hook punchier", "scene 3 more dramatic"): the LLM edits the structured plan, only changed scenes re-render (depends on WP5). Preview price shown first.
- **Acceptance:** no paid clip call happens before approval (assert in test); displayed price equals charged price; a one-scene revision re-renders only that scene.

### Visual mix control (applies to WP2/WP3/WP8)
Every scene is assigned exactly one tier, recorded in the DB and shown to the user:
| Tier | Source | Relative cost | Use for |
|---|---|---|---|
| `ai_clip` | Generative video (Veo/Kling/Seedance via router) | highest | hook, reveals, key beats |
| `motion_still` | AI image + camera motion (FFmpeg) | low | most explanatory scenes |
| `stock` | Licensed stock (only where license allows SaaS use) | low | generic B-roll |
| `graphic` | Text/number/diagram card rendered locally | ~free | stats, lists, comparisons |
| `upload` | User's own clip/image | free | brand/product shots |
Rules: planner fills tiers within the plan's AI-seconds budget (§6); never ship the same tier for more than 3 consecutive scenes without a variation; the user always sees the mix and can override per scene. Competitors' exact internal mix is not public (inferred from pricing pages: stock-only "Autopilot" modes vs generative models billed per second), so treat this table as AUTORA's own design.

### Suggested schedule
- **Day 1:** start external waits in parallel — YouTube API audit/quota extension, TikTok audit, Meta app review.
- **Week 1:** WP0, start WP1. **Week 2:** WP1, WP2. **Week 3:** WP3, WP4. **Weeks 4–5:** WP5; WP6 and WP7 in parallel. **Week 6:** WP8.
- **Before any build:** render 10 videos in AUTORA and 10 in InVideo from identical prompts and compare blind; this decides whether to fix the engine or rethink the product.

---

## 8. Human decisions & blockers (not for the agent)

1. **Ownership.** README/LICENSE state sole IP ownership by Rayyan Mustafa; the arrangement behind this codebase is a 50/50 partnership and the code came from a shared repo (`.upstream-sync.json` tracks an upstream). Put the ownership/transfer terms in writing before listing; due diligence will ask, and the license history (BSL → proprietary in a day) will be noticed.
2. **Budget for real-provider tests** (small, but WP2–WP4 need live clips for the golden set).
3. **Pricing model**: approve §5 (Pro 60 videos or reduced AI budget).
4. **External approvals** start now; lead times are theirs, not ours.

## 9. Not verified / limits of this research

- Competitor prices differ widely across review sites (annual vs monthly; configurable tiers). Treat ranges as indicative.
- InVideo's ARR (~$70M) and "200+ models" come from review sites, not company filings.
- API price spreads for Kling 3.0 (~$0.03 vs ~$0.11+/s) are unresolved.
- Instagram 90 s API cap and 2–4 week Meta review time are from secondary guides.
- EU AI Act Article 50 disclosure (from Aug 2, 2026) comes from a secondary summary; get legal confirmation before marketing around it.
- Reddit/G2 threads were not read in this pass; complaint evidence is Trustpilot/Capterra plus the Oct 13 gap analysis in the repo.
- Code was read via GitHub, not run. No build, typecheck, or tests were executed.

## 10. Sources

Repo (read directly): `README.md`, `agents.md`, `AUTORA gap analysis code audit, market and user pain points.md`, `AUTORA_SAAS_MASTER_PLAN.md`, `FINAL_SALE_READINESS_REPORT.md`, `next.config.js`, `src/lib/providers/{videoProvider,falVideoProvider,publishingProvider,avatarProvider,video-provider.types}.ts`, `src/lib/queue/worker.ts`, `src/lib/video/qualityControl.ts`, `src/app/api/admin/auth/route.ts`, commit log (22 commits, latest `e0140bb`).

Market and platform:
- InVideo review/pricing: https://fast.io/resources/invideo-ai-review-2026/ · https://www.capterra.com/p/180680/InVideo/ · https://maxaeo.ai/ai-tools/tool/invideo-ai/ · https://v4v.ai/blog/invideo-pricing-2026/ · https://yespress.io/invideo-ai
- InVideo complaints: https://au.trustpilot.com/review/ai.invideo.io?page=2 · https://ie.trustpilot.com/review/invideo.io?page=2 · https://bestllmfor.com/tool-reviews/invideo-ai/
- Revid: https://www.softwareadvice.com/product/520978-revid-ai/ · https://www.pasivemarketer.com/revid-ai-review
- Opus Clip: https://quso.ai/blog/opus-clip-review · Higgsfield: https://en.wikipedia.org/wiki/Higgsfield_AI
- Landscape: https://www.heygen.com/blog/best-ai-video-generators-tested-and-reviewed · https://fliki.ai/blog/best-ai-video-generators · https://zapier.com/blog/best-ai-video-generator/
- Video API pricing: https://invideo.io/blog/ai-video-model-pricing · https://fal.ai/learn/tools/seedance-2-0-vs-kling-3-0 · https://techsy.io/en/blog/best-ai-video-providers · https://higgsfield.ai/blog/seedance-2-0-pricing-2026
- YouTube policy commentary: https://synthesys.io/blog/faceless-youtube-channel/ · https://nofacetube.com/guides/youtube-inauthentic-content-policy/ (official policy page: https://support.google.com/youtube/answer/1311392, as opened in the repo's Oct 13 analysis)
- TikTok: https://developers.tiktok.com/doc/content-sharing-guidelines · Instagram: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing · https://postproxy.dev/blog/instagram-reels-api-publishing-guide/
- Antigravity conventions: https://dev.to/blamsa0mine/google-antigravity-public-preview-what-it-is-how-it-works-and-what-the-limits-really-mean-4pe
