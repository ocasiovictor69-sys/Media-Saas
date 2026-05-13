# Flow Media - Full Codebase Audit Report

**Auditor:** Cascade (AI Pair Programmer)
**Date:** May 11, 2026
**Project:** Flow-Media SaaS (`media-saas`)
**Stack:** Next.js 16.2.4, React 19, Tailwind CSS v4, Supabase, Cloudflare R2
**Total Files Read:** 60+
**Methodology:** GSD - every file read, no skipping, no assumptions

---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 10 |
| WARNING  | 14 |
| MINOR    | 12 |
| GAPS     | 9 |
| **TOTAL** | **45** |

---

## CRITICAL (10)

### C-01: `.env` committed with live API keys
**File:** `.env` (lines 7, 12)
**Issue:** Real HeyGen API key and Buffer token are committed in plaintext. Even though `.env*` is in `.gitignore`, the file exists locally and `.gitignore` may have been added after initial commit.
**Impact:** Credential exposure if repo is ever shared or leaked.

### C-02: No `middleware.ts` - proxy.ts is not auto-invoked
**File:** `src/proxy.ts`
**Issue:** Next.js 16 requires the file to be named `middleware.ts` at the project root or `src/middleware.ts`. The file is named `proxy.ts` and exports a function named `proxy`, not `middleware`. It will never execute.
**Impact:** Auth session management is broken. No route protection enforced via middleware. Unauthenticated users can hit protected pages directly.

### C-03: `SUPABASE_SERVICE_ROLE_KEY` is placeholder in `.env.local`
**File:** `.env.local` (line 3)
**Issue:** Value is `your-service-role-key`. All server-side operations using `createClient` from `@supabase/supabase-js` with service role (job-queue, raw-media, pipeline module) will fail.
**Impact:** Backend engine is non-functional until real key is set.

### C-04: Duplicate migration timestamps - will fail on `supabase db push`
**Files:** `20260510000001_add_cross_silo_events.sql` and `20260510000001_flowmedia_core_schema.sql`
**Issue:** Two migrations share timestamp `20260510000001`. Supabase CLI processes migrations in lexicographic order - unpredictable execution order and potential schema conflicts.
**Impact:** Schema deployment failure or data corruption.

### C-05: `teams` table referenced but never created
**File:** `20260506000001_flow_media_v2.sql` (lines 15, 37, 78)
**Issue:** `campaigns.team_id`, `media_assets.team_id`, and `generation_jobs.team_id` all reference `public.teams(id)`, but no migration creates a `teams` table.
**Impact:** Migration will hard-fail with `relation "public.teams" does not exist`.

### C-06: `profiles.team_id` column never created but queried everywhere
**Files:** `src/app/api/media/pipeline/route.ts` (line 21), `src/app/api/media/upload/route.ts` (line 23)
**Issue:** Code queries `profiles.team_id` but no migration adds this column to `profiles`. The initial schema only has `id, email, full_name, notification_preferences, created_at, updated_at`.
**Impact:** All pipeline/upload API routes return 403 "Team not found" for every user.

### C-07: Two parallel service layers with same external APIs
**Dirs:** `src/services/` and `src/lib/services/`
**Issue:** Poll route imports from `@/services/heygen` (job-queue pattern), while engine modules use `@/lib/services/heygen` (factory pattern). Both wrap the same APIs (HeyGen, Runway, Higgsfield) with different interfaces, creating two separate integration layers.
**Impact:** Currently functional but extremely fragile. Behavioral drift between the two layers is likely.

### C-08: `media_assets.job_id` FK declared before `generation_jobs` table exists
**File:** `20260506000001_flow_media_v2.sql` (line 61)
**Issue:** `media_assets` table creation includes inline FK to `generation_jobs`, but that table is defined later at line 76. Lines 108-111 attempt to add the constraint separately with `NOT VALID`, but the inline declaration on line 61 fails first.
**Impact:** Migration execution error.

