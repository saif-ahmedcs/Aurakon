# Project Standing Rules

## 1. Same-origin rule

All backend requests must assume same-origin unless explicitly configured otherwise. No cross-origin logic unless required later in the project.

## 2. asyncHandler rule

All async route handlers must use a wrapper (asyncHandler) to avoid repeating try/catch blocks.

## 3. UTC dates rule

All dates stored in the database must be in UTC format. No local timezone storage.

Enforced by: `db.js` pool uses `timezone: "Z"` + `SET time_zone='+00:00'` on connect; all `created_at`/`opened_at` inserts use `UTC_TIMESTAMP()` explicitly; `process.env.TZ = "UTC"` is pinned at the top of every entry point (`server.js`, `scripts/cleanupUnverified.js`).

Verify: `TZ=America/Los_Angeles node manual-verification/test-timezoneSafety.js` — should pass identically under any TZ.
