# CLAUDE.md — AutoVideo SaaS Developer & AI Assistant Guide

> **Project:** AutoVideo SaaS (v2.1.0)  
> **Repository:** `youtube-automation-`  
> **Core Purpose:** Autonomous AI-native video generation & YouTube automation studio. Transforms topics/niches into fully animated, captioned, voiced, and rendered 9:16 vertical shorts (TikTok, YouTube Shorts, Reels) and horizontal videos using FFmpeg, OpenRouter/DeepSeek, Cloudflare Flux 1 Schnell, and neural TTS.

---

## 1. Quick Reference Commands

### Development & Server
```bash
npm install              # Install dependencies
npm run dev              # Start Next.js development server (default: port 3000)
npm run build            # Compile TypeScript & production Next.js bundle
npm run start            # Start Next.js in production mode
```

### Background Processing
```bash
npm run scheduler        # Start background job queue scheduler (scripts/run-scheduler.ts)
npm run worker           # Alias for job scheduler & queue worker
```

### Testing & Audits
```bash
npm test                 # Run end-to-end browser & API QA suite (test-final-browser-qa.ts)
npm run test:youtube     # Run YouTube Data API v3 integration tests (test-youtube-integration.ts)
npm run test:audit       # Run master production audit suite (test-final-production-audit.ts)
```

---

## 2. Tech Stack & Core Libraries

- **Framework:** Next.js 14.2 (App Router), React 18, TypeScript 5.9 (CommonJS output)
- **Database:** SQLite in WAL mode via `better-sqlite3` (`data/app.db`)
- **Video Compositor:** `@ffmpeg-installer/ffmpeg` + native FFmpeg subprocess compositor (H.264, zoompan, color grading, audio muxing)
- **Voice / TTS:** `msedge-tts` (Microsoft Edge neural voices), ElevenLabs API, synthetic PCM fallback
- **AI Text / Scripting:** OpenRouter (`deepseek/deepseek-chat`), Google Gemini, OpenAI
- **AI Visuals / Stills:** Cloudflare Workers AI (`@cf/black-forest-labs/flux-1-schnell`), Pexels, Pixabay
- **YouTube Publishing:** Official YouTube Data API v3 via Google OAuth 2.0 (offline tokens)
- **Billing / Credits:** Stripe SDK (`stripe`) with webhooks and credit ledger system
- **Storage:** Local filesystem (`./storage`) with Cloudflare R2 / AWS S3 compatibility (`@aws-sdk/client-s3`)

---

## 3. Repository Architecture

```text
youtube-automation-/
├── src/
│   ├── app/                    # Next.js App Router (pages & API routes)
│   │   ├── (auth)/             # Login, signup, onboarding, password reset
│   │   ├── admin/              # Admin dashboard, user management, API keys
│   │   ├── api/
│   │   │   ├── assets/         # Protected asset-serving endpoint ([...key])
│   │   │   ├── auth/           # OAuth callbacks (YouTube, Google) & sessions
│   │   │   ├── billing/        # Stripe checkout & webhooks
│   │   │   ├── customer/       # Customer auth (login, register, logout, me)
│   │   │   ├── health/         # System health check & provider status
│   │   │   ├── projects/       # Project CRUD, stage retry, scene regeneration
│   │   │   └── youtube/        # Channel connection, upload, scheduling
│   │   ├── channels/           # Multi-channel management UI
│   │   ├── content/            # Video projects list, creation wizard, studio detail (/content/[id])
│   │   └── studio/             # Video editor & timeline inspector
│   ├── components/             # Shared UI components (Navigation, Studio, Video Player, Stepper)
│   ├── lib/
│   │   ├── auth/               # Multi-tenant auth, scrypt hashing, signed session tokens
│   │   ├── billing.ts          # Stripe plans, checkout sessions, credit ledger
│   │   ├── config/             # App & provider configuration
│   │   ├── db/                 # SQLite connection, migrations, prepared queries (index.ts)
│   │   ├── providers/          # AI providers (aiProvider.ts), video, voice, subtitles
│   │   ├── queue/              # D1/SQLite background job queue & task runner
│   │   ├── scheduler/          # Automated content publishing scheduler
│   │   ├── security/           # Path traversal sanitizers, rate limiters, RBAC guards
│   │   ├── storage/            # Local storage provider & S3/R2 client wrapper
│   │   └── video/              # FFmpeg pipeline, visual styles, camera motion, quality control
│   └── middleware.ts           # Route middleware for public & protected paths
├── data/                       # SQLite database file (app.db) and logs
├── storage/                    # Local media storage (scripts, audio, clips, final MP4s)
├── scripts/                    # CLI scripts (run-scheduler.ts, db migration helpers)
└── tests/                      # Verification scripts and test suites
```

---

## 4. Key Pipelines & Lifecycle

### Video Generation Lifecycle
```text
TOPIC / PROMPT
  └──► AI Script Generation (OpenRouter DeepSeek / Gemini)
        └──► Scene Breakdown (Hooks, Visual Prompts, Camera Movement, Durations)
              └──► Visual Clip Synthesis (Cloudflare Flux 1 Schnell + FFmpeg Zoompan Motion)
                    └──► AI Quality Control (validateSceneClip, procedural fallback detection)
                          └──► Neural Voiceover Generation (MsEdgeTTS / ElevenLabs)
                                └──► Timed Subtitles (SRT / WebVTT generation)
                                      └──► FFmpeg Master Composition (1080x1920 H.264 + AAC + Subtitles)
                                            └──► Output MP4 & YouTube Auto-Publishing
```