### C-09: Two conflicting `campaigns` table definitions
**Files:** `20260506000001_flow_media_v2.sql` (line 12) and `20260510000001_flowmedia_core_schema.sql` (line 84)
**Issue:** Both migrations create `campaigns` with `CREATE TABLE IF NOT EXISTS` but completely different schemas - different columns, different status enums, different FK targets. Whichever runs first wins; the second is silently ignored.
**Impact:** One of two pipeline architectures is dead code. Schema and application code diverge.

### C-10: Password change does not verify current password
**File:** `src/app/(app)/dashboard/settings/page.tsx` (line 77)
**Issue:** `supabase.auth.updateUser({ password: pwForm.next })` is called without verifying the current password. The UI collects `current` password but never sends it.
**Impact:** Any authenticated session (including hijacked ones) can change the password without knowing the original.

---

## WARNING (14)

### W-01: `brand-purple` CSS class used but never defined in theme
**Files:** Multiple pages use `text-brand-purple`, `bg-brand-purple`, `ring-brand-purple/30`
**Issue:** `globals.css` defines `--color-brand-primary: #4F46E5` but never defines `--color-brand-purple`. Tailwind v4 requires explicit `@theme` definitions.
**Impact:** All `brand-purple` classes render as transparent/invisible unless Tailwind generates a fallback.

### W-02: Duplicate notification_preferences migrations (x4)
**Files:** `20260425000001` (line 11), `20260428000001`, `20260428000002`, `20260502000001`
**Issue:** The `notification_preferences` column is added 4 separate times across migrations with different default JSON values. The initial schema already includes it.
**Impact:** `IF NOT EXISTS` prevents hard errors, but conflicting defaults create unpredictable behavior.

### W-03: `.env.example` is incomplete - missing 20+ env vars
**File:** `.env.example`
**Issue:** Only lists 4 env vars. The codebase requires 25+: all R2 credentials, AI service keys, CRON_SECRET, Buffer/Zapier tokens, Remotion config, etc.
**Impact:** New developers cannot onboard without reading every source file.

### W-04: `cloudbuild.yaml` missing critical runtime secrets
**File:** `cloudbuild.yaml` (line 52)
**Issue:** Only deploys 4 secrets. Missing all AI service keys, R2 credentials, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, Buffer/Zapier tokens.
**Impact:** Deployed service has no backend engine functionality.

### W-05: R2 module uses `'use server'` directive incorrectly
**File:** `src/lib/services/r2.ts` (line 1)
**Issue:** `'use server'` is a React Server Actions directive. This file is a utility module, not a form action. The directive has no effect here and is misleading.
**Impact:** No runtime impact but indicates confusion about Next.js conventions.

### W-06: `mod3-produce` generators poll in-process with 5min blocking
**Files:** `src/lib/engine/modules/mod3-produce/generators/heygen.ts`, `higgsfield.ts`, `runway.ts`
**Issue:** Each generator polls in `while (attempts < 30)` loop with 8-10s delays (up to 5 minutes blocking). This runs during API route execution. Cloud Run default timeout is 300s.
**Impact:** Request timeouts kill the generation. The separate job-queue/poll mechanism exists but these modules do not use it.

### W-07: `README.md` is default create-next-app boilerplate
**File:** `README.md`
**Issue:** No project-specific documentation. References Vercel deployment despite Cloud Run being the target.
**Impact:** Zero onboarding value.

### W-08: Test expectations do not match module signatures (modd01)
**File:** `src/tests/modd01.test.ts` (line 21)
**Issue:** Test expects `result.manifest.script` to contain `'motivated_seller'`. The actual module returns `result.generatedTasks` (not `result.manifest`). The `manifest` property does not exist on `PreProductionResult`.
**Impact:** Test will always fail.

