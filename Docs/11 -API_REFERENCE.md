# Aurakon API Reference

Base path: `/api`
Format: JSON over HTTPS (HTTP in local development). All request and response bodies are `application/json`.

This document covers every route exposed by the Express backend (`Backend/routes/*.js`), the authentication model, cross-cutting behaviors, rate limits, error format, and the shared data shapes used across endpoints.

---

## Table of Contents

- [Authentication](#authentication)
- [Cross-Cutting Behaviors](#cross-cutting-behaviors)
- [Conventions](#conventions)
- [Errors](#errors)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [Health](#health)
  - [Auth](#auth-apiauth)
  - [Habits](#habits-apihabits)
  - [Review](#review-apireview)
  - [Progress](#progress-apiprogress)
  - [Profile](#profile-apiprofile)
  - [Demo](#demo-apidemo)
- [Shared Data Shapes](#shared-data-shapes)
- [Domain Constants](#domain-constants)

---

## Authentication

Aurakon uses short-lived JWT **access tokens** plus long-lived, rotating **refresh tokens**.

| Token | Transport | Lifetime | Notes |
|---|---|---|---|
| Access token | `Authorization: Bearer <token>` header | 15 minutes | JWT, HS256, payload `{ sub: userId }` |
| Refresh token | `refreshToken` httpOnly cookie, scoped to `Path=/api/auth` | 50 days | Rotated on every use; `Secure` + `SameSite=Strict` in production |

- Protected routes require the `Authorization: Bearer <accessToken>` header. Missing or invalid tokens return `401`.
- To get a new access token, call `POST /api/auth/refresh`. The browser sends the `refreshToken` cookie automatically; no body is needed. A new access token **and** a rotated refresh cookie are returned.
- **Refresh token reuse detection**: each refresh token can only be used once. Reusing an already-used token immediately revokes *all* sessions for that user (a sign the token was stolen/replayed), except for a 5-second grace window that tolerates duplicate requests from the same client (e.g. React double-invoke).
- A user may have at most **5 active sessions** (refresh tokens) at a time; logging in again beyond that evicts the oldest session.
- `POST /api/auth/logout` and `POST /api/auth/logout-all` clear the refresh cookie. `logout-all` also revokes every refresh token for the account.
- Several account-mutation endpoints (change password, reset password, confirm email change) revoke **all** refresh tokens for the account as a side effect, forcing re-login everywhere.

---

## Cross-Cutting Behaviors

### Pending-review reconciliation (`finalizeReviews`)

Every authenticated route under `/api/habits`, `/api/review`, `/api/progress`, and `/api/profile` runs a `finalizeReviews` step before the route handler. It silently evaluates any of the user's pending habit reviews whose review window has elapsed, resolves them, and recalculates any streaks, Guardian Shields, and consistency bonuses that shift as a result — independent of whatever the endpoint itself does.

The outcome of that reconciliation is merged into **every response** on those routers as:

```json
{
  "affectedHabitIds": [12, 47],
  "reversedBonuses": [ /* Bonus[] */ ],
  "reversedShields": [ /* Shield[] */ ],
  "earnedBonuses": [ /* Bonus[] */ ],
  "earnedShields": [ /* Shield[] */ ]
}
```

Most habit/review-mutating endpoints (`POST /api/habits`, `POST /api/habits/:id/logs`, `DELETE /api/habits/:id`, `DELETE /api/habits/:id/logs/:date`, `POST /api/review/decisions`) additionally merge their *own* direct bonus/shield/streak effects into these same arrays and report the resulting `level`. Clients should treat these fields as "what changed as a side effect of this request" and refresh any cached habit/progress state for the listed `affectedHabitIds`.

### Ownership checks

Every `/api/habits/:id...` route validates that `:id` is a positive integer and belongs to the authenticated user via `req.habit` / `req.habitId`. A non-numeric or non-positive `id` returns `400`; an id that doesn't belong to the caller (or doesn't exist) returns `404 habit not found`.

### Gender gate

`/api/review/*` requires the authenticated user to have a `gender` set on their profile (`403 gender must be set before accessing this resource` otherwise). `POST /api/auth/register` always collects gender, so this mainly guards edge cases such as legacy or partially-provisioned accounts; use `PATCH /api/auth/gender` to satisfy it.

---

## Conventions

- **Dates** (calendar days, e.g. a habit log date) are plain `YYYY-MM-DD` strings, evaluated in the *user's own timezone* (stored on their account, defaults to `UTC`). "Today" for validation purposes is computed server-side from that timezone.
- **Timestamps** (e.g. `createdAt`) are ISO 8601 UTC strings, e.g. `"2026-09-05T14:32:01.000Z"`.
- Request bodies are validated with [Zod](https://zod.dev); invalid input returns `400` with a `fields` array (see [Errors](#errors)).
- All numeric IDs are positive integers.

---

## Errors

Errors share one JSON envelope:

```json
{ "error": "human-readable message" }
```

Additional optional fields:

| Field | When present | Description |
|---|---|---|
| `fields` | Validation failures (`400`) | `[{ "path": "email", "message": "Invalid email" }, ...]` |
| `retryAfter` | `429` responses (and some `403`/`409` cooldowns) | Seconds until the action may be retried. Also sent as a `Retry-After` header. |

### Status codes

| Code | Meaning |
|---|---|
| `400` | Validation error, malformed JSON body, or a business-rule violation reported as a bad request (e.g. invalid date) |
| `401` | Missing/invalid/expired access token, invalid credentials, invalid refresh token |
| `403` | Email not verified at login, gender not set, forbidden action |
| `404` | Resource not found (habit not found, route not found) |
| `409` | Conflict — duplicate resource, concurrent modification, business-rule conflict (e.g. habit limit reached, already logged) |
| `413` | Request body too large |
| `429` | Rate limited or a cooldown window hasn't elapsed |
| `500` | Unhandled server error |

---

## Rate Limiting

Rate limits use a sliding window per key (client IP, user ID, email, or a hash of the refresh token, depending on the endpoint) and return `429` with `Retry-After` once exceeded. A global limiter of **300 requests/minute per IP** applies to the entire API in addition to the endpoint-specific limits below.

| Endpoint | Limit(s) |
|---|---|
| `POST /api/auth/register` | 5 / 15 min per IP · 3 / hour per email |
| `PATCH /api/auth/gender` | 10 / 15 min per user |
| `GET /api/auth/verify-email` | 5 / 15 min per IP |
| `POST /api/auth/verify-email/confirm` | 5 / 15 min per IP |
| `POST /api/auth/resend-verification` | 3 / 15 min per IP+email · 7 / 15 min per IP |
| `POST /api/auth/login` | 10 / 15 min per IP+email · 10 / 15 min per email · 25 / 15 min per IP |
| `POST /api/auth/forgot-password` | 1 / 15 min per IP+email · 3 / 24 h per IP+email · 10 / 15 min per IP |
| `GET /api/auth/reset-password` | 5 / 15 min per IP |
| `POST /api/auth/reset-password` | 5 / 15 min per IP |
| `POST /api/auth/change-password` | 3 / hour per user · 3 / 24 h per user |
| `POST /api/auth/refresh` | 40 / 15 min per refresh-token hash (or IP) |
| `POST /api/auth/logout` | 30 / 15 min per IP |
| `POST /api/auth/logout-all` | 3 / 15 min per user |
| `PATCH /api/auth/timezone`, `/username`, `POST /email/cancel`, `/delete-account/cancel` | 10 / 15 min per user |
| `PATCH /api/auth/email`, `POST /email/resend` | 5 / 15 min per user |
| `GET /api/auth/verify-email-change` | 10 / 15 min per IP |
| `POST /api/auth/verify-email-change/confirm` | 10 / 15 min per IP |
| `POST /api/auth/delete-account/request` | 2 / hour per user |
| `GET /api/auth/delete-account/verify` | 10 / 15 min per IP |
| `POST /api/auth/delete-account/confirm` | 10 / 15 min per IP |
| `GET /api/auth/me` | 60 / min per user |
| `POST /api/demo/start` | 5 / 10 min per IP |
| Any authenticated `/api/habits`, `/api/review`, `/api/progress`, `/api/profile` route | 60 / min per user |
| `POST /api/review/decisions` | 6 / min per user (in addition to the 60/min surface limit) |

---

## Endpoints

### Health

#### `GET /api/health`

No authentication. Liveness check.

**Response `200`**
```json
{ "status": "ok" }
```

---

### Auth (`/api/auth`)

#### `POST /api/auth/register`

Create an account. Email verification is required before login.

**Body**
```json
{
  "email": "user@example.com",
  "password": "at least 8 chars, 1 letter + 1 number",
  "username": "3-20 chars",
  "gender": "male | female",
  "timezone": "IANA timezone string (optional)"
}
```
If `timezone` is omitted or invalid, the account defaults to `UTC`.

**Response `201`**
```json
{ "id": 1, "email": "user@example.com", "username": "alex", "gender": "male" }
```

**Errors**: `409 email already registered` · `400` validation.

---

#### `PATCH /api/auth/gender` 🔒

Sets gender exactly once (cannot be changed afterward via this endpoint).

**Body**: `{ "gender": "male" | "female" }`

**Response `200`**: `{ "gender": "male" }`

**Errors**: `409 gender has already been set and cannot be changed`

---

#### `GET /api/auth/verify-email?token=...`

Checks an email-verification token's validity without consuming it (used by the frontend to pre-validate before showing a confirm button).

**Response `200`**: `{ "message": "Token verified. Submit a final confirmation to verify your email." }`
or, if already used: `{ "message": "Email already verified.", "alreadyCompleted": true }`

**Errors**: `400 invalid or expired token`

---

#### `POST /api/auth/verify-email/confirm`

Consumes the token and marks the account verified.

**Body**: `{ "token": "..." }`

**Response `200`**: `{ "message": "email verified successfully" }`

**Errors**: `400 invalid or expired token`

---

#### `POST /api/auth/resend-verification`

**Body**: `{ "email": "user@example.com" }`

**Response `200`** (always the same message, regardless of whether the account exists, to prevent email enumeration):
```json
{ "message": "If an account exists, a verification email has been sent." }
```
Subject to a 2-minute cooldown per account internally (silently ignored, not surfaced as an error).

---

#### `POST /api/auth/login`

**Body**: `{ "email": "user@example.com", "password": "..." }`

**Response `200`**: `{ "accessToken": "<jwt>" }` — also sets the `refreshToken` cookie.

**Errors**
- `401 invalid credentials`
- `403 please verify your email before logging in`
- `429 account temporarily locked due to too many failed login attempts` — after 10 failed attempts, locked for 15 minutes; response includes `retryAfter`.

---

#### `POST /api/auth/forgot-password`

**Body**: `{ "email": "user@example.com" }`

**Response `200`** (generic, anti-enumeration): `{ "message": "If an account exists, a password reset email has been sent." }`

---

#### `GET /api/auth/reset-password?token=...`

Checks a password-reset token's validity without consuming it.

**Response `200`**: `{ "message": "Token verified. Submit a new password to complete the reset." }`
or `{ "message": "Password already reset.", "alreadyCompleted": true }`

**Errors**: `400 invalid or expired token`

---

#### `POST /api/auth/reset-password`

Consumes the token and sets a new password. Also clears the refresh cookie and revokes all sessions.

**Body**
```json
{ "token": "...", "email": "user@example.com", "newPassword": "at least 8 chars, 1 letter + 1 number" }
```

**Response `200`**: `{ "message": "password reset successfully" }`

**Errors**
- `400 invalid or expired token`
- `400 new password must be different from the current password`
- `409 password was changed concurrently, please retry`
- `409 this token was already used to reset the password to a different value`

---

#### `POST /api/auth/change-password` 🔒

Also clears the refresh cookie and revokes **all** sessions for the account.

**Body**: `{ "currentPassword": "...", "newPassword": "at least 8 chars, 1 letter + 1 number" }`

**Response `200`**: `{ "message": "password changed successfully" }`

**Errors**
- `401 invalid current password`
- `400 new password must be different from the current password`
- `409 password was changed concurrently, please retry`

---

#### `POST /api/auth/refresh`

Reads the `refreshToken` cookie (no body). Rotates the refresh token and issues a new access token.

**Response `200`**: `{ "accessToken": "<jwt>" }` — sets a new `refreshToken` cookie.

**Errors**
- `401 missing refresh token`
- `401 invalid refresh token`
- `401 token_already_used` (reuse detected within the 5s grace window)
- `401 refresh token expired`

---

#### `POST /api/auth/logout`

Reads the `refreshToken` cookie, revokes it, and clears the cookie. Safe to call with no cookie present.

**Response `200`**: `{ "message": "logged out successfully" }`

---

#### `POST /api/auth/logout-all` 🔒

Revokes every refresh token belonging to the user and clears the cookie.

**Response `200`**: `{ "message": "logged out from all devices" }`

---

#### `PATCH /api/auth/timezone` 🔒

**Body**: `{ "timezone": "IANA timezone string" }`

**Response `200`**: `{ "timezone": "America/New_York" }`

---

#### `PATCH /api/auth/username` 🔒

**Body**: `{ "username": "3-20 chars" }`

**Response `200`**: `{ "username": "alex" }`

**Errors**: `429` — username can only be changed once every **15 days**; message includes the next-eligible timestamp, `retryAfter` gives seconds remaining.

---

#### `PATCH /api/auth/email` 🔒

Requests an email change; sends a verification link to the **new** address.

**Body**: `{ "newEmail": "new@example.com", "currentPassword": "..." }`

**Response `200`**: `{ "message": "A verification email has been sent to your new email address." }`
or, if unchanged: `{ "message": "This is already your current email address." }`

**Errors**
- `401 invalid current password`
- `409 email already registered`
- `409 password was changed concurrently, please retry`

---

#### `POST /api/auth/email/resend` 🔒

Resends the pending email-change verification link.

**Response `200`**: `{ "message": "A verification email has been sent to your new email address." }`

**Errors**: `400 no pending email change request` · `409 email already registered` (auto-cancels the pending request)

---

#### `POST /api/auth/email/cancel` 🔒

**Response `200`**: `{ "message": "pending email change cancelled" }`

**Errors**: `400 no pending email change request`

---

#### `GET /api/auth/verify-email-change?token=...`

Checks an email-change token's validity without consuming it.

**Response `200`**: `{ "message": "Token verified. Submit a final confirmation to change your email." }`
or `{ "message": "Email already changed.", "alreadyCompleted": true }`

**Errors**: `400 invalid or expired token`

---

#### `POST /api/auth/verify-email-change/confirm` 🔒

Consumes the token and applies the pending email change. Revokes all refresh tokens for the account.

**Body**: `{ "token": "...", "currentPassword": "..." }`

**Response `200`**: `{ "message": "email changed successfully" }`

**Errors**
- `401 invalid current password`
- `400 invalid or expired token`
- `409 This email address is no longer available. Please request a new email change.`

---

#### `POST /api/auth/delete-account/request` 🔒

Sends a confirmation email to permanently delete the account.

**Response `200`**: `{ "message": "A confirmation email has been sent to your registered email address." }`

**Errors**: `429` cooldown before another deletion email can be requested.

---

#### `POST /api/auth/delete-account/cancel` 🔒

**Response `200`**: `{ "message": "pending account deletion cancelled" }`

**Errors**: `400 no pending account deletion request`

---

#### `GET /api/auth/delete-account/verify?token=...`

Checks a deletion token's validity without consuming it.

**Response `200`**: `{ "message": "Token verified. Submit a final confirmation to permanently delete your account." }`
or `{ "message": "Account already deleted.", "alreadyCompleted": true }`

**Errors**: `400 invalid or expired token`

---

#### `POST /api/auth/delete-account/confirm`

🔒 Uses a special auth path that still accepts the caller's access token for a short window *even after* the underlying account row has been deleted (so the confirmation response can be returned). This **permanently and irreversibly deletes the account and all of its habits/logs**. Clears the refresh cookie.

**Body**: `{ "token": "...", "currentPassword": "..." }`

**Response `200`**: `{ "message": "Account permanently deleted." }`

**Errors**: `400 invalid or expired token` · `401 invalid current password`

---

#### `GET /api/auth/me` 🔒

Returns the caller's account/profile info.

**Response `200`**
```json
{
  "email": "user@example.com",
  "createdAt": "2026-01-15T10:00:00.000Z",
  "gender": "male",
  "timezone": "America/New_York",
  "timezoneSource": "manual"
}
```
`timezoneSource` is `"detected"` (from the client's `Intl` guess at signup), `"default"` (fell back to UTC), or `"manual"` (explicitly set via `PATCH /api/auth/timezone`).

---

### Habits (`/api/habits`)

All routes require authentication and are subject to [pending-review reconciliation](#cross-cutting-behaviors). Every response below also includes the reconciliation fields (`affectedHabitIds`, `reversedBonuses`, `reversedShields`, `earnedBonuses`, `earnedShields`) unless noted; they're omitted here for brevity except where an endpoint adds meaningfully to them.

#### `GET /api/habits/` 🔒

Lists all of the caller's non-archived habits with any pending reviews attached.

**Response `200`**: `Habit[]` (see [Habit](#habit))

---

#### `POST /api/habits/` 🔒

Creates a habit. Subject to a level-based active habit limit and a daily creation cap equal to `level habit limit + 3` (see [Habit limits](#habit-limits-by-level)).

**Body**: `{ "title": "1-50 chars", "difficulty": "easy" | "medium" | "hard" }`

**Response `201`**
```json
{
  "id": 12, "title": "Read 20 pages", "difficulty": "medium", "userId": 1,
  "createdAt": "2026-09-05T08:00:00.000Z", "archivedAt": null,
  "shieldDeferredSince": null, "currentStreak": 0, "longestStreak": 0,
  "pendingReview": null, "level": 3,
  "affectedHabitIds": [], "reversedBonuses": [], "reversedShields": [],
  "earnedBonuses": [], "earnedShields": []
}
```

**Errors**
- `409 Habit limit reached for your current level.`
- `409 Daily habit creation limit reached. Try again tomorrow.`

---

#### `GET /api/habits/:id` 🔒

**Response `200`**: `Habit` + reconciliation fields.

**Errors**: `404 habit not found` · `400` if `:id` isn't a positive integer.

---

#### `PATCH /api/habits/:id` 🔒

Renames a habit. Difficulty cannot be changed after creation.

**Body**: `{ "title": "1-50 chars" }`

**Response `200`**: `Habit` + reconciliation fields + `level`.

---

#### `DELETE /api/habits/:id` 🔒

Soft-archives the habit (`archivedAt` set) — history is preserved. If today's completion had already been logged, it's reversed and progression is recalculated. Any of the habit's open pending reviews are auto-resolved as `missed`.

**Response `200`**
```json
{
  "message": "Habit deleted successfully",
  "affectedHabitIds": [12],
  "consistencyBonuses": [],
  "reversedBonuses": [],
  "reversedShields": [],
  "earnedBonuses": [],
  "earnedShields": [],
  "level": 3
}
```

**Errors**: `404 habit not found`

---

#### `POST /api/habits/:id/logs` 🔒

Logs a completion. Two modes, both taking the same body:

1. **Today's completion** — `date` must equal "today" in the user's timezone. Creates a new `completed` log (`created: true`, `201`).
2. **Recovering a missed day** — if `date` matches an existing *pending review* for this habit, that pending log is resolved as `recovered` instead (`created: false`, `200`). Dates that are neither today nor an open pending review are rejected.

**Body**: `{ "date": "YYYY-MM-DD" }` (cannot be in the future, per the user's timezone)

**Response `200`/`201`**
```json
{
  "log": { "id": 501, "habitId": 12, "date": "2026-09-05", "status": "completed", "reviewSessionId": null, "createdAt": "2026-09-05T08:05:00.000Z" },
  "created": true,
  "shieldEarned": false,
  "shieldBalance": 1,
  "currentStreak": 5,
  "longestStreak": 12,
  "affectedHabitIds": [],
  "consistencyBonuses": [],
  "reversedBonuses": [],
  "reversedShields": [],
  "earnedBonuses": [],
  "earnedShields": [],
  "level": 3
}
```

**Errors**
- `404 habit not found`
- `400 log date cannot be before the habit's creation date`
- `409 habit already logged for this date`
- `409 This date is outside the loggable window. Missed days must be recovered through the pending review system before their review window expires.`

---

#### `GET /api/habits/:id/logs` 🔒

**Response `200`**: `HabitLog[]` — the full log history for the habit (see [HabitLog](#habitlog)).

---

#### `DELETE /api/habits/:id/logs/:date` 🔒

Undoes **today's** completion only. Anything resolved via the pending-review system is final and cannot be undone here.

**Response `200`**
```json
{
  "message": "Log undone successfully",
  "currentStreak": 4, "longestStreak": 12,
  "affectedHabitIds": [], "reversedBonuses": [], "reversedShields": [],
  "earnedBonuses": [], "earnedShields": [], "level": 3
}
```

**Errors**
- `409 Only today's log can be undone. Past dates must be handled through the pending review system.`
- `409 only completed logs can be undone`

---

### Review (`/api/review`)

All routes require authentication, a gender set on the profile (see [Gender gate](#gender-gate)), and are subject to reconciliation.

#### `GET /api/review/pending` 🔒

Lists every habit with unresolved missed days awaiting a decision, plus whether the frontend should auto-pop the review modal.

**Response `200`**
```json
{
  "pending": [
    {
      "habitId": 12,
      "title": "Read 20 pages",
      "pendingReview": {
        "reviewSessionId": 88,
        "missedDates": ["2026-09-02", "2026-09-03"],
        "createdAt": "2026-09-04T00:05:00.000Z"
      }
    }
  ],
  "totalHabits": 6,
  "pendingCount": 1,
  "autoPopupThreshold": 3,
  "shouldAutoPopup": false,
  "affectedHabitIds": [], "reversedBonuses": [], "reversedShields": [],
  "earnedBonuses": [], "earnedShields": []
}
```
`autoPopupThreshold` is `3` when the user has fewer than 6 habits, otherwise `floor(totalHabits / 2)`. `shouldAutoPopup` is true once `pendingCount` reaches that threshold.

---

#### `POST /api/review/decisions` 🔒

Resolves one or more pending missed days. Processed in a single transaction, sorted by date, and recalculates XP, streaks, Guardian Shields, and consistency bonuses across all affected habits.

**Body**
```json
{
  "decisions": [
    { "habitId": 12, "missedDate": "2026-09-02", "decision": "completed" },
    { "habitId": 12, "missedDate": "2026-09-03", "decision": "missed", "useShield": true }
  ]
}
```
- 1–50 items.
- `decision`: `"completed"` (marks the day recovered) or `"missed"` (confirms the miss).
- `useShield` is only valid alongside `decision: "missed"` — spends a Guardian Shield to convert the miss into a `shielded` (non-breaking) day if one is available.

**Response `200`**
```json
{
  "results": [
    { "habitId": 12, "missedDate": "2026-09-02", "result": "recovered" },
    { "habitId": 12, "missedDate": "2026-09-03", "result": "shielded" }
  ],
  "consistencyBonuses": [],
  "affectedHabitIds": [],
  "reversedBonuses": [], "reversedShields": [],
  "earnedBonuses": [], "earnedShields": [],
  "shieldBalance": 0,
  "shieldEarned": false,
  "level": 3
}
```
Each `results[]` entry's `result` is one of: `recovered`, `missed`, `shielded`, `missed_no_shield` (shield requested but none available), or `not_found` (no matching pending review — e.g. already resolved).

---

### Progress (`/api/progress`)

#### `GET /api/progress/` 🔒

The player's overall XP/level/streak snapshot (subject to reconciliation).

**Response `200`**
```json
{
  "totalXp": 4200,
  "title": "Rising Warrior",
  "titles": [
    { "title": "Legendary Soul", "minXp": 90000, "current": false },
    { "title": "Rising Warrior", "minXp": 3500, "current": true },
    { "title": "New Soul", "minXp": 0, "current": false }
  ],
  "nextRank": { "title": "Iron Will", "xpNeeded": 3300 },
  "level": 3,
  "auraEnergyToday": 40,
  "globalDailyStreak": 12,
  "shieldBalance": 1,
  "affectedHabitIds": [], "reversedBonuses": [], "reversedShields": [],
  "earnedBonuses": [], "earnedShields": []
}
```
`titles` is always the full ordered list of tiers (see [Titles](#titles-by-total-xp)) with `current` flagging the caller's tier. `nextRank` is `null` at the top tier.

---

### Profile (`/api/profile`)

#### `GET /api/profile/` 🔒

A lighter-weight snapshot used for header/profile UI (subject to reconciliation).

**Response `200`**
```json
{
  "username": "alex",
  "level": 3,
  "totalXp": 4200,
  "title": "Rising Warrior",
  "shieldBalance": 1,
  "affectedHabitIds": [], "reversedBonuses": [], "reversedShields": [],
  "earnedBonuses": [], "earnedShields": []
}
```

---

### Demo (`/api/demo`)

#### `POST /api/demo/start`

No authentication. Provisions a brand-new, fully-seeded throwaway account (`demo+<uuid>@aurakon.app`) and logs into it immediately — useful for a "try it out" flow with no signup.

**Response `200`**: `{ "accessToken": "<jwt>" }` — sets the `refreshToken` cookie, same as a normal login. Demo accounts are cleaned up automatically after expiry.

---

## Shared Data Shapes

#### Habit
```json
{
  "id": 12,
  "title": "Read 20 pages",
  "difficulty": "easy | medium | hard",
  "userId": 1,
  "createdAt": "ISO timestamp",
  "archivedAt": "ISO timestamp | null",
  "shieldDeferredSince": "YYYY-MM-DD | null",
  "currentStreak": 5,
  "longestStreak": 12,
  "pendingReview": "PendingReviewGroup | null"
}
```

#### HabitLog
```json
{
  "id": 501,
  "habitId": 12,
  "date": "YYYY-MM-DD",
  "status": "completed | missed | shielded | recovered | pending",
  "reviewSessionId": 88,
  "createdAt": "ISO timestamp"
}
```

#### PendingReviewGroup
```json
{
  "reviewSessionId": 88,
  "missedDates": ["2026-09-02", "2026-09-03"],
  "createdAt": "ISO timestamp"
}
```
`null` when the habit has no open pending review.

#### Bonus (in `earnedBonuses`)
```json
{ "bonusType": "7day | 30day", "delta": 350, "totalXp": 4200, "title": "Rising Warrior" }
```

#### Bonus (in `reversedBonuses`)
```json
{ "bonusType": "7day | 30day", "awardedAt": "YYYY-MM-DD", "delta": -350, "totalXp": 3850, "title": "Elite Disciple" }
```

#### Shield (in `earnedShields`)
```json
{ "habitId": 12, "milestone": 45, "streakStartDate": "YYYY-MM-DD", "awardedAt": "YYYY-MM-DD" }
```

#### Shield (in `reversedShields`)
```json
{ "habitId": 12, "milestone": 45, "streakStartDate": "YYYY-MM-DD", "awardedAt": "YYYY-MM-DD", "wasSpent": false }
```

---

## Domain Constants

These power the limits and thresholds referenced above (`Backend/utils/*Rules.js`, `titleThresholds.js`).

#### Habit limits by level
| Level | Max active habits | Daily creation limit |
|---|---|---|
| 1–7 | 5 | 8 |
| 8–14 | 7 | 10 |
| 15–19 | 9 | 12 |
| 20–29 | 10 | 13 |
| 30+ | 12 | 15 |

A user can create at most `level habit limit + 3` *new* habits per calendar day (in their own timezone), even if they archive/delete habits throughout the day.

#### Guardian Shield milestones
Shields are earned automatically at streak milestones, only for eligible difficulties:

| Difficulty | Milestone interval |
|---|---|
| easy | never earns shields |
| medium | every 45-day habit streak |
| hard | every 30-day habit streak |

A shield is auto-spent (with `useShield: true` in `POST /api/review/decisions`) to convert a missed day into `shielded` instead of breaking the streak.

#### Consistency bonus thresholds
Global (all-habits) full-completion streaks earn one-time XP bonuses:

| Bonus type | Streak length |
|---|---|
| `7day` | every 7 consecutive fully-completed days |
| `30day` | every 30 consecutive fully-completed days |

#### Titles by total XP
| Title | Min. total XP |
|---|---|
| Legendary Soul | 90,000 |
| Mythic Champion | 55,000 |
| Commander | 30,000 |
| Aura Master | 15,000 |
| Iron Will | 7,500 |
| Rising Warrior | 3,500 |
| Elite Disciple | 1,500 |
| Disciplined Mind | 500 |
| New Soul | 0 |

---

_🔒 = requires `Authorization: Bearer <accessToken>`_
