# Agent Guidelines & Repository Conventions

## App Architecture & Product Mission (AUTORA)

### Product Identity & Core Mission
**AUTORA** (`autora.live`) is an Autonomous Multi-Platform AI Video Creation & Social Publishing SaaS. It empowers creators and businesses to run automated, high-retention video channels across **YouTube** (Shorts & Longform), **TikTok**, **Instagram Reels**, and **Facebook Reels** with zero manual editing.

### Core 8 Production Modules
1. **Module 1 — Production Security & 2-Tier Pricing**:
   - Sliding-window in-memory IP rate limiter (guards login, calendar generation, and rendering).
   - Tamper-proof HMAC SHA-256 admin tokens with constant-time comparison.
   - Reconciled pricing tiers: **Creator Plan** ($49/mo, 100 credits) and **Pro Plan** ($99/mo, 250 credits).
   - Purged admin routes from public sitemaps and disallow directives in `robots.txt`.
2. **Module 2 — Zero-Waste Credit Ledger & Auto-Refund System**:
   - Dynamic per-job cost preview calculation before execution.
   - Instant 100% credit refund trigger upon any pipeline stage failure with structured error logging.
3. **Module 3 — AI Video Generation Pipeline & Production Bible**:
   - Multi-provider video routing: Wan 2.1, Fal.ai, Pollinations AI, OpenAI Video, Cloudflare MiniMax, Google Veo, Runway, and Luma.
   - Character and visual continuity enforced via `ProductionBible` seed consistency.
   - FFmpeg composition engine with libass subtitle styling, auto-ducking audio, and format compliance (9:16 vertical and 16:9 horizontal).
4. **Module 4 — Competitor Intelligence & Viral Outliers**:
   - Competitor channel scraping and historical average calculation.
   - Outlier detection formula: `Viral Score = Views / Baseline Channel Average`.
   - 1-Click "Add Viral Variation to Calendar" automatically adapting viral topics into scheduled projects.
5. **Module 5 — Own Channel IQ & Winner-Bias Engine**:
   - Connected channel telemetry integration (YouTube Data API v3).
   - Winner-bias feedback loop injecting historical top-performing hooks, pacing, and topics into weekly calendar generation.
6. **Module 6 — Multi-Platform Social Auto-Publishing**:
   - Direct API integration with **YouTube**, **TikTok**, **Instagram Graph API**, and **Facebook Graph API**.
   - Platform-specific duration guards, aspect ratios, and tag formatting.
7. **Module 7 — Real Telemetry & Analytics Dashboard**:
   - Live telemetry recording exact render durations, visual motion distributions (AI Video vs Ken Burns still motion), and refund ledgers.
8. **Module 8 — Licensed Voice & Narrative Variety Engine**:
   - Microsoft Edge Neural TTS with Azure Speech licensing compliance.
   - 5 rotating storytelling frameworks (*Provocative Question Hook*, *Counter-Intuitive Mistake*, *Behind-the-Scenes Case Study*, *3-Step Tactical System*, *Mystery Box & Loophole*) preventing generic repetitive AI script patterns.

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

