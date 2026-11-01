# AGENTS.md: Tech Stack Decision Guide

Read this before starting or modifying any project. First classify the app's nature (Section 1), then follow the matching stack (Section 2). Do not deviate without writing a short justification in `docs/decisions.md`.

## 0. Principles
- Boring, popular technology. A buyer or client should recognize the stack.
- Default to managed services. We do not want to be the sysadmin. Self-host (VPS + Dokploy) only when the owner explicitly chooses to trade ops time for lower cost (see Section 3, "Managed vs self-hosted").
- Every project must be portable and handover-ready: Docker where applicable, `.env.example`, no secrets in git, a README, and a one-page architecture doc.
- Ask the owner before adding any paid service not listed here.

## 1. Classify the app first

Answer these questions in order. The first "yes" decides the category.

1. Is it mainly a marketing, content or SEO site with no user accounts or app logic? -> **Category E: Marketing / content site**
2. Is it a native mobile app (iOS/Android)? -> **Category G: Mobile app**
3. Is the product itself an API or developer tool that customers call programmatically? -> **Category F: API / developer product**
4. Is the core feature an LLM chat, agent or retrieval (RAG) experience? -> **Category D: AI / LLM product**
5. Does it need an always-on process (trading bot, websocket listener, scheduler that must never miss a run, live market data)? -> **Category C: Always-on**
6. Does it run long jobs (more than 60 seconds), render video or audio, process queues, or chain many slow AI APIs? -> **Category B: Worker-heavy**
7. Otherwise (dashboards, CRUD, forms, auth, billing, scheduled checks that take seconds, API-fed data) -> **Category A: Standard web SaaS**

If an app has both a web UI and a heavy backend, split it: UI follows Category A, backend follows the matching category. If an app fits two backend categories (for example an AI product with long jobs), use the category of the heavier workload for the backend and note it in `docs/decisions.md`.

## 2. Stacks by category

### Category A: Standard web SaaS (example: SEO tool)
- **Frontend/app:** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui
- **DB + auth:** Supabase (Postgres, Row Level Security on every table)
- **Billing:** Polar (see Payments section)
- **ORM/queries:** Drizzle or Supabase client with generated types
- **Scheduled jobs:** Supabase cron or Trigger.dev/Inngest
- **Email:** Resend
- **Hosting:** Cloudflare Pages or Netlify (commercial use allowed). Vercel only on a paid plan. Never Vercel Hobby for commercial or client work.
- **External data:** Use provider APIs (DataForSEO, Google APIs, etc.) before building crawlers or scrapers.

### Category B: Worker-heavy (example: YouTube automation / AUTORA)
Default: managed job platform. No server to administer.
- **Frontend:** Next.js + TypeScript + Tailwind (same as A), deployed on Cloudflare Pages
- **Job engine:** **Trigger.dev** (cloud) for long-running pipeline tasks. It runs jobs without timeouts, with retries, queuing and a realtime status API for the UI. Use its FFmpeg and Python build extensions where needed.
- **Heavy or bursty steps:** if a step exceeds Trigger.dev's machine size, time limits or budget (check current limits and pricing first), move just that step to **Google Cloud Run Jobs** or **Modal** (GPU or large parallel batches).
- **Fallback if a plain server is needed:** **Render** background workers (flat pricing, cron and workers are first-class service types), with FastAPI and Redis + Celery/ARQ.
- **File storage:** Cloudflare R2 for videos, audio, images and large assets. Store only keys and metadata in Postgres. Use presigned URLs for upload and download.
- **DB + auth:** Supabase
- **AI/GPU:** Call hosted APIs (Replicate, fal, ElevenLabs, etc.). Do not run own GPU infrastructure unless the owner approves.
- **Notes:** Jobs must be idempotent and retryable. Track job status in the DB (queued, running, failed, done) and show it in the UI. Log every failed job with its reason.

### Category C: Always-on (example: trading bot)
- **Engine:** Python (ccxt) or Node.js, running as a persistent container with auto-restart
- **Data:** Postgres (TimescaleDB if storing large price history) + Redis
- **Dashboard:** Next.js reading from Supabase or the bot's API
- **Hosting (default):** **Render** background worker (always-on, flat pricing, no server to patch). Never free-tier hosting.
- **Hosting (owner opt-in):** Hetzner VPS + Dokploy if the owner chooses lower cost and accepts the ops work. Move to its own server once real users or real money are involved.
- **Security rules (mandatory):**
  - Exchange API keys encrypted at rest, trade-only permissions, never withdrawal rights
  - Paper trading mode first, real trading behind an explicit flag
  - Hard risk limits (max position size, max daily loss, kill switch)
  - Heartbeat monitoring with an alert if the bot stops
- **Legal:** Include risk disclaimers in the product. Flag to the owner before offering it to third parties, since selling trading tools can carry liability and regulatory risk.

### Category D: AI / LLM product (chat, agents, RAG)
- **Frontend:** Next.js + TypeScript + Tailwind + shadcn/ui, with streaming responses (Vercel AI SDK or equivalent)
- **LLM access:** Hosted model APIs behind our own thin server layer. Never call model APIs from the browser. Keep provider keys server-side. Keep the model name and prompts in config so they can be swapped.
- **Retrieval/memory:** Supabase Postgres with pgvector. Add a separate vector database only if scale demands it and the owner approves.
- **Long agent runs (over 60 seconds):** run them as Trigger.dev tasks, same as Category B, and stream status to the UI.
- **DB + auth + billing:** Supabase + Polar
- **Hosting:** Cloudflare Pages or Netlify for the frontend
- **Mandatory controls:**
  - Per-user rate limits and spending caps, so one user cannot burn the API budget
  - Log token usage and cost per user and per feature
  - Version prompts in the repo and store them in git
  - Basic evals or test prompts for key flows before each release
  - Treat user-uploaded and retrieved content as untrusted (prompt injection). Do not give agents destructive tools without confirmation.

