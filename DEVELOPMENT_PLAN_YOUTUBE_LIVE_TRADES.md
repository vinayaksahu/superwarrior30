# Development Plan: YouTube Live Trades (AI Trade Clip Finder)
## Rahul Trade Warrior Academy — SuperWarrior30.com

---

## 1. Executive Summary & Architecture Overview

The **YouTube Live Trades** (internal module: **AI Trade Clip Finder**) is an add-on module integrated into the existing **SuperWarrior30 LMS** production codebase. It automatically ingests and analyzes Rahul Trade Warrior Academy's YouTube trading livestreams, extracts transcripts (supporting Hindi, English, and Hinglish), applies AI-assisted trading event detection according to Rahul's actual spoken setup criteria, constructs a verified Trade Story Timeline, and enables selective downloading and clip generation (Master MP4 & 9:16 Short) with silence acceleration and speech protection.

### Existing Architecture Discovery

1. **Framework & Runtime**: Next.js 16.3.2 (App Router), React 19.2.8, TypeScript 5.x, Node.js 20+.
2. **Styling & Components**: Tailwind CSS v4, Lucide icons (`lucide-react`), Sonner toasts (`sonner`), Dark-mode dashboard theme.
3. **Database & ORM**: PostgreSQL (hosted on Neon with connection pooling & direct URL support), Prisma ORM 7.9.1 (`@prisma/client`, `@prisma/adapter-pg`, generated to `src/generated/prisma`). Dynamic runtime schema synchronization via `src/lib/db-sync.ts`.
4. **Authentication**: Jose JWT sessions stored in HTTP-only cookies (`sw30_session`), device-bound tracking (`user_devices`), password hashing (`bcryptjs`), Email OTP verification (`nodemailer`).
5. **Authorization / RBAC**:
   - Roles: `SUPER_ADMIN`, `ADMIN` (`FULL_ACCESS_ADMIN`, `SUPPORT`, `VIEWER`, `FINANCE`, `MARKETING`), `CUSTOM_ROLE`, `STUDENT`.
   - Permissions system: `src/lib/permissions.ts` with `ALL_MODULES`, `ALL_PERMISSION_KEYS`, `ROLE_PRESETS`.
   - DAL guards: `requireAdmin()`, `requirePermission(perm)`, `hasPermission(user, perm)`.
6. **Admin Navigation**:
   - Desktop sidebar: `src/components/admin/admin-sidebar.tsx` (already contains `{ href: "/admin/live-trade-proofs", label: "YouTube Live Trades", icon: Video, requiredPermission: "courses.view" }`).
   - Mobile navigation: `src/components/admin/admin-header.tsx`.
   - Layout: `src/app/(admin)/admin/layout.tsx`.
7. **Media & Storage**:
   - Primary: Bunny CDN & Stream (`src/lib/bunny/index.ts`, `src/lib/bunny/stream.ts`).
   - Legacy / S3-compatible: Cloudflare R2 (`@aws-sdk/client-s3` in `src/lib/storage.ts`).
   - Local upload endpoint: `/api/upload` (used for screenshot uploads).
8. **Worker & Media Processing Infrastructure**:
   - Serverless Next.js web application must NOT be blocked by heavy AI/FFmpeg/Whisper workloads.
   - Modular background worker: runs asynchronously as a background task or decoupled worker daemon (supporting local Windows machine with Python 3.14 + FFmpeg 8.1.1 + yt-dlp + faster-whisper/WhisperX, or external GPU/VPS).

---

## 2. Database Changes (Existing Neon PostgreSQL via Prisma & db-sync)

The module introduces specialized models to track livestreams, transcripts, detected trades, trade events, RR milestones, processing jobs, ROI profiles, manual corrections, and settings without altering existing tables.

### Proposed Prisma Models:

1. **`YouTubeStream` (`youtube_streams`)**:
   - `id`: String (cuid)
   - `youtubeVideoId`: String (unique)
   - `url`: String
   - `title`: String
   - `thumbnailUrl`: String?
   - `channelTitle`: String?
   - `durationSec`: Int @default(0)
   - `publishedAt`: DateTime?
   - `transcriptStatus`: Enum/String (`PENDING`, `EXTRACTED`, `FAILED`, `FALLBACK_WHISPER`)
   - `analysisStatus`: Enum/String (`PENDING`, `ANALYZING`, `COMPLETED`, `FAILED`)
   - `status`: String @default("QUEUED")
   - `isTestData`: Boolean @default(false)
   - `createdAt`, `updatedAt`

