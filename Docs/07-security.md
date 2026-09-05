# Security Architecture

The concrete security controls implemented across the authentication/account
boundary, and the trust boundaries they establish. This document describes
what exists; the reasoning behind each choice lives in
`08-authentication-engineering-decisions.md`.

## Password hashing

- bcrypt, cost factor from `BCRYPT_SALT_ROUNDS` (env-configurable, default
  12).
- Applied on registration, authenticated password change, and password
  reset. Plaintext passwords are never stored, logged, or compared with
  anything other than `bcrypt.compare`.
- Input passwords are capped at 72 characters (`registerSchema`,
  `resetPasswordSchema`, `changePasswordSchema`) to match bcrypt's effective
  input limit.

## Input validation

Every mutating auth request is validated by a Zod schema
(`middleware/schemas/authSchemas.js`) via `middleware/validate.js` before it
reaches the service layer. Validation failures short-circuit with 400 and
per-field messages; services never receive unvalidated input from these
routes. The password policy requires at least 8 characters with at least one
letter and one digit (`utils/passwordPolicy.js`).

## JWT access tokens

HS256, signed with `JWT_SECRET`, 15-minute expiry (`ACCESS_TOKEN_EXPIRES_IN`),
payload limited to `{ sub: userId }`. Verified on every authenticated request
by the `authenticate` middleware, which re-reads the user's current
timezone/gender from the database rather than trusting the token payload.

## Refresh tokens

- Opaque 40-byte random values (`crypto.randomBytes`), never JWTs.
- Only the SHA-256 hash (`utils/hashToken.js`) is stored in
  `refresh_tokens.token_hash`; the raw value exists only in the response
  cookie and is never persisted.
- Delivered exclusively via an httpOnly cookie (`refreshToken`),
  `sameSite: strict`, `secure` in production, and scoped to
  `path: /api/auth` so it isn't attached to unrelated API requests.
  `cookieConfig.js` refuses to load unless `NODE_ENV` is one of
  `production` / `development` / `test`, since that value controls whether
  `secure` is set.
- 50-day maximum lifetime (`REFRESH_TOKEN_MAX_AGE_MS`); rotated on every use
  (see Decisions).

## Login lockout

- Tracked per account via `failed_login_count` / `locked_until` on `users`.
- After `MAX_FAILED_LOGIN_ATTEMPTS` (10) consecutive failures, the account
  locks for `LOGIN_LOCKOUT_MS` (15 minutes). A successful login clears both
  counters.
- The row is read with `SELECT ... FOR UPDATE` inside the same transaction
  that evaluates and updates the counters, serializing concurrent login
  attempts against one account (see Decisions → rate limiting vs. login
  lockout).

## Rate limiting

Implemented with `express-rate-limit` (`middleware/rateLimiters.js`), keyed
by IP, by a canonicalized email (`user+tag@domain` → `user@domain`), by user
id, or by refresh-token hash, depending on the endpoint. A representative
subset:

| Endpoint | Window | Max | Key |
|---|---|---|---|
| Register | 15 min | 5 | IP |
| Register (per email) | 60 min | 3 | email |
| Login | 15 min | 10 | IP + email |
| Login (per account) | 15 min | 10 | email |
| Login (per IP) | 15 min | 25 | IP |
| Forgot password (cooldown) | 15 min | 1 | IP + email |
| Forgot password (daily) | 24 h | 3 | IP + email |
| Change password | 60 min | 3 | user id |
| Change password (daily) | 24 h | 3 | user id |
| Change email | 15 min | 5 | user id |
| Delete account (request) | 60 min | 2 | user id |
| Refresh | 15 min | 40 | refresh-token hash |
| Logout-all | 15 min | 3 | user id |
| Authenticated surface (general) | 60 s | 60 | user id |

A global IP limiter (300 req/min) wraps the entire API in `server.js`.
Several auth endpoints layer two or three limiters at once (e.g. login
combines an IP+email, an email-only, and an IP-only limiter), so an attacker
can't stay under any single limiter's threshold by spreading requests across
accounts or IPs.

## Authorization & ownership

- The authenticated user's id always comes from the verified JWT
  (`req.user.id`), never from a route parameter or request body.
- Ownership of non-account resources (habits) is enforced at the SQL layer
  rather than fetch-then-check in application code:
  `habitModel.findById(id, userId)` filters with
  `WHERE id = ? AND user_id = ?`, so a query for another user's resource
  simply returns no rows.