### W-09: Test expectations do not match module signatures (modd04)
**File:** `src/tests/modd04.test.ts` (line 14)
**Issue:** `EngagementInputs` requires `campaign_id` and `platform` properties. The test only provides `channel_id` and `lead_id`. TypeScript would catch this but Jest may not enforce types at runtime.
**Impact:** Test passes only because mocks swallow the missing params. Does not test actual behavior.

### W-10: Orchestrator constructor accepts loose interface, not `Services`
**File:** `src/lib/engine/orchestrator.ts`
**Issue:** The `FlowMediaOrchestrator` constructor accepts an inline object with `memory`, `creative`, `production`, `social` properties. But `src/app/api/media/pipeline/route.ts` passes stub implementations with console.log and mock URLs. The real `buildServices()` from `src/lib/services` is never used by the pipeline route.
**Impact:** Pipeline route runs entirely on stubs. No real AI generation or distribution occurs.

### W-11: `mod3-produce/index.ts` generator selection logic is hardcoded
**File:** `src/lib/engine/modules/mod3-produce/index.ts`
**Issue:** The module dispatches to HeyGen/Higgsfield/Runway based on job type, but the `services` parameter comes from `buildServices()` which may return `null` for unconfigured generators. No check before calling generator functions.
**Impact:** Null reference errors when a generator is not configured.

### W-12: Google AI Studio fallback returns empty array
**File:** `src/lib/engine/modules/mod3-produce/generators/higgsfield.ts` (line 45)
**Issue:** `generateGoogleAIFallback()` logs a message and returns `[]`. No actual Google AI Studio integration exists.
**Impact:** Higgsfield fallback silently produces zero outputs.

### W-13: `modd01-pre-production` uses deprecated Claude model
**File:** `src/lib/engine/modules/modd01-pre-production/index.ts` (line 108)
**Issue:** Uses `claude-3-5-sonnet-20240620`. While `ai.ts` uses `claude-sonnet-4-5`. Model version inconsistency across the codebase.
**Impact:** Inconsistent AI behavior. Older model may be deprecated.

### W-14: `modd03-distribution` claims Buffer API is "current" but uses deprecated v1 endpoint
**File:** `src/lib/engine/modules/modd03-distribution/index.ts` (line 52)
**Issue:** Comment says "Buffer Publish API (current - not deprecated v1)" but code hits `https://api.bufferapp.com/1/updates/create.json` which IS the deprecated v1 endpoint. Uses `profile_ids[]` instead of channel-based posting.
**Impact:** Buffer distribution may fail or produce errors on the deprecated API.

---

## MINOR (12)

### M-01: Root `page.tsx` just redirects to `/dashboard`
**File:** `src/app/page.tsx`
**Issue:** No landing/marketing page. All visitors are redirected to dashboard which requires auth.
**Impact:** No public-facing page for the product.

### M-02: Font conflict - Geist loaded in layout, Outfit loaded in globals.css
**Files:** `src/app/layout.tsx` (lines 5-13), `src/app/globals.css` (line 1)
**Issue:** Root layout loads Geist and Geist_Mono via `next/font/google`. `globals.css` imports Outfit via URL and sets it as `--font-sans`. Two font families loaded unnecessarily.
**Impact:** Extra network request. Geist font variables are set but never used in the UI.

### M-03: `description` and `platforms` columns added redundantly
**File:** `20260426000001_add_production_columns.sql`
**Issue:** Adds `description` and `platforms` to `productions`. Both already exist in the initial schema migration.
**Impact:** No-op migration. Adds confusion.

### M-04: No favicon or branding assets in `public/`
**File:** `public/`
**Issue:** Only contains default Next.js SVGs (file.svg, globe.svg, next.svg, vercel.svg, window.svg) and a default favicon.ico.
**Impact:** No Flow-Media branding. Shows default Next.js icon.

