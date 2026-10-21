# Agent Guidelines & Repository Conventions

## App Architecture & Product Mission (AUTORA)

### Product Identity & Core Mission
**AUTORA** (`autora.live`) is an Autonomous Multi-Platform AI Video Creation & Social Publishing SaaS. It empowers creators and businesses to run automated, high-retention video channels across **YouTube** (Shorts & Longform), **TikTok**, **Instagram Reels**, and **Facebook Reels** with zero manual editing.

### Core 8 Production Modules
1. **Module 1 — Production Security & 2-Tier Pricing**:
   - Sliding-window in-memory IP rate limiter (guards login, calendar generation, and rendering).
   - Tamper-proof HMAC SHA-256 admin tokens with constant-time comparison.
   - Reconciled 2-tier pricing architecture (guaranteeing $\ge 60\%$ gross margins):
     - **Creator Plan** ($49/mo, 750 credits): 30 Band 1 videos ($\le 60$s, 25 credits/video, includes up to $0.47 AI budget).
     - **Pro Plan** ($99/mo, 1,500 credits): 60 Band 1 videos ($\le 60$s, 25 credits/video, includes up to $0.47 AI budget).
   - Worst-case quote ceiling price-lock with zero-waste delta-refund on actual delivery.
   - Purged admin routes from public sitemaps and disallow directives in `robots.txt`.
2. **Module 2 — Zero-Waste Credit Ledger & Auto-Refund System**:
   - Real-time length-band credit preview before execution.
   - Fail-closed error handling with instant credit auto-refund on any unhandled pipeline failure (`BAND_OVERFLOW`, `NO_VALID_CLIPS`, `FFMPEG_RENDER_FAILED`).
   - Price-delta auto-refund when visual tier auto-downgrades from `ai_clip` to `motion_still`.
3. **Module 3 — Three-Tier Visual Renderer & Audio-First Timing**:
   - Audio-First Pipeline: `PLAN -> VOICE -> SCENES -> VIDEO -> SUBTITLES -> FINAL_VIDEO -> THUMBNAIL`.
   - Native word-boundary TTS audio generation drives exact scene durations.
   - Three visual tiers:
     - **AI Video** (`ai_clip`): Google Veo 3.1 Lite ($0.05/s) and Seedance 2.0 Fast ($0.24/s) with verified registry pricing.
     - **Graphic Stat Card** (`graphic`): High-speed glassmorphic stat cards rendered via local FFmpeg `lavfi` in $<4$s ($0.00 COGS).
     - **Cinematic Motion Still** (`motion_still`): Flux 1 Schnell 1080x1920 stills with Ken Burns dynamic zoompan.
   - Hook-Only Retry Policy: Scene 1 allows 1 retry; Scenes $>1$ auto-downgrade to `motion_still` with instant credit delta refund.
   - ASS karaoke subtitles with safe zones ($\ge 320$px from bottom) preventing platform UI overlap.
4. **Module 4 — Competitor Intelligence & Viral Outliers**:
   - Competitor channel scraping and historical average calculation.
   - Outlier detection formula: `Viral Score = Views / Baseline Channel Average`.
   - 1-Click "Add Viral Variation to Calendar" automatically adapting viral topics into scheduled projects.
5. **Module 5 — Own Channel IQ & Winner-Bias Engine**:
   - Connected channel telemetry integration (YouTube Data API v3).
   - Winner-bias feedback loop injecting historical top-performing hooks, pacing, and topics into weekly calendar generation.
6. **Module 6 — Multi-Platform Publishing & Compliance**:
   - Direct API publishing to **YouTube**, **TikTok**, **Instagram Reels**, and **Facebook Reels**.
   - TikTok compliance: `TIKTOK_APP_AUDITED` guard forcing `SELF_ONLY` for unaudited apps with post-publish read-back visibility query.
   - Instagram compliance: Valid public HTTPS URL enforcement and `MAX_INSTAGRAM_REELS_DURATION_SEC = 90` ceiling.
   - YouTube compliance: `status.containsSyntheticMedia: true` AI disclosure and channel-level `madeForKids` support.
   - Originality Radar: Pre-publish check comparing hook and title against past 10 published videos; alerts if similarity $>80\%$.
7. **Module 7 — Real Telemetry & Analytics Dashboard**:
   - Live telemetry recording exact render durations, visual motion distributions (AI Video vs Motion Still vs Graphic Card), COGS, and refund ledgers.
