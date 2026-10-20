# AutoVideo SaaS — Operational & Technical Documentation

---

## 1. Executive Overview
**AutoVideo SaaS** is an autonomous AI-native video generation platform built with Next.js 14 (App Router), TypeScript, SQLite (WAL mode), TailwindCSS/Vanilla CSS design system, and an integrated FFmpeg rendering compositor.

---

## 2. System Prerequisites
- **Node.js**: v18.17.0+ or v20+ / v22+
- **Package Manager**: `npm` (v9+) or `pnpm` / `yarn`
- **FFmpeg**: Automatically resolved via `@ffmpeg-installer/ffmpeg` and `@ffprobe-installer/ffprobe` (or local system `ffmpeg` binary on PATH).
- **Operating System**: Linux, macOS, or Windows 10/11.

---

## 3. Quickstart Installation

```bash
# 1. Clone or extract the repository
cd "ai video automation"

# 2. Install all dependencies
npm install

# 3. Copy environment template
cp .env.example .env

# 4. Initialize and build the production bundle
npm run build

# 5. Start the production server
npm run start
```

---

## 4. Environment Variables Configuration

Copy `.env.example` to `.env`. The key variables are:

```env
# Server Port & URL
PORT=3000
NODE_ENV=production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Super Admin Security
ADMIN_USER=admin
ADMIN_PASSWORD=ChangeThisToAStrongPassword2026!#
ADMIN_SECRET=generate_a_random_32_byte_hex_string_for_hmac

# Google OAuth 2.0 & YouTube Data API v3 (Required for Auto-Publishing)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback

# AI Language Model Providers (Optional — Fallback algorithmic structuring active if blank)
GEMINI_API_KEY=
OPENAI_API_KEY=

# Voice Synthesizers (Optional — Built-in Google Neural TTS works out-of-the-box for free)
ELEVENLABS_API_KEY=

# Stock Video & Image AI (Optional — Coverr free streams active out-of-the-box)
PEXELS_API_KEY=
PIXABAY_API_KEY=
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# Stripe Billing (Optional — leave blank for demo sandbox ledger)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=
```

---

## 5. Google OAuth 2.0 & YouTube Data API v3 Auto-Publishing

AutoVideo uses the **official YouTube Data API v3** with Google OAuth 2.0 authorization code flow. Zero browser automation, Selenium, or password scraping is used.

### 5.1 Google Cloud Console Setup Guide
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project named **AutoVideo Studio** (or your brand name).
3. Navigate to **APIs & Services $\to$ Library** and search for **YouTube Data API v3**. Click **Enable**.
4. Navigate to **APIs & Services $\to$ OAuth consent screen**:
   - User Type: **External**
   - App Name: **AutoVideo SaaS**
   - User Support Email: your support email
   - Developer Contact: your developer email
5. **Add OAuth Scopes**:
   - `https://www.googleapis.com/auth/youtube.upload` (Upload and manage your YouTube videos)
   - `https://www.googleapis.com/auth/youtube.readonly` (View YouTube channel profile and title)
   - `https://www.googleapis.com/auth/userinfo.email` (View connected Google account email)
6. Navigate to **APIs & Services $\to$ Credentials $\to$ Create Credentials $\to$ OAuth Client ID**:
   - Application Type: **Web application**
   - Name: **AutoVideo Web Client**
   - Authorized JavaScript origins: `http://localhost:3000` (and `https://yourdomain.com` in production)
   - Authorized redirect URIs: `http://localhost:3000/api/auth/youtube/callback` (and `https://yourdomain.com/api/auth/youtube/callback`)
7. Copy the generated **Client ID** and **Client Secret** into your `.env` file:
   ```env
   GOOGLE_CLIENT_ID=XXXXX.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-XXXXX
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/youtube/callback
   ```