2. **`TradeCandidate` (`trade_candidates`)**:
   - `id`: String (cuid)
   - `streamId`: String (FK -> `YouTubeStream.id`)
   - `tradeNumber`: Int
   - `instrument`: String (e.g., "XAUUSD", "EURUSD", "BANKNIFTY")
   - `direction`: String ("BUY" | "SELL")
   - `marketContext`: String?
   - `liquiditySummary`: String?
   - `marketStructureSummary`: String?
   - `priceActionSummary`: String?
   - `candleConfirmation`: String?
   - `entryCriteria`: String?
   - `plannedEntryPrice`: Float?
   - `plannedEntryTimestamp`: Float?
   - `actualEntryPrice`: Float?
   - `actualEntryTimestamp`: Float?
   - `stopLossPrice`: Float?
   - `stopLossTimestamp`: Float?
   - `takeProfitPrice`: Float?
   - `takeProfitTimestamp`: Float?
   - `plannedRR`: String? (e.g. "1:3")
   - `currentR`: String? (e.g. "2R")
   - `realizedR`: String? (e.g. "3R")
   - `riskStatus`: String @default("ACTIVE") ("ACTIVE" | "RISK_FREE" | "BREAKEVEN")
   - `result`: String @default("OPEN") ("TP" | "SL" | "BE" | "OPEN")
   - `confidence`: Float @default(0.0)
   - `completenessScore`: Float @default(0.0)
   - `clipStartSec`: Float?
   - `clipEndSec`: Float?
   - `isVerified`: Boolean @default(false)
   - `createdAt`, `updatedAt`

3. **`TradeEvent` (`trade_events`)**:
   - `id`: String (cuid)
   - `tradeId`: String (FK -> `TradeCandidate.id`)
   - `eventType`: String (e.g. `MARKET_CONTEXT`, `LIQUIDITY`, `MARKET_STRUCTURE`, `COC`, `CHoCH`, `BOS`, `MSS`, `PRICE_ACTION`, `CANDLE_CONFIRMATION`, `ENTRY_CRITERIA`, `PLANNED_ENTRY`, `ACTUAL_ENTRY`, `STOP_LOSS`, `TAKE_PROFIT`, `RISK_REWARD`, `CURRENT_R`, `RISK_FREE`, `BREAK_EVEN`, `TRADE_MANAGEMENT`, `PARTIAL_PROFIT`, `TRAILING_SL`, `EXIT`, `TRADE_COMPLETE`, `UNKNOWN`)
   - `timestampSec`: Float
   - `endTimestampSec`: Float?
   - `text`: String
   - `price`: Float?
   - `confidence`: String @default("UNKNOWN") ("HIGH" | "MEDIUM" | "LOW" | "UNKNOWN")
   - `source`: String @default("TRANSCRIPT") ("TRANSCRIPT" | "VISION" | "MANUAL")
   - `visualVerified`: Boolean @default(false)
   - `metadata`: Json? @db.JsonB
   - `createdAt`: DateTime @default(now())

4. **`TradeClip` (`trade_clips`)**:
   - `id`: String (cuid)
   - `tradeId`: String (FK -> `TradeCandidate.id`)
   - `masterVideoUrl`: String?
   - `shortVideoUrl`: String? (9:16)
   - `srtUrl`: String?
   - `metadataJsonUrl`: String?
   - `storageProvider`: String @default("BUNNY")
   - `renderDurationSec`: Float?
   - `status`: String @default("PENDING")
   - `createdAt`: DateTime @default(now())