8. **Module 8 — Prompt-to-Plan with Storyboard Approval & Scene Editor-Lite**:
   - Prompt-to-Plan (`/content/new`): Free atomic plan generation across 5 narrative frameworks, length bands ($\le 60$s, $\le 120$s, $\le 180$s), and word budgets.
   - Storyboard approval with style previews before credits are locked.
   - Scene Editor-Lite (`/content/[id]`): Single-scene re-voicing, tier swapping, 1-click undo history via `video_scenes.history_json`, and fast recomposition.

---

## Git Commit & Conventional Commit Standards

Every commit in this repository must strictly adhere to the **Conventional Commits** specification:

### 1. Commit Message Structure
```text
<type>(<scope>): <summary in lowercase>

[optional body with bullet points explaining rationale]

[optional footer(s)]
```

### 2. Supported Types
- `feat`: A new feature or major enhancement.
- `fix`: A bug fix or patch.
- `docs`: Documentation updates only.
- `style`: Formatting, whitespace, missing semicolons (no code behavior change).
- `refactor`: Restructuring existing code without modifying external behavior.
- `perf`: Code changes improving computational performance or latency.
- `test`: Adding or updating test suites.
- `build`: Changes affecting build systems or external dependencies.
- `ci`: Changes to CI configuration, GitHub Actions, or deployment scripts.
- `chore`: Maintenance tasks, dependency bumps, or repository housekeeping.

### 3. Canonical Scopes
- `pipeline` — Video render worker, FFmpeg composition, scene generation.
- `scheduler` — Background daemon, sweepers, automated cron runners.
- `auth` — Multi-tenant session auth, OAuth platform credentials, token guards.
- `billing` — Polar/Stripe integrations, subscription tiers, credit refund ledgers.
- `db` — Database schema, SQLite migrations, connection adapters.
- `blog` — SEO articles, dynamic blog routes, schema markup.
- `seo` — Sitemap generation, robots.txt, metadata.
- `video` — Multimodal AI providers, stock footage engines, asset storage.
- `admin` — Admin analytics, diagnostics, rate-limit settings, key vault.
- `ui` — AppShell layout, dashboard components, creator studio views.
- `qa` — Test suites, browser QA scripts, regression runners.
- `publishing` — Multi-platform social publishers (YouTube, TikTok, Instagram, Facebook).
- `competitors` — Competitor intelligence scraper, viral outliers, hook generators.
- `ci` — GitHub Actions, Husky hooks, Commitlint, Dockerfile.

### 4. Commit Rules & Atomic Mandates
- **Atomic Commits**: Always group related files into cohesive, self-contained units. Do NOT bundle unrelated changes (e.g., UI tweaks + database schema changes) into a single commit.
- **Detailed Body**: When introducing architectural changes or refactors, include a bullet-pointed body explaining what changed and why.
- **Header Length**: The commit header must not exceed 120 characters and must be strictly lowercase.

---

## Multi-Collaborator Synchronization & Branching Standards

### 1. Branch Strategy (GitHub Flow)
- `main` is protected, stable, and production-ready at all times.
- Development happens on dedicated topic branches created from the latest `main`:
  - `feat/<feature-name>` for new features (e.g., `feat/tiktok-video-direct`)
  - `fix/<bug-name>` for bug fixes (e.g., `fix/credit-refund-edgecase`)
  - `docs/<topic>` for documentation (e.g., `docs/workflow-best-practices`)
  - `refactor/<target>` for refactoring (e.g., `refactor/ffmpeg-muxing`)

### 2. Synchronization Routine
Before starting any local development session, sync with `origin/main`:
```bash
git fetch origin
git pull --rebase origin main
```
If dependencies or lockfiles were updated upstream, immediately run:
```bash
npm install
```

### 3. Rebase Before Pull Request
Before submitting or merging a Pull Request, rebase your branch on `origin/main` to maintain a clean linear commit history:
```bash
git fetch origin main
git rebase origin/main
```

---

## Pull Request & Code Review Standards

To uphold the highest software quality across all contributions:

1. **Small & Focused PRs**: Keep PRs small and targeted (ideally under 400 lines of code changes). Large changes should be broken into sequenced PRs.
2. **Template Compliance**: Every Pull Request must complete `.github/pull_request_template.md` thoroughly.
3. **Mandatory Pre-Push Checks**:
   - `npm run typecheck` (zero TypeScript errors)
   - `npm run test:unit` (all master module tests pass)
   - `npm run build` (Next.js production build succeeds)
4. **No Direct Commits to Main**: All code must arrive on `main` via reviewed and approved Pull Requests with passing CI status.

---

## GitHub Actions & CI/CD Pipeline Standards

1. **Continuous Integration Gates**:
   - All PRs and pushes to `main` trigger the automated CI pipeline defined in `.github/workflows/ci.yml`.
   - Matrix testing across active Node.js LTS versions (Node 20 and Node 22).
   - Strict gates: static type checking (`tsc`), ESLint quality, 8-module test suite, and Next.js production compilation.