### Category E: Marketing / content site (example: agency site, landing pages, blog)
- **Framework:** Astro (content-heavy, fastest) or Next.js static export
- **Content:** Markdown/MDX in the repo, or a headless CMS only if non-developers must edit
- **Hosting:** Cloudflare Pages (free, commercial use allowed)
- **SEO:** Metadata and sitemap on every page, structured data where useful, image optimization, fast Core Web Vitals
- **Forms/email:** Resend or a form service. No database unless required.
- **Analytics:** privacy-friendly analytics (Plausible, Umami or Cloudflare Web Analytics)
- This category also covers the `/projects` page and case studies described in PORTFOLIO-SHOWCASE.md.

### Category F: API / developer product (the API is what we sell)
- **API framework:** Hono or Fastify (TypeScript) or FastAPI (Python)
- **Auth:** API keys (hashed in DB, shown once), per-key rate limiting and usage metering
- **Docs:** An OpenAPI spec as the source of truth, with a hosted docs site (Mintlify or similar). Examples in at least curl plus one SDK language.
- **Billing:** Polar, with usage tracked in our DB (usage-based or tiered plans)
- **DB:** Supabase Postgres
- **Hosting:** Render web service (default) or Cloud Run. Add a status page and uptime monitoring.
- **Rules:** Version the API (`/v1`). Never make breaking changes within a version. Return consistent error formats. Idempotency keys for write endpoints.

### Category G: Mobile app
- **Framework:** Expo (React Native) + TypeScript
- **Backend:** Supabase (auth, Postgres, storage) and Edge Functions
- **Payments:** In-app purchases for digital goods are typically required by Apple and Google, so use **RevenueCat** to manage them. Polar covers web billing only. Ask the owner before designing any payment flow.
- **Push notifications:** Expo notifications
- **Builds/releases:** Expo EAS for builds and store submission
- **Notes:** Check current App Store and Play Store policy before building billing or account features. Account deletion in-app is typically required.

## 3. Cross-cutting rules (all categories)

### Managed vs self-hosted
- Default to managed (Trigger.dev, Render, Cloud Run, Modal, Supabase, Cloudflare). We do not patch servers.
- Self-hosting (Hetzner VPS + Dokploy) is allowed only when the owner explicitly chooses it for cost. If so, the project must include: automated OS updates, firewall and SSH hardening, uptime monitoring, offsite backups with a tested restore, and a written runbook in `docs/`.
- Client projects and anything intended for sale use managed services, so handover to a buyer is simple.
- Check current pricing and limits of any managed service before recommending it. Do not assume.

### Storage
- Large or heavily served files (video, audio, big images): **Cloudflare R2**
- Small user uploads tied to auth (avatars, documents): **Supabase Storage**
- Never store files in the database or on the server's local disk.

### Payments
- Use **Polar** (merchant of record) for web subscriptions, one-time purchases and license keys. Do not integrate Stripe directly unless the owner asks. Mobile in-app purchases follow Category G.
- Use Polar's sandbox environment for development and demos. Only switch to production keys when the owner confirms.
- Use Polar's official SDK or framework adapter (for Next.js, the Polar Next.js adapter) instead of hand-rolling API calls.
- Always verify webhook signatures. Store the customer ID, subscription status and plan in our own DB, updated only from verified webhooks. Never trust the client to say a user has paid.
- Gate features on the subscription state stored in the DB, not on checkout redirects.
- Keep products, prices and benefits defined in the Polar dashboard. Reference them by ID via env vars, never hard-code them.
- Before launch, ask the owner to confirm payout and country support for the seller account in Polar's current docs, since this can change.

### Domains, DNS, naming
- DNS on Cloudflare. One subdomain per project under the agency domain (`project.domain.com`).
- Separate `staging` and `production` environments.

### CI/CD
- GitHub Actions: lint, type-check, test, build, deploy on merge to `main`.
- Dockerfile + `docker-compose.yml` for anything containerized.

### Monitoring and backups
- UptimeRobot (uptime) and Sentry (errors) on every live project.
- Database backups to R2 or Backblaze B2 where the platform does not provide them. A restore must be tested at least once per project.

### Security basics
- No secrets in git. Use `.env` locally and platform secrets in production. Keep `.env.example` current.
- Row Level Security on all Supabase tables. Validate all input. Rate-limit public endpoints.

## 4. Portfolio and handover requirements

Every project must ship with:
1. A live demo with seeded data and a demo login
2. A README with screenshot, architecture diagram, tech stack, setup steps and live link
3. A one-page architecture doc: deployment, backups, how to migrate it
4. A short case study: problem, what was built, result
5. `.env.example` and no hard-coded secrets

For client projects, use accounts owned by the client (their hosting, database, domain) with the developer retaining admin access. This keeps every project cleanly transferable or sellable.

See PORTFOLIO-SHOWCASE.md for where and how to showcase and launch each product.

## 5. When this guide does not fit
If a project does not clearly match a category, stop and ask the owner. Then record the decision and reasoning in `docs/decisions.md`.
