# AutoVideo — AI YouTube Automation & Video Production SaaS

> **Turn ideas into fully rendered 1080p Full HD YouTube videos with AI scripts, neural voiceover, B-roll composition, dynamic subtitles, custom thumbnails, and 30-day automated YouTube publishing.**

---

## 🌟 Product Overview
**AutoVideo** is a turnkey, multi-tenant SaaS application built for content creators, YouTube automation channels, digital marketing agencies, and media networks. It automates the entire video production and release lifecycle: from raw topic prompt to scheduled 1080p video on YouTube.

---

## ⚡ Major Features

### 📅 30-Day YouTube Auto-Publishing & Release Calendar
- **One-Time Google OAuth 2.0 Connection**: Connect a YouTube channel once with official Google OAuth 2.0.
- **30-Day Release Calendar**: Plan a month of content; AutoVideo automatically generates, renders, uploads, and schedules videos according to calendar slots.
- **Official YouTube Data API v3**: Uses resumable video uploads, metadata formatting, and custom thumbnail setting. Zero unofficial browser automation or password scraping.
- **Resilient Background Scheduler**: Automatic retry handling, token rotation, and duplicate upload prevention.

### 🎬 Complete 10-Stage Autonomous Video Engine
- **Topic & Script Engine**: Generates high-retention scripts, viral hooks, and scene storyboards.
- **Neural Voice Synthesis**: 40+ free Edge Neural voices + ElevenLabs integration.
- **Intelligent Visual B-Roll**: Coverr HD video streams + Pexels & Pixabay fallback.
- **Frame-Accurate Subtitles**: Word-level subtitle timestamps burned via native FFmpeg.
- **Custom 1080p Thumbnails**: High-CTR thumbnail generation with bold typography.
- **Native 1080p CFR FFmpeg Compositor**: High-definition H.264/AAC FastStart MP4 video output.

### 🤖 AutoVideo AI Copilot
- Contextual studio assistant for rewriting scene prompts, creating stronger hooks, shortening/expanding narrations, changing tone, and generating viral titles.

### 🔐 Enterprise Multi-Tenant Customer Architecture
- Full customer lifecycle: Registration, Email verification, Onboarding, Workspace creation, Session management, and Password recovery.
- Strict SQLite database isolation between customer accounts (Tenant B receives HTTP 404 for Tenant A resources).

### 💳 Commercial Billing & Credit System
- 4 Calculated Tiers: Starter ($19/mo), Pro Creator ($49/mo), Growth ($99/mo), Agency ($199/mo) with Annual 20% savings.
- Credit-based usage tracking, transaction ledgers, and credit top-up packages.

### 🛡️ Super Admin Control Panel
- Dedicated admin portal (`/admin`) with system diagnostics, live API key vault, server health telemetry, and database table statistics.

---

## 🛠️ Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript (Strict Mode, 100% typed)
- **Database**: SQLite with WAL Mode (`better-sqlite3`)
- **Video Rendering Engine**: Native FFmpeg (`@ffmpeg-installer/ffmpeg`)
- **Voiceover Engine**: Edge Neural TTS (`msedge-tts`) + Google TTS + ElevenLabs
- **OAuth & Publishing**: Official Google OAuth 2.0 & YouTube Data API v3
- **Styling**: 2026 Obsidian AI Studio dark theme with responsive CSS tokens

---

## 📦 What's Included
1. **Full Source Code**: Clean, well-structured TypeScript codebase with zero obfuscation.
2. **Comprehensive Documentation**: Complete installation, configuration, Google Cloud setup, and deployment guide (`DOCUMENTATION.md`).
3. **Automated Test Suites**: Pre-configured browser QA and YouTube integration test suites (`test-final-browser-qa.ts` and `test-youtube-integration.ts`).
4. **Environment Template**: Fully documented `.env.example`.
5. **Commercial License**: Royalty-free MIT commercial usage rights (`LICENSE.txt`).