### Stage State Machine
Every project tracks stages in SQLite:
`SCRIPT` $\to$ `SCENES` $\to$ `VIDEO` $\to$ `VOICE` $\to$ `SUBTITLES` $\to$ `FINAL_VIDEO`
Status transitions: `PENDING` $\to$ `PROCESSING` $\to$ `COMPLETED` (or `FAILED` with retry capability).

---

## 5. Critical Engineering Rules & Conventions

### A. Multi-Tenant Security & IDOR Prevention
1. **Always authenticate:** In every API route handling project or user data, call `getCurrentUser(req)`.
2. **Strict status codes:**
   - Unauthenticated $\to$ `401 Unauthorized` (`{"error": "Authentication required"}`)
   - Resource does not exist $\to$ `404 Not Found` (`{"error": "Project does not exist"}`)
   - Non-owner access $\to$ `403 Forbidden` (`{"error": "You do not have access to this project"}`)
3. **Admin exception:** Users with `role === 'ADMIN'` have system-wide oversight access.
4. **Prepared statements:** Always use `db.prepare(...).run/get/all` with bound parameters (`?`). Never interpolate variables directly into SQL queries.

### B. Secret Protection & Client Bundle Hygiene
- **Never expose server secrets to the client:** `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`, `DATABASE_URL`, and `ADMIN_SECRET` must only be read in server components, API route handlers, or server-side libs.
- Scans on `.next/static/chunks/*.js` must return **zero** server API keys.

### C. OpenRouter DeepSeek Token Management
- When invoking `https://openrouter.ai/api/v1/chat/completions` with model `deepseek/deepseek-chat`:
  - **Always explicitly specify `max_tokens` (set to `3500`).**
  - Omitting `max_tokens` causes OpenRouter to reserve the maximum model context (64k-128k tokens), leading to `402 Insufficient Credits` errors even on funded accounts.

### D. Media Storage & Path Traversal Prevention
- Asset serving via `/api/assets/[...key]` must decode incoming paths using `decodeURIComponent(key)`.
- Explicitly block `..` and `\\` sequences with `400 Bad Request`.
- Private project outputs (e.g. `final/{projectId}/output.mp4`) must verify project ownership before streaming the file.

### E. Video & FFmpeg Rendering Standards
- **Short-form Vertical Format:** `1080x1920` (9:16 portrait).
- **Video Codec:** `H.264` (`libx264`, `yuv420p`, High Profile, 30 fps CFR).
- **Audio Codec:** `AAC` stereo at 192 kbps.
- **Cinematic Motion:** Stills must be animated using FFmpeg `zoompan` (e.g., slow push-in, pull-out, or horizontal dolly pan) with color grading (`eq` filter) and subtle vignette. Never output raw static stills as video clips.

### F. Quality Control (QC) Layer
- Generated visual clips are inspected by `SceneQualityChecker`.
- Procedural color-block fallbacks must be detected as `PROCEDURAL_FALLBACK_DETECTED`, scored $\le 55\%$, marked `FAILED`, and automatically sent to the regeneration loop.
- The delivered MP4 must never contain unrendered procedural fallbacks.

---

## 6. Environment Variables Reference

| Variable | Required | Description |
| :--- | :---: | :--- |
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | Environment (`development` or `production`) |
| `NEXT_PUBLIC_APP_URL` | Yes | Canonical application URL (e.g. `http://localhost:3000`) |
| `ADMIN_USER` | Yes | Master admin dashboard username |
| `ADMIN_PASSWORD` | Yes | Master admin dashboard password |
| `ADMIN_SECRET` | Yes | 32+ byte secret for HMAC session signing and password hashing |
| `OPENROUTER_API_KEY` | Optional | Key for OpenRouter (`deepseek/deepseek-chat`) script generation |
| `GEMINI_API_KEY` | Optional | Fallback AI provider key for Google Gemini |
| `OPENAI_API_KEY` | Optional | Fallback AI provider key for OpenAI GPT |
| `CLOUDFLARE_ACCOUNT_ID`| Optional | Cloudflare account ID for Workers AI image synthesis |
| `CLOUDFLARE_API_TOKEN` | Optional | Cloudflare API token with Workers AI read/write permissions |
| `PEXELS_API_KEY` | Optional | Pexels video clip search API key |
| `PIXABAY_API_KEY` | Optional | Pixabay video clip search API key |
| `ELEVENLABS_API_KEY` | Optional | Premium voice cloning and synthesis |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 client ID for YouTube publishing |
| `GOOGLE_CLIENT_SECRET`| Optional | Google OAuth 2.0 client secret |
| `GOOGLE_REDIRECT_URI` | Optional | OAuth callback URL (`/api/auth/youtube/callback`) |
| `STRIPE_SECRET_KEY` | Optional | Stripe backend secret key for payments |
| `STRIPE_WEBHOOK_SECRET`| Optional| Stripe webhook signature verification secret |
| `R2_ACCOUNT_ID` | Optional | Cloudflare R2 account ID (uses `./storage` if omitted) |
| `R2_ACCESS_KEY_ID` | Optional | Cloudflare R2 S3 access key |
| `R2_SECRET_ACCESS_KEY`| Optional | Cloudflare R2 S3 secret key |
| `R2_BUCKET_NAME` | Optional | Cloudflare R2 bucket name |

---

## 7. Useful Database Inspection Commands

The database is SQLite located at `data/app.db`. Inspect via command line or Node script:

```bash
# Check database tables
node -e "const db = require('better-sqlite3')('data/app.db'); console.log(db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all());"

# View recent projects
node -e "const db = require('better-sqlite3')('data/app.db'); console.log(db.prepare('SELECT id, user_id, topic, status, current_stage FROM content_projects ORDER BY created_at DESC LIMIT 5').all());"

# Check system health via API
curl http://localhost:3000/api/health
```