5. **`TradeProcessingJob` (`trade_processing_jobs`)**:
   - `id`: String (cuid)
   - `streamId`: String?
   - `tradeId`: String?
   - `jobType`: String ("ANALYZE_STREAM" | "EXTRACT_TRANSCRIPT" | "GENERATE_CLIP" | "CHANNEL_SCAN")
   - `stage`: String ("QUEUED" | "DOWNLOADING" | "TRANSCRIBING" | "ANALYZING" | "DETECTING_TRADES" | "VISUAL_ANALYSIS" | "GENERATING_CLIP" | "RENDERING" | "COMPLETED" | "FAILED" | "CANCELLED")
   - `progressPercent`: Int @default(0)
   - `errorMessage`: String?
   - `logs`: Json? @db.JsonB
   - `startedAt`: DateTime?
   - `completedAt`: DateTime?
   - `createdAt`: DateTime @default(now())

6. **`TradeSettings` (`trade_settings`)**:
   - Key-value platform settings for AI provider (Gemini / OpenAI / Ollama), default silence acceleration speed (4x), Whisper model, max clip duration, ROI configurations.

---

## 3. Files to Modify & New Files

### Existing Files Modified:
- `src/lib/permissions.ts`:
  - Add module definition `youtube_live_trades` with actions `view`, `analyze`, `generate_clip`, `delete`, `settings`, `manage`.
  - Add default permissions to `ROLE_PRESETS.FULL_ACCESS_ADMIN`.
- `src/components/admin/admin-sidebar.tsx`:
  - Upgrade existing "YouTube Live Trades" link: set `requiredPermission: "youtube_live_trades.view"` and link to `/admin/youtube-live-trades` (with sublink or tab for existing Live Trade Proofs).
- `src/components/admin/admin-header.tsx`:
  - Update mobile nav link to `/admin/youtube-live-trades` with `youtube_live_trades.view`.
- `src/lib/db-sync.ts`:
  - Add idempotent table creations for `youtube_streams`, `trade_candidates`, `trade_events`, `trade_clips`, `trade_processing_jobs`, `trade_settings`.
- `prisma/schema.prisma`:
  - Add definitions for `YouTubeStream`, `TradeCandidate`, `TradeEvent`, `TradeClip`, `TradeProcessingJob`, `TradeSettings`.
- `.env.example`:
  - Document `GEMINI_API_KEY`, `AI_PROVIDER`, `OPENAI_API_KEY`, `WHISPER_MODEL`, `FFMPEG_PATH`, `YT_DLP_PATH`.

### New Files Created:
- **Pages & Routes**:
  - `src/app/(admin)/admin/youtube-live-trades/page.tsx`: Main dashboard with statistics, URL ingestion form, recent streams, filtering, tabs.
  - `src/app/(admin)/admin/youtube-live-trades/[streamId]/page.tsx`: Stream details, detected trades list, video preview, timeline inspector.
  - `src/app/(admin)/admin/youtube-live-trades/queue/page.tsx`: Processing queue UI.
  - `src/app/(admin)/admin/youtube-live-trades/settings/page.tsx`: Module settings (AI Provider, Silence speed, Whisper model, ROI profiles).
- **Server Actions**:
  - `src/server/actions/youtube-trades.actions.ts`:
    - `submitYouTubeStreamAction(url, options)`
    - `getYouTubeStreamsAction(filters)`
    - `getStreamWithTradesAction(streamId)`
    - `triggerTradeAnalysisAction(streamId)`
    - `triggerClipGenerationAction(tradeId)`
    - `updateTradeCandidateAction(tradeId, updates)`
    - `getProcessingJobsAction()`
    - `cancelProcessingJobAction(jobId)`
    - `scanYouTubeChannelAction(channelId, limit)`
- **AI Engine & Event Extraction**:
  - `src/lib/youtube-trades/ai-provider.ts`: Abstract interface (`AIProvider`) with implementations for Google Gemini and OpenAI-compatible endpoints.
  - `src/lib/youtube-trades/terminology.ts`: Rahul's Hindi/Hinglish vocabulary matcher (Liquidity, COC, CHoCH, BOS, MSS, Price Action, Candle Confirmation, Entry Criteria, RR, BE).
  - `src/lib/youtube-trades/state-machine.ts`: Trade State Machine enforcing strict validation to filter out hypothetical setups and only retain actual executed trades.
  - `src/lib/youtube-trades/timeline-builder.ts`: Reconstructs complete trade stories from earliest contextual event to final TP/SL/BE exit.
