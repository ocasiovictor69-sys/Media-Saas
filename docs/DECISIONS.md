# Flow Media — Architectural Decisions

## Decision 1: Cloudflare R2 for Asset Storage
**Decision:** Use Cloudflare R2 as the primary asset store for all video, audio, and image files.
**Rationale:** Zero egress fees — critical for high-volume video. S3-compatible API. Handles 4K raw footage natively.
**Alternatives considered:** Supabase Storage (egress fees at scale), AWS S3 (egress fees), GCS (egress fees).
**Impact:** All modules use R2 keys to reference assets. Supabase stores only metadata.

## Decision 2: Variation-Based Review
**Decision:** Every probabilistic output generates N variations (2 for video, 3 for scripts/thumbnails/captions). Human picks one.
**Rationale:** Avoids full reruns. Client always has a choice. Rerun only if all variations rejected.
**Alternatives considered:** Single output + revision loop (slow, expensive), unlimited variations (too costly).
**Impact:** `variations` table stores all outputs. `approvals` table tracks which was selected.

## Decision 3: Four Checkpoint Gates
**Decision:** Pipeline pauses at Checkpoint 1 (internal), Checkpoint 2 (client), Checkpoint 3 (first distribution), Checkpoint 4 (engagement rules).
**Rationale:** AI output is probabilistic — must be reviewed before going public. Autopilot kicks in after first approval.
**Alternatives considered:** Full autopilot (risky for brand), approve every piece (too slow).
**Impact:** `approvals` table gates every distribution. `campaigns.autopilot` flag controls post-first-approval behavior.

## Decision 4: Tool Separation by Responsibility
**Decision:** Each production tool has exactly one job. No tool overlaps another's role.
**Rationale:** Simplifies routing logic. Failures are isolated. Tools can be swapped without pipeline changes.
**Tool assignments:** Higgsfield=cinematic generation, HeyGen=avatars, Runway=AI editing, Remotion=branded overlays, FFmpeg=assembly+export, Sharp=static images.
**Impact:** mod3-produce routes to exactly one primary tool per job type. Fallback only for Higgsfield→Google AI Studio.

## Decision 5: Media-Only Boundary
**Decision:** Flow Media does not interpret business intent, route leads, or integrate with Agento/Aver/Aventra.
**Rationale:** Clean product separation. Flow Media's job is production and distribution only.
**Impact:** Comment classification stops at tone. No cross-product data sharing.

## Decision 6: Multi-Tenant from Day One
**Decision:** Every table has client_id. Supabase RLS enforces complete isolation.
**Rationale:** Real estate is launch vertical but platform must support any business. R2 prefixes are per-client.
**Impact:** All queries must include client_id. RLS policies on every table.

## Decision 7: Pure HTTP Clients — No Broken npm Dependencies
**Decision:** All third-party API clients (Runway, Higgsfield, HeyGen) are implemented as native fetch wrappers, not npm packages.
**Rationale:** Avoids npm registry integrity issues and peer dependency conflicts encountered in Agento. fetch is available natively in Node 18+.
**Alternatives considered:** Official SDKs (blocked by npm corruption issues), axios (unnecessary dependency).
**Impact:** Each service file exports a factory function returning a typed HTTP client object.
