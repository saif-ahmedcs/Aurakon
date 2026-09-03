# Lifecycle & Architecture

## Undo & Archive Behavior

- Only **today's** direct completion can be undone. Anything resolved
  through the pending review system (recovered, shielded, or missed) is
  final once decided.
- Deleting a habit soft-archives it (`archived_at`), auto-resolves any of
  its open pending reviews as `missed`, and keeps all historical logs and
  shield records intact for progression accuracy.

## Derived State Philosophy

Every progression value that can be rebuilt from a source-of-truth log is
rebuilt, not incrementally trusted forever: shield balance from
`guardian_shield_log`, level from `daily_aura_stats`, global streak from
`daily_aura_stats`, and total XP from the XP ledgers. This keeps the system
self-healing against partial failures, retries, or out-of-order sync,
instead of depending on every write path getting every delta exactly right,
forever.

## Network Architecture & Trust Boundary

**Status: the target production architecture below is _prepared_, not deployed.**
Local development currently runs Backend + Frontend + MySQL via
`docker-compose.yml` with no reverse proxy in front of them. The previous
VPS setup (nginx + certbot + Let's Encrypt) has been removed; it is not
part of local development or the target architecture.

### 1. Local development topology

- `docker-compose.yml` runs **mysql**, **backend**, and **frontend** only.
  `backend` publishes `3000:3000` and `frontend` publishes `3001:3001`
  directly to the host — there is no proxy in between locally.
- `NODE_ENV` defaults to `development` in this stack, so refresh-token
  cookies are issued without `Secure` and work over plain `http://localhost`.

### 2. Target production topology (future — not yet configured)

- **Frontend** → Vercel. **Backend** → Render. **Database** → TiDB Cloud.
- Neither Backend nor Frontend will sit behind a self-managed reverse proxy
  in this architecture; Render terminates TLS for the Backend directly, and
  Vercel terminates TLS for the Frontend directly. The frontend calls the
  backend over `BACKEND_INTERNAL_URL` (see `Frontend/.env.example`),
  currently unset for production — it must be pointed at the Render backend
  URL when that deployment actually happens, not before.
- Database access uses TiDB Cloud's TLS-required public endpoint rather
  than an unencrypted internal MySQL connection. See `Backend/db.js` and
  `Backend/.env.example` (`DB_SSL`, `DB_SSL_CA_PATH`) — TLS is opt-in and
  currently disabled by default so local MySQL is unaffected.

### 3. Reverse Proxy & Trust Boundary (`trust proxy`)

- Express runs with `app.set("trust proxy", 1)`, which trusts exactly one
  proxy hop's `X-Forwarded-For` / `X-Forwarded-Proto` headers.
- **This assumption must be re-verified once the Render deployment is
  configured.** Render's own edge is expected to be that single trusted
  hop, terminating TLS and setting those headers from the real client
  connection — but this has not yet been confirmed against Render's actual
  topology (e.g. whether any additional hop sits in front of it) and should
  be checked before relying on `req.ip` / rate limiting in production.
- Locally, there is currently no proxy hop at all: requests reach Express
  directly, so `X-Forwarded-For` should not be trusted in local dev.

### 4. HTTPS & Cookie Security

- In production (`NODE_ENV=production`), refresh tokens are stored in
  HTTP-only cookies with `secure: true` and `sameSite: strict`. If the app
  is ever served over plain HTTP with `NODE_ENV=production`, the browser
  silently drops the refresh cookie and breaks session persistence for
  every user (access tokens live in memory only and expire after 15
  minutes).
- `NODE_ENV=production` must only be used where TLS is actually terminated
  in front of the Backend. Locally that is never the case (see §1), so
  local `.env` files should keep `NODE_ENV=development`. In the target
  architecture, Render is expected to terminate TLS for the Backend, making
  `NODE_ENV=production` safe to use there once that deployment exists.
- `APP_BASE_URL` must be a public `https://` origin matching wherever the
  Frontend is actually served, so verification and password-reset email
  links resolve correctly. In the target architecture this will be the
  Vercel frontend URL (or a custom domain pointed at it); do not set a
  production URL here until that deployment exists.