- **Worker & Media Processing Service**:
  - `scripts/trade_worker/`: Python 3.11+ modular processing worker (`worker.py`, `transcript_extractor.py`, `clip_generator.py`, `visual_verifier.py`).
  - Supports local execution on Windows with CPU or CUDA, and decoupled cloud/VPS deployment.
- **Components**:
  - `src/components/admin/youtube-trades/stream-ingest-card.tsx`
  - `src/components/admin/youtube-trades/stream-list-table.tsx`
  - `src/components/admin/youtube-trades/trade-timeline-viewer.tsx`
  - `src/components/admin/youtube-trades/video-player-annotated.tsx`
  - `src/components/admin/youtube-trades/trade-editor-modal.tsx`
  - `src/components/admin/youtube-trades/processing-queue-table.tsx`

---

## 4. Phased Implementation Roadmap

1. **Phase 1 (CURRENT)**:
   - Deep inspection of existing codebase (completed: Next 16, React 19, Prisma 7, Neon Postgres, Jose Auth, Bunny/R2 storage, permissions).
   - Author `DEVELOPMENT_PLAN_YOUTUBE_LIVE_TRADES.md`.
   - Update permissions in `src/lib/permissions.ts` to include `youtube_live_trades.*`.
   - Upgrade sidebar navigation without breaking existing items.
   - Run type checks and verify baseline stability.
2. **Phase 2**: Dashboard Shell & UI Integration (`/admin/youtube-live-trades`).
3. **Phase 3**: YouTube URL Ingestion & Metadata Fetcher.
4. **Phase 4**: Transcript Extraction (YouTube Captions first, Whisper fallback).
5. **Phase 5**: Trade Terminology & Event Extraction (Hindi/English/Hinglish).
6. **Phase 6**: Trade State Machine (Separating Planned vs Actual Trades).
7. **Phase 7**: Trade Story Timeline UI.
8. **Phase 8**: Dry-Run Trade Analysis Workflow.
9. **Phase 9**: Visual Chart & ROI Inspection (OpenCV / PySceneDetect).
10. **Phase 10**: Entry Detection & Multi-source Verification.
11. **Phase 11**: Risk:Reward (RR) Timeline Engine.
12. **Phase 12**: Trade Management (SL to BE, Trailing SL, Partials).
13. **Phase 13**: Selective Video Segment Download (yt-dlp timestamp download).
14. **Phase 14**: Clip Generation (Master Video MP4).
15. **Phase 15**: Silent Period Acceleration with Protected Speech.
16. **Phase 16**: Accurate Hindi/Hinglish Subtitles (.srt).
17. **Phase 17**: 9:16 Vertical Short Generation (Smart Crop).
18. **Phase 18**: Background Processing Queue UI.
19. **Phase 19**: Granular Admin Permissions Enforcement.
20. **Phase 20**: Channel Scanning for Livestreams.
21. **Phase 21**: Cloud & Local Storage Integration.
22. **Phase 22**: Comprehensive Automated Test Suite.
23. **Phase 23**: Production Build & Performance Hardening.

---

## 5. Security, Deployment & Rollback Strategy

### Security Considerations
- All endpoints and server actions strictly protected with `requirePermission("youtube_live_trades.view")` or specific action permissions.
- Secret API keys (Gemini, OpenAI, YouTube) kept strictly server-side in `.env` / environment variables.
- Input validation: YouTube URLs sanitized and validated against official YouTube URL regex patterns.
- Rate limiting on heavy analysis and video download requests.

### Deployment Strategy
- The Next.js web application handles ingestion, dashboard UI, timeline inspection, manual corrections, and dispatching processing jobs.
- Heavy computational tasks (video extraction, Whisper transcription, FFmpeg rendering) run via a modular worker architecture to ensure the Next.js server and LMS never experience CPU or memory spikes.

### Rollback Strategy
- All new database models are isolated; no existing tables are altered.
- All new pages reside in dedicated route paths (`/admin/youtube-live-trades`).
- If rollback is ever required, removing the route and permission entry leaves 100% of the existing LMS operational with zero side effects.