- `authenticateAllowRecentlyDeleted` (used only for
  `POST /delete-account/confirm`) is a narrow, explicit exception: it accepts
  a still-valid access token whose user row has already been deleted, but
  only continues if a matching `account_deletion_confirmations` row was
  recorded within the last 5 minutes.

## Transactions & row locking

- Every multi-step security-sensitive write runs inside `runInTransaction`
  (`db.js`), which automatically retries up to 3 times, with jittered
  backoff, on `ER_LOCK_DEADLOCK` or `ER_LOCK_WAIT_TIMEOUT`.
- Rows that are read-then-conditionally-written by security flows (`users`,
  `refresh_tokens`) are read with `SELECT ... FOR UPDATE` inside the
  transaction, serializing concurrent operations against the same account or
  token (login, refresh, email/password change, account deletion).

## Optimistic concurrency

Password change and password reset apply their final `UPDATE` conditioned on
the password hash read earlier in the same flow
(`updatePasswordIfEligible`, `markResetTokenConsumedIfHashMatches`). If the
hash has changed in the meantime, the update affects 0 rows and the flow
fails with a 409 instead of silently overwriting newer state. Email change
uses the equivalent pattern for the final email swap (see below).

## Confirmation-token lifecycle

Email verification, email change, password reset, and account deletion
tokens all share the same three-state model
(`services/confirmationTokenService.js`):

| State | Meaning |
|---|---|
| `active` | Unexpired and unconsumed; can be used. |
| `recently_consumed` | Consumed within the last 5 minutes (`CONFIRMATION_IDEMPOTENCY_WINDOW_MS`); a repeat request returns the original success outcome instead of an error. |
| `expired` | Unknown, past expiry, or consumed more than 5 minutes ago; treated as invalid. |

This lets a duplicate confirmation (double-click, retried request) succeed
idempotently instead of surfacing a confusing "invalid token" error for
something that already worked.

## Email-change race safety

The final email swap (`markEmailChangeConsumed`) performs the uniqueness
check and the write as a single statement:

```sql
UPDATE users AS target
LEFT JOIN users AS existing
  ON existing.email = target.pending_email AND existing.id <> target.id
SET target.email = target.pending_email, ...
WHERE target.id = ? AND target.pending_email IS NOT NULL AND existing.id IS NULL
```

If another account has claimed the pending address in the meantime, the
`LEFT JOIN` matches it, `existing.id IS NULL` is false, and the row isn't
updated — the service detects 0 affected rows and returns a conflict instead
of creating a duplicate email.

## Cleanup jobs

Three independently-scheduled jobs run inside the same process
(`services/cleanupRunner.js`):

| Job | Interval | Cleans up |
|---|---|---|
| `cleanupConsumedConfirmationTokens` | 5 min | Consumed verification / email-change / reset tokens past the 5-minute idempotency window; `account_deletion_confirmations` rows past the same window. |
| `cleanupExpiredTokens` | 1 h | Expired refresh tokens; used refresh tokens older than a 60-second grace period (`USED_TOKEN_GRACE_PERIOD_MS`); expired-but-unconsumed reset/verification/delete/email-change tokens. |
| `cleanupUnverified` | 24 h | Unverified accounts older than `CLEANUP_UNVERIFIED_DAYS` (default 7), deleted under a per-row `FOR UPDATE` recheck so an account that verifies at the same moment isn't deleted out from under the user. |

Cleanup is intentionally decoupled from request-time security decisions (see
Decisions) — request handling never depends on cleanup having already run.

> _Note:_ `USED_TOKEN_GRACE_PERIOD_MS` (60s, used only by the hourly cleanup
> job to decide when a rotated refresh-token row is safe to hard-delete) is
> unrelated to the 5-second reuse-detection grace window in
> `sessionService.js` — the two exist for different reasons despite the
> similar names. See `08-authentication-engineering-decisions.md`.

## Environment / configuration validation

`utils/validateEnv.js` runs at process start and exits the process if
`JWT_SECRET`, DB credentials, Gmail credentials, or `APP_BASE_URL` are
missing; it also enforces `JWT_SECRET` ≥ 32 characters and that
`APP_BASE_URL` uses `https://` outside of localhost. `cookieConfig.js`
separately refuses to load unless `NODE_ENV` is a recognized value.

## Security headers & trust boundary

`helmet` is applied globally with a restrictive CSP (`default-src 'self'`,
`script-src 'self'`). Network isolation, the `trust proxy` configuration, and
production HTTPS/cookie requirements are documented in
`05-lifecycle-and-architecture.md` and apply to the authentication surface as
much as anywhere else — they aren't repeated here.
