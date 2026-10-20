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

## Git Commit & Workflow Standards
Whenever asked to commit or push code in this project:

1. **Format**: Strictly use Conventional Commits: `<type>(<scope>): <summary>`
2. **Types**: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `ci`, `style`, `build`
3. **Common Scopes**:
   - `pipeline` (video worker, FFmpeg composition)
   - `scheduler` (background worker daemon, sweeper)
   - `auth` (multi-tenant session auth, login routes)
   - `billing` (Polar, Stripe, plans)
   - `db` (SQLite schema, migrations, queries)
   - `blog` (SEO articles, posts)
   - `seo` (sitemap, meta tags, search console)
   - `video` (AI video providers, stock footage)
   - `admin` (admin dashboard, API key vault)
   - `ui` (components, responsive layouts)
   - `qa` (test suites, browser automation)
   - `publishing` (YouTube, TikTok, Instagram, Facebook publishing engines)
   - `competitors` (competitor intelligence & viral scraping)
   - `ci` (GitHub actions, husky hooks, linters)
4. **Detail**: Include a multi-line body with bullet points explaining changes.
5. **Atomic Commits**: Always group related files into individual commits rather than bundling everything into one commit.

---

## Multi-Collaborator Synchronization & Branching Standards
When collaborating with partners on this repository:

1. **Always Pull Before Starting Work**:
   - Before executing code changes or implementing new features, always run:
     ```bash
     git fetch origin
     git pull --rebase origin <current-branch>
     ```
   - If incoming changes update `package.json` or lockfiles, immediately run `npm install`.

2. **Feature Branch Mandate**:
   - Do NOT develop directly on `main` when collaborating on shared features.
   - Always create a dedicated branch for features or bugfixes:
     ```bash
     git checkout -b feature/<feature-name>
     # or
     git checkout -b fix/<bug-description>
     ```
   - Before merging or pushing, rebase against the latest `origin/main`:
     ```bash
     git fetch origin main
     git rebase origin/main
     ```

3. **Safe Pull Routine (Option 1 Workflow)**:
   - When local work is in progress and remote changes arrive:
     1. Stage and commit local progress: `git add <files>` && `git commit -m "..."`
     2. Pull remote changes with rebase: `git pull --rebase origin <branch>`
     3. Resolve any conflicts cleanly if prompted.
     4. Push cleanly: `git push origin <branch>`
