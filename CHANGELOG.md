# Changelog — AutoVideo 2026

All notable changes to the AutoVideo SaaS platform are documented in this file.

## [2.1.0] - 2026-08-30
### YouTube Auto-Publishing Integration & 30-Day Content Calendar Release
- **Official Google OAuth 2.0 Flow**: Secure server-side authorization code flow storing tokens securely in SQLite `oauth_connections` per tenant.
- **YouTube Data API v3 Upload Engine**: Resumable multipart video uploads with automatic token refresh, custom high-CTR thumbnails (`thumbnails.set`), metadata, tags, and privacy settings.
- **30-Day Content Calendar Integration**: Direct release planning with automated background publishing scheduler (`/api/scheduler/run`) and duplicate upload prevention.
- **Customer YouTube UI**: Elevated `/settings/publishing` with clear connection status, active channel metadata, disconnect actions, and default publishing preferences.
- **Dedicated YouTube QA Suite**: Automated test suite (`test-youtube-integration.ts`) verifying auth URLs, connection states, multi-tenant token isolation, and scheduled publishing.

## [2.0.0] - 2026-08-30
### Commercial SaaS Transformation & Enterprise Hardening
- **Customer Authentication**: Full customer lifecycle including Signup, Email Verification, Onboarding, Workspace creation, Login, Password Reset, Active Sessions, and Account Deletion.
- **Multi-Tenant Data Isolation**: Database-level query scoping (`WHERE user_id = ?`) across all projects, scenes, channels, OAuth tokens, and assets with automated penetration tests.
- **Billing Architecture**: Calculated pricing packages (Starter $19/mo, Pro $49/mo, Scale $99/mo, Agency $199/mo) with Annual 20% savings toggle and transaction ledgers.
- **AutoVideo AI Copilot**: Contextual AI studio assistant with real LLM execution for 9 distinct actions.
- **10-Stage Automation Pipeline**: Full state tracking (QUEUED, PROCESSING, COMPLETED, FAILED, RETRY) with native FFmpeg 1080p rendering.
- **Super Admin Separation**: HMAC-signed session tokens, isolated route protection, server diagnostics, and in-browser API key management.
- **Security & Secrets Gate**: Zero hardcoded secrets, sanitized environment variables, and comprehensive `.env.example`.

## [1.0.0] - 2026-08-01
### Initial Release
- Core video generator prototype with Edge TTS neural voiceover and Coverr stock video composition.
