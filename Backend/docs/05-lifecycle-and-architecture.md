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

## Production Network Architecture & Trust Boundary

### 1. Network Isolation
- In Docker Compose and production deployments, the **Backend** and **MySQL** services reside entirely on the internal container network and are **not** published to public host ports.
- The **Frontend** (Next.js) acts as the public-facing entrypoint for client traffic and proxies `/api/*` calls internally to `http://backend:3000`.

### 2. Reverse Proxy & Trust Boundary (`trust proxy`)
- Express runs with `app.set("trust proxy", 1)`. In the Docker topology, exactly one trusted proxy hop sits immediately in front of Express (the Next.js server rewrite).
- Because Backend port 3000 is internal-only and inaccessible to public clients, external attackers cannot directly connect to Express to forge or manipulate `X-Forwarded-For` headers.
- **Production Edge Proxy Requirements:** When placing an external reverse proxy or load balancer (e.g., NGINX, Cloudflare, AWS ALB) in front of the application:
  1. The edge proxy must terminate TLS and sanitize / overwrite incoming `X-Forwarded-For` headers with the real client IP.
  2. Public traffic must never route directly to the Backend service, preserving the single-hop internal trust boundary.

### 3. HTTPS & Cookie Security
- In production (`NODE_ENV=production`), refresh tokens are stored in HTTP-only cookies with `secure: true` and `sameSite: strict`.
- The public entrypoint must terminate TLS and serve the application over HTTPS.
- `APP_BASE_URL` must be configured with a public `https://` origin so that transactional verification and password reset email links resolve correctly to the secure production endpoint.