### 5.2 30-Day Automated Publishing Workflow
1. **Connect Channel:** Customer navigates to **Settings $\to$ YouTube Integration** and clicks **"Connect YouTube"**.
2. **Google Consent:** Customer logs into Google and grants upload permissions.
3. **Token Ingestion:** AutoVideo securely stores the refresh token in the SQLite `oauth_connections` table under the customer's isolated `user_id`.
4. **Schedule Content Plan:** In **Content Calendar (`/calendar`)** or **Studio (`/content/[id]`)**, customer sets scheduled release dates.
5. **Background Auto-Publisher:** The scheduler service (`/api/scheduler/run`) periodically queries due videos (`scheduled_at <= NOW`), initiates a resumable upload to YouTube, uploads custom high-CTR thumbnails, and records the live YouTube Video ID (`https://www.youtube.com/watch?v={videoId}`).
6. **Token Security:** Tokens are never leaked in client API payloads, never displayed in logs, and are fully scoped per tenant.

### 5.3 YouTube API Quota & Verification Notes
- **Default Quota:** Google provides 10,000 units/day for free per project.
- **Upload Cost:** A single video upload via YouTube Data API v3 costs 1,600 units (approximately 6 full uploads per day on free tier).
- **Quota Increase:** For high-volume production SaaS, request a free quota extension in Google Cloud Console under *IAM & Admin $\to$ Quotas $\to$ YouTube Data API v3*.
- **Google App Verification:** For public multi-user SaaS production releases with $>100$ external users, submit your app for Google OAuth verification.

---

## 6. Multi-Tenant Architecture & Security
- **Authentication**: Salted Scrypt password hashing with cryptographically secure salts.
- **Sessions**: 256-bit cryptographically random tokens stored in `user_sessions` and passed via `HttpOnly; SameSite=Lax; Path=/` cookies.
- **Tenant Isolation**: Every SQL query is strictly scoped by `WHERE user_id = ?`. Cross-tenant requests return `HTTP 404 Not Found` with zero data leakage.
- **Super Admin Isolation**: Administrative routes (`/api/admin/*`) require HMAC-SHA256 tokens (`ADMIN_SECRET`). Customer accounts receive `HTTP 401 Unauthorized`.

---

## 7. Video Synthesis & FFmpeg Rendering Pipeline
1. **Script Engine**: Contextual script generation with viral hook synthesis.
2. **Scene Decomposition**: Multi-scene storyboard ($4-16$ scenes) with camera movements and lighting notes.
3. **Visual Sourcing**: Multi-tier B-roll matcher with Coverr HD footage, Pexels API, Pixabay API, and procedural canvas fallbacks.
4. **Voice Synthesizer**: Google Neural Voice streamer with ElevenLabs high-tier voice support.
5. **Subtitles Generator**: Frame-accurate SRT subtitle track generation.
6. **Compositor**: FFmpeg 1080p Constant Frame Rate (CFR `30fps`) compositor generating valid FastStart MP4 videos.

---

## 8. Customer SaaS Experience vs. Administrator Platform Configuration

AutoVideo is designed as a turnkey commercial SaaS where customers purchase subscription plans / credits and immediately create videos using platform-managed infrastructure.

### 8.1 Customer Experience (No API Keys Required)
- **Zero API Configuration:** Customers do NOT enter OpenAI, Google Gemini, ElevenLabs, Cloudflare, Pexels, or Pixabay API keys.
- **Credit-Based Usage:** Customers use platform-allocated credits (Free: 500 credits, Creator: 2,500 credits, Pro: 7,500 credits, Agency: 25,000 credits) to generate videos.
- **YouTube Integration:** Customers connect their own YouTube channel via standard Google OAuth 2.0 (**Settings $\to$ YouTube Publishing $\to$ Connect YouTube**).
- **Studio Preferences:** Customers configure their own video duration defaults, language, and auto-publishing schedule triggers.

### 8.2 Administrator Platform Configuration (Protected Admin Portal)
- **Protected Route:** Platform administrators access the dedicated admin portal at **`/admin`** using secure HMAC credentials.
- **API Key Vault:** Administrators configure platform-level provider keys (Google Gemini AI, OpenAI, ElevenLabs Voice AI, Cloudflare Workers AI, Pexels, Pixabay) stored securely in the database or server environment.
- **Zero Secret Leakage:** Provider secrets are strictly masked (`••••••••••••`) and never returned in customer API responses or frontend bundles.

---

## 9. Verification Commands & QA Suites

```bash
# Run comprehensive multi-tenant isolation, security, and provider protection suite (28 tests)
npx tsx test-regression.ts
```