### M-05: `DECISIONS.md` Decision 5 contradicts `modd04-engagement`
**File:** `DECISIONS.md` (Decision 5), `src/lib/engine/modules/modd04-engagement/index.ts`
**Issue:** Decision 5 states "Flow Media does not interpret business intent, route leads, or integrate with Agento/Aver/Aventra." But modd04-engagement explicitly re-ingests high-intent comments to Agento via `cross_silo_events`.
**Impact:** Architectural documentation is incorrect.

### M-06: `robots.txt` blocks `/productions` but route is `/dashboard/productions`
**File:** `public/robots.txt`
**Issue:** Disallows `/productions` and `/settings` but actual routes are under `/dashboard/productions` and `/dashboard/settings`.
**Impact:** Robots rules have no effect on the actual protected routes.

### M-07: `sitemap.xml` includes auth pages
**File:** `public/sitemap.xml`
**Issue:** Includes `/login` and `/signup` which are behind auth redirects and offer no SEO value.
**Impact:** Search engines index login/signup pages unnecessarily.

### M-08: `new production` page writes directly to DB from client
**File:** `src/app/(app)/dashboard/productions/new/page.tsx`
**Issue:** Uses `createClient()` (browser client) to insert directly into `productions` table from the client component. The server action `createProduction` in `src/app/actions/productions.ts` exists but is unused.
**Impact:** Bypasses server-side validation. Inconsistent pattern with other pages.

### M-09: Settings page min password length inconsistency
**Files:** `src/app/(app)/dashboard/settings/page.tsx` (line 74), `src/app/(auth)/signup/page.tsx`
**Issue:** Settings requires 8 characters minimum. Signup requires 6 characters minimum.
**Impact:** Users who signed up with 6-7 char passwords cannot change password to similar length.

### M-10: `asset_type` check constraint in initial schema is too narrow
**File:** `20260425000001_initial_schema.sql` (line 60)
**Issue:** `assets.asset_type` is constrained to `('video','thumbnail','caption')`. But `media_assets.type` in v2 migration allows `('avatar','broll','cinematic','raw','composite')`. Two asset tables with different type enums.
**Impact:** Confusion about which table to use. Insert failures for v2 types in v1 table.

### M-11: `production.ts` has `any` type parameters
**File:** `src/lib/services/production.ts` (lines 67-68)
**Issue:** Fallback stub functions use `_raw: any`, `_script: any`, `_manifest: any`. No type safety.
**Impact:** Type errors hidden at compile time.

### M-12: `ffmpeg.ts` assumes local ffmpeg binary available
**File:** `src/lib/services/ffmpeg.ts` (line 41)
**Issue:** Calls `execFileAsync('ffmpeg', args)` which requires ffmpeg to be installed. Dockerfile uses `node:20-alpine` which does not include ffmpeg.
**Impact:** All FFmpeg operations will fail in production. No ffmpeg in Docker image.

---

## GAPS (9)

### G-01: No rate limiting on any API route
**Issue:** All API routes (`/api/jobs/*`, `/api/media/*`, `/api/engage/*`) have zero rate limiting. The cron poll endpoint only checks `CRON_SECRET` header.
**Impact:** Vulnerable to abuse. AI generation endpoints could rack up API costs.

### G-02: No CSRF protection
**Issue:** No CSRF tokens on any form or API endpoint. Server actions use `'use server'` but API routes do not validate origin.
**Impact:** Cross-site request forgery possible on all mutation endpoints.

### G-03: No health check endpoint
**Issue:** No `/api/health` or similar. Cloud Run health checks will fail or use root redirect.
**Impact:** Deployment health monitoring is blind.

### G-04: No error reporting service (Sentry, etc.)
**Issue:** All errors are `console.error` or `console.warn`. No external error tracking.
**Impact:** Production errors are invisible unless Cloud Logging is actively monitored.

