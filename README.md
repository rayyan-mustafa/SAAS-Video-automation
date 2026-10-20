# AI Video Automation SaaS

A minimal, multi-channel AI Video Automation SaaS built with Next.js, SQLite/D1, FFmpeg, and pluggable AI/Video/Voice providers.

## Core Workflow

```text
CHANNEL ──► TOPIC ──► GENERATE ──► SCRIPT ──► SCENES ──► VIDEO CLIPS ──► VOICE ──► SUBTITLES ──► FINAL MP4
```

## Features

- **Multi-Channel Architecture**: Fully decoupled channel management supporting independent niches (Health, Tech, Finance, History, etc.) with custom voice models.
- **Provider Abstraction Layer**:
  - `aiProvider`: Structured script generation (Hook, Introduction, Main Sections, Conclusion, Call-to-Action) and scene breakdowns with natural durations. Supports Google Gemini / OpenAI with built-in intelligent fallback.
  - `videoProvider`: Scene visual clip generation with automatic splitting of long scenes (>8s) into continuous 8-second clips.
  - `voiceProvider`: Server-side TTS generation using neural voices with clean audio muxing.
  - `subtitleProvider`: Precise subtitle generator producing SRT and WebVTT timed cues.
  - `ffmpegCompositor`: Concatenates multi-scene clips, muxes synchronized voiceover, and renders high-definition web-ready MP4.
- **Asynchronous Background Processing**: Video generation is processed asynchronously in the background. The API returns immediately and clients poll or stream live pipeline statuses.
- **Fault-Tolerant & Retryable**: Each pipeline stage (`SCRIPT`, `SCENES`, `VIDEO`, `VOICE`, `SUBTITLES`, `FINAL_VIDEO`) tracks real state (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`) with isolated stage retry capabilities.
- **Minimal SaaS UI**: Ultra-clean monochrome design built with vanilla CSS tokens, zero bloat, and no chatbot distractions.

## Minimal Pages

- `/channels` — Manage independent channels (Name, Niche, Language, Video Count).
- `/content` — View generated videos and real-time generation statuses.
- `/content/new` — Generate a new video by picking a channel, topic, target length, and language.
- `/content/:id` — Real-time vertical pipeline stepper, scene breakdown, audio preview, subtitle inspector, and embedded HTML5 video player.

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

## Environment Variables (Optional)

```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If omitted, the system uses the built-in structured script and clip generation engine for 100% offline self-contained operation.)*
