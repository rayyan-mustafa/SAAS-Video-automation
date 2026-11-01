# 🚀 TILLERCAST v3.0 — AUTONOMOUS AGENTIC EXECUTION LEDGER
Reference Spec: `C:\Users\HP\.gemini\antigravity\brain\f6eba120-91ee-4f13-9a26-4bdb72a4b519\tillercast-agentic-redesign-plan.md`
Owner: Rayyan Mustafa (2312335)
Execution Mode: 100% Autonomous Continuous Self-Relay Daemon
Status: IN_PROGRESS — Phase 0 Ready

---

## 🔁 AUTONOMOUS RELAY PROTOCOL (CRITICAL EXECUTION RULE)
> **Self-Sustaining Loop Mandate for Claude Opus / Antigravity Agents**:
> 1. At the start of each session, read this `TASK_LEDGER.md` to identify the first unchecked `[ ]` task.
> 2. Execute tasks sequentially. Run `npm run typecheck` after every single phase.
> 3. If a task or phase passes verification, mark it `[x]` and commit code via Git with Conventional Commits.
> 4. **QUOTA RELAY RULE**: If rate limits or quota warnings are encountered, OR before your context window closes while unchecked `[ ]` tasks remain:
>    - Commit all current progress to git.
>    - Update this `TASK_LEDGER.md`.
>    - Immediately call `schedule(DurationSeconds=18000, ...)` (5-hour window) to schedule your next autonomous wakeup.
> 5. Repeat this cycle until all 7 Phases and the Playwright Autonomous Verification pass 100%!

---

## Phase 0: Database & Variable Credit Engine [SEQUENTIAL]
- [ ] 0.1 Create SQLite & PostgreSQL migration for `agent_sessions` table (tracks conversation state, extracted params, script JSON).
- [ ] 0.2 Create migration for `agent_messages` table (stores conversation message history between creator and agent).
- [ ] 0.3 Create migration for `credit_purchases` table (stores extra credit pack purchases, amounts, provider, expiration).
- [ ] 0.4 Update `src/lib/billing.ts` to implement variable credit consumption:
  - Stock B-Roll / Flash Motion: 1 credit per scene.
  - Cinema AI Lite (Veo 3.1 Lite): 5 credits per scene.
  - Cinema AI Fast (Veo 3.1 Fast): 8 credits per scene.
  - Hollywood Director (Veo Std/Kling): 15 credits per scene.
  - ElevenLabs Pro Voice: 2 credits per video.
  - Free Trial: 300 credits for 15 days + 1 free direct social publish.
- [ ] 0.5 Implement Zero-Waste Credit Auto-Refund in `src/lib/billing/refundEngine.ts` (100% instant credit refund on render failure).
- [ ] 0.6 Create real-time credit quote endpoint at `/api/credits/estimate`.
- [ ] **Verification Gate 0**: `npm run typecheck` PASS, `node` script verifying DB tables creation and credit estimation math.

---

## Phase 1: Agentic Conversational Backend APIs [SEQUENTIAL, Depends on Phase 0]
- [ ] 1.1 Create `/api/agent/chat/route.ts` — receives natural language prompts, manages session history, and runs the 5-step adaptive interview.
- [ ] 1.2 Create `/api/agent/script/route.ts` — generates structured scene-by-scene script JSON using Gemini Flash with strict validation.
- [ ] 1.3 Create `/api/agent/refine/route.ts` — parses conversational scene updates ("change scene 2", "make hook punchier") and updates `script_json`.
- [ ] **Verification Gate 1**: `npm run typecheck` PASS, API integration test simulating full prompt -> interview -> script -> refine flow.

---

## Phase 2: Agent Chat & Studio Frontend (Light-Modern Pictory Aesthetic) [Depends on Phase 1]
- [ ] 2.1 Build `src/components/agent/AgentChatPanel.tsx` (Light theme, purple avatar, message bubbles, adaptive question option cards, "Reply or refine..." input).
- [ ] 2.2 Build `src/components/agent/ScriptReviewPanel.tsx` (Pure white cards, deep slate text, scene breakdown, estimated duration badges).
- [ ] 2.3 Build `src/components/agent/CreditEstimateBar.tsx` (Real-time credit cost quote, balance check, glowing amber lightning ⚡ badge).
- [ ] 2.4 Build `src/components/agent/QuickStartChips.tsx` (`Turn script into video`, `Turn URL into video`, `Viral Documentary`, etc.).
- [ ] 2.5 Redesign `/dashboard` Hero Prompt Hub (`"What video will you create today, Rayyan?"` on light lavender background).
- [ ] **Verification Gate 2**: `npm run typecheck` PASS, Playwright test navigating `/dashboard` and `/content/new`.

---