### G-05: No test coverage for core pipeline modules (mod1-mod6)
**Issue:** Tests only exist for modd01-modd04 (orchestrator modules). The core pipeline modules (`mod1-intake` through `mod6-engage`), `media-router`, `pipeline`, `job-queue`, `cost-guard` have zero tests.
**Impact:** Core business logic is untested.

### G-06: No input validation/sanitization on API request bodies
**Files:** All `/api/jobs/*` routes
**Issue:** `brief`, `produce`, `distribute`, `comments` routes pass `await req.json()` directly to module `execute()` functions. No schema validation (zod, etc.).
**Impact:** Malformed or malicious payloads pass through unchecked.

### G-07: No Stripe integration despite billing migration
**File:** `20260502000004_add_billing_fields.sql`
**Issue:** Migration adds `subscription_active`, `stripe_customer_id`, `last_payment_failed_at` columns. No Stripe client, webhook handler, or billing UI exists.
**Impact:** Dead schema. No billing capability.

### G-08: No cron job configuration for job polling
**File:** `src/app/api/media/jobs/poll/route.ts`
**Issue:** The POST handler is documented as "should be called by a cron job every 10-15 seconds" with CRON_SECRET auth. No Cloud Scheduler job, cron configuration, or deployment script exists to set this up.
**Impact:** Generation jobs are submitted but never polled. They stay in `submitted` status forever.

### G-09: Two complete but incompatible pipeline architectures
**Issue:** The codebase contains two full pipeline implementations:
1. **v1 (mod1-mod6):** Job-based pipeline with intake, brief, produce, review, distribute, engage. Uses `clients`, `jobs`, `assets`, `briefs`, `variations`, `approvals` tables.
2. **v2 (modd01-modd04):** Campaign-based orchestrator with pre-production, post-production, distribution, engagement. Uses `campaigns`, `media_assets`, `generation_jobs` tables.

No documentation explains which is active or how they relate. The orchestrator in `orchestrator.ts` calls modd01-modd04. The API routes under `/api/jobs/*` call mod1-mod6. Both are wired but to different schemas.
**Impact:** Fundamental architectural confusion. Two complete systems, neither fully functional alone.

---

## Environment Variables Required (Full List)

| Variable | Used By | Status in .env.local |
|----------|---------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | All Supabase clients | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All Supabase clients | Set |
| `SUPABASE_SERVICE_ROLE_KEY` | job-queue, raw-media, pipeline | PLACEHOLDER |
| `CLOUDFLARE_ACCOUNT_ID` | R2 storage | PLACEHOLDER |
| `R2_ACCESS_KEY_ID` | R2 storage | PLACEHOLDER |
| `R2_SECRET_ACCESS_KEY` | R2 storage | PLACEHOLDER |
| `R2_BUCKET_NAME` | R2 storage | Set (flowmedia) |
| `HEYGEN_API_KEY` | HeyGen service | PLACEHOLDER |
| `HEYGEN_DEFAULT_AVATAR_ID` | Pre-production | Not set |
| `HEYGEN_DEFAULT_VOICE_ID` | Pre-production | Not set |
| `HIGGSFIELD_API_KEY` | Higgsfield service | PLACEHOLDER |
| `RUNWAY_API_KEY` | Runway service | PLACEHOLDER |
| `GOOGLE_AI_STUDIO_API_KEY` | Higgsfield fallback | PLACEHOLDER |
| `HERMES_API_URL` | AI chat service | Set (localhost) |
| `HERMES_API_KEY` | AI chat service | PLACEHOLDER |
| `ANTHROPIC_API_KEY` | Claude AI | PLACEHOLDER |
| `CRON_SECRET` | Job poll auth | Not set |
| `BUFFER_ACCESS_TOKEN` | Buffer distribution | Not set |
| `BUFFER_INSTAGRAM_CHANNEL_ID` | Buffer routing | Not set |
| `BUFFER_FACEBOOK_CHANNEL_ID` | Buffer routing | Not set |
| `BUFFER_LINKEDIN_CHANNEL_ID` | Buffer routing | Not set |
| `ZAPIER_DISTRIBUTION_WEBHOOK` | Zapier fallback | Not set |
| `REMOTION_SERVE_URL` | Remotion Lambda | Not set |
| `REMOTION_FUNCTION` | Remotion Lambda | Not set |
| `FFMPEG_SERVICE_URL` | FFmpeg service | Not set |
| `AWS_REGION` | Remotion Lambda | Not set |