2. **Deterministic Builds**: Always use `npm ci --legacy-peer-deps` in automated pipelines to ensure dependencies match `package-lock.json` precisely.
3. **Cancellation of Stale Runs**: CI workflows must cancel redundant in-progress runs when new commits are pushed to the same PR branch (`concurrency.cancel-in-progress: true`).

---

## Security, Zero Trust & Safe Credential Standards

1. **Zero Secret Leaks**:
   - Never commit `.env`, `.env.local`, API keys, or private keys to version control.
   - Always commit template variables in `.env.example`.
2. **Cryptographic Protection**:
   - Admin authentication tokens use HMAC SHA-256 with constant-time equality checks (`crypto.timingSafeEqual`) to prevent timing attacks.
   - User passwords must be hashed using strong one-way hashing algorithms.
   - Platform OAuth tokens must be encrypted in storage using AES-256-GCM.
3. **Rate Limiting & Abuse Prevention**:
   - Public and computational endpoints (`/api/auth/login`, `/api/calendar/generate-plan`, `/api/render/*`) must be defended by the sliding-window rate limiter.

---

## Continuous Deployment (CD) & Release Standards

1. **Automated Container Packaging**:
   - Every merge to `main` and version tag (`v*.*.*`) triggers the CD workflow (`.github/workflows/cd.yml`).
   - Builds production multi-stage Docker images with GitHub Actions caching.
   - Publishes verified images to GitHub Container Registry (`ghcr.io/rayyan-mustafa/saas-video-automation`).
2. **Semantic Versioning & Release Tagging**:
   - Releases follow semantic versioning: `v<MAJOR>.<MINOR>.<PATCH>` (e.g., `v2.1.0`).
   - Pushing a git tag automatically creates a GitHub Release with auto-generated release notes derived from Conventional Commits.
   - Command to tag and trigger a production release:
     ```bash
     git tag -a v2.1.0 -m "Release v2.1.0"
     git push origin v2.1.0
     ```
3. **Environment Separation**:
   - `staging`: Automated preview deployments for QA verification.
   - `production`: Immutable containerized releases with zero-downtime rolling updates.

---

## Proprietary Commercial Asset & Acquisition Readiness Standards

1. **Sole Intellectual Property Ownership**:
   - 100% of the proprietary architecture, frontend code, media composition engine, and database schemas are the exclusive intellectual property of Rayyan Mustafa.
   - All rights are strictly reserved under the Proprietary Commercial License Agreement documented in [LICENSE.txt](LICENSE.txt).

2. **Acquisition & Turnkey Handover Readiness**:
   - The platform is architected for frictionless due diligence and transfer during commercial acquisition (e.g., via Acquire.com or private buyout).
   - Fully containerized execution via `Dockerfile` and automated CI/CD for instant buyer deployment.
   - Decoupled database adapter architecture (SQLite for low-cost bootstrapping, PostgreSQL for enterprise multi-tenant scale).

3. **Intellectual Property & Dependency Hygiene**:
   - Zero copyleft (GPL / AGPL) dependency contamination. All third-party libraries strictly utilize permissive commercial licenses (MIT, Apache 2.0, BSD).
   - Zero committed secrets: all production tokens, API vaults, and cryptographic secrets are isolated strictly in runtime environment variables.

---

## Emergency Rollback & Disaster Recovery Protocol

1. **History Erase & Hard Reset (Accidental Pushes / Leaked Secrets)**:
   - Locate the last known good commit: `git log --oneline -n 10`
   - Rewind the working tree: `git reset --hard <good-commit-hash>`
   - Force overwrite the remote branch: `git push origin main --force`
2. **Non-Destructive Revert (Public / Team Branches)**:
   - Invert the erroneous changes: `git revert HEAD` (or `git revert <bad-commit-hash>`)
   - Push reversal commit: `git push origin main`
3. **Rescue Net via `git reflog`**:
   - Recover any overwritten or seemingly lost commit: `git reflog` -> `git reset --hard HEAD@{n}`.

---

## Upstream Tracking & Multi-Remote Isolation

1. **Push Lock**: `upstream` remote push is permanently locked (`git remote set-url --push upstream DISABLE`).
2. **Zero Blind-Merges**: Never merge `upstream/main` directly to prevent conflicting deletions or unvetted logic.
3. **Selective Feature Pull**: Import only vetted directories/files via `git checkout upstream/main -- <path>`.
4. **Automated Change Detection**: Monitored via `.github/workflows/check-upstream.yml` and `npm run upstream:check`, logged in `UPSTREAM_LOGS.md`.