## Phase 3: Video Preview Engine & Refinement Loop [Depends on Phase 2]
- [ ] 3.1 Create `/api/agent/preview/route.ts` — generates fast, low-cost video preview (50% scene credit rate).
- [ ] 3.2 Build `src/components/agent/VideoPreviewPanel.tsx` — video player with dark theater canvas inside crisp white container, scene scrubber, and action buttons (`Open in Editor`, `Generate Final Video`).
- [ ] 3.3 Wire 1-click single-scene re-render when refined via chat.
- [ ] **Verification Gate 3**: `npm run typecheck` PASS, Playwright test verifying preview generation and chat refinement.

---

## Phase 4: Extra Credit Purchase System [Depends on Phase 0]
- [ ] 4.1 Build `src/components/billing/CreditPurchaseModal.tsx` (4 packs: 200 cr for $9.99, 500 cr for $19.99, 1.5K cr for $49.99, 5K cr for $129.99).
- [ ] 4.2 Create `/api/credits/purchase/route.ts` integrated with Polar/Stripe checkout.
- [ ] 4.3 Implement FIFO credit consumption (monthly allowance consumed first, then purchased packs).
- [ ] 4.4 Add 1-click "Report Broken Video" button in studio with instant credit restitution.
- [ ] **Verification Gate 4**: `npm run typecheck` PASS, unit test for FIFO credit deduction and auto-refund.

---

## Phase 5: Light-Modern UI Overhaul Across All 9 Pages [Depends on Phase 2 & 4]
- [ ] 5.1 **Homepage & Landing Page** (`/`, `/landing`): Light pastel hero, live interactive prompt widget, bento grid, comparison table vs. "Others", pricing cards.
- [ ] 5.2 **Dashboard** (`/dashboard`): Light hero card, quick-start chips, recent project cards.
- [ ] 5.3 **Content Library** (`/content`): Clean white table, hover thumbnails, multi-platform badges.
- [ ] 5.4 **Competitor Outlier Spy** (`/competitors`): White channel cards, viral score badges, 1-click "Add to Video Agent".
- [ ] 5.5 **Schedule & Calendar** (`/schedule`, `/calendar`): Clean monthly/weekly grid with platform color badges.
- [ ] 5.6 **Analytics & Channel IQ** (`/analytics`): Light cards, watch-time retention curves, winning hook leaderboard.
- [ ] 5.7 **Pricing & Billing** (`/pricing`, `/billing`): 3-tier light cards with annual toggle and extra credit slider.
- [ ] 5.8 **Settings & Brand Kit** (`/settings`): Clean tabbed settings (logo upload, brand colors, fonts, social OAuth).
- [ ] 5.9 **App Shell & Sidebar**: Light white sidebar with active purple pill indicators.
- [ ] **Verification Gate 5**: `npm run typecheck` PASS, Playwright visual check across all 9 pages.

---

## Phase 6: Multi-Accent Voice Catalog & Quality Polish [Depends on Phase 1]
- [ ] 6.1 Integrate Google Cloud TTS Neural2 / Journey multi-accent engine in `src/lib/video/voiceCatalog.ts` (US, UK, Australian, Indian English).
- [ ] 6.2 Wire accent selector in agent interview and audio tab.
- [ ] 6.3 Maintain ElevenLabs Pro studio narrators (Adam, Brian, Chris, Rachel) for Creator & Pro tiers.
- [ ] **Verification Gate 6**: `npm run typecheck` PASS, voice synthesis test for each regional accent.

---

## Phase 7: Autonomous Playwright QA & Pictory Quality Benchmark [Final]
- [ ] 7.1 Automated test for **Free Demo Plan**: Sign up, generate short with Stock + Google Neural2 voice, verify kinetic subtitles and 300-credit balance.
- [ ] 7.2 Automated test for **Creator Plan**: Generate short with ElevenLabs voice and Cinema AI Lite visual, verify video composition.
- [ ] 7.3 Automated test for **Pro Plan**: Generate 60s video with Cinema AI Fast visual and schedule to social calendar.
- [ ] 7.4 Quality Benchmark: Inspect output MP4s and UI screenshots against Pictory design standard. Fix any visual glitches or audio issues.
- [ ] 7.5 Production Build Gate: `npm run build` succeeds with zero errors.
- [ ] **Verification Gate 7**: All 3 tier videos generated, saved locally in `public/renders/qa/`, and verified clean.

---

## Phase 8: Production Netlify Deployment & Live URL Ledger Record [DEPLOYMENT]
- [ ] 8.1 Initialize Netlify deployment via Netlify MCP / CLI (`npx netlify deploy --prod`).
- [ ] 8.2 Verify production build assets and environment variables on Netlify.
- [ ] 8.3 Record live production URL in this ledger below.

### 🌐 Live Production Deployment
* **Status**: `PENDING_BUILD_AND_DEPLOYMENT`
* **Live Production URL**: `TBD (written automatically by agent upon deployment)`
* **Deployment Timestamp**: `TBD`
* **Netlify Site ID**: `TBD`