---

## Files Read (Complete List)

### Root Config
- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`
- `jest.config.ts`, `Dockerfile`, `cloudbuild.yaml`, `.dockerignore`, `.gitignore`
- `.env`, `.env.local`, `.env.example`
- `README.md`, `DECISIONS.md`

### Public
- `robots.txt`, `sitemap.xml`, `favicon.ico`, SVG files (default)

### src/app (Root)
- `layout.tsx`, `page.tsx`, `not-found.tsx`, `globals.css`
- `auth/callback/route.ts`, `logout/page.tsx`

### src/app/(auth)
- `login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx`

### src/app/(app)
- `layout.tsx`
- `dashboard/page.tsx`
- `dashboard/productions/page.tsx`, `dashboard/productions/new/page.tsx`
- `dashboard/library/page.tsx`
- `dashboard/distribution/page.tsx`
- `dashboard/analytics/page.tsx`
- `dashboard/settings/page.tsx`

### src/app/actions
- `productions.ts`, `distribution.ts`

### src/app/api
- `jobs/intake/route.ts`, `jobs/brief/route.ts`, `jobs/produce/route.ts`
- `jobs/approve/route.ts`, `jobs/distribute/route.ts`
- `media/pipeline/route.ts`, `media/upload/route.ts`, `media/jobs/poll/route.ts`
- `engage/comments/route.ts`

### src/lib
- `hooks.ts`, `types.ts`, `cost-guard.ts`, `job-queue.ts`

### src/lib/supabase
- `client.ts`, `server.ts`, `middleware.ts`

### src/lib/services
- `index.ts`, `ai.ts`, `heygen.ts`, `higgsfield.ts`, `runway.ts`
- `r2.ts`, `ffmpeg.ts`, `production.ts`

### src/lib/engine
- `orchestrator.ts`, `event-bus.ts`, `pipeline.ts`

### src/lib/engine/modules
- `mod1-intake/index.ts`, `mod2-brief/index.ts`, `mod3-produce/index.ts`
- `mod3-produce/generators/heygen.ts`, `mod3-produce/generators/higgsfield.ts`, `mod3-produce/generators/runway.ts`
- `mod4-review/index.ts`, `mod5-distribute/index.ts`
- `mod5-distribute/channels/instagram.ts`, `mod5-distribute/channels/youtube.ts`
- `mod6-engage/index.ts`
- `media-router/index.ts`, `raw-media/index.ts`, `pipeline/index.ts`
- `modd01-pre-production/index.ts`, `modd02-post-production/index.ts`
- `modd03-distribution/index.ts`, `modd04-engagement/index.ts`

### src/services (separate layer)
- `heygen.ts`, `higgsfield.ts`, `runway.ts`

### src/tests
- `modd01.test.ts`, `modd02.test.ts`, `modd03.test.ts`, `modd04.test.ts`

### src
- `proxy.ts`

### supabase/migrations
- `20260425000001_initial_schema.sql`
- `20260426000001_add_production_columns.sql`
- `20260428000001_add_notification_prefs.sql`
- `20260428000002_fix_notification_prefs_name.sql`
- `20260502000001_add_notification_prefs.sql`
- `20260502000004_add_billing_fields.sql`
- `20260506000001_flow_media_v2.sql`
- `20260510000001_add_cross_silo_events.sql`
- `20260510000001_flowmedia_core_schema.sql`

### scripts
- `simulate_lifecycle.ts`

---

**End of Audit Report**
