/**
 * Access-token store.
 *
 * The established Aurakon flow keeps the short-lived JWT access token
 * in memory on `window.__auraAccessToken` (set after login, cleared on
 * logout). This module is the single accessor so every consumer shares
 * the same key instead of repeating the magic string. The long-lived
 * refresh token stays in the backend's httpOnly cookie - a page reload
 * simply recovers access via POST /api/auth/refresh.
 */

import { refreshSessionRequest } from "./authApi";

const TOKEN_KEY = "__auraAccessToken";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window[TOKEN_KEY] || null;
}

export function setAccessToken(token) {
  if (typeof window === "undefined") return;
  window[TOKEN_KEY] = token || null;
}

export function clearAccessToken() {
  if (typeof window === "undefined") return;
  window[TOKEN_KEY] = null;
}

/* Single-flight session recovery.
 *
 * The backend refresh token is single-use (rotated on every refresh),
 * and replaying a consumed token is treated as theft and revokes the
 * whole session family. So concurrent callers must never each fire
 * POST /api/auth/refresh with the same cookie - e.g. React StrictMode
 * running the dashboard bootstrap effect twice in dev, or several API
 * calls hitting 401 at once. They all await this one shared request. */
let refreshInFlight = null;

export function refreshAccessToken() {
  if (!refreshInFlight) {
    refreshInFlight = refreshSessionRequest()
      .then((res) => {
        setAccessToken(res.accessToken);
        return res.accessToken;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}
