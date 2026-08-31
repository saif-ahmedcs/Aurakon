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

let logoutGeneration = 0;

export function getLogoutGeneration() {
  return logoutGeneration;
}

export function beginLogout() {
  logoutGeneration += 1;
}

/* ------------------------------------------------------------------ */
/*  Cross-tab refresh coordination                                     */
/* ------------------------------------------------------------------ */

const LOCK_KEY = "aurakon:refresh-lock";
const LOCK_TIMEOUT_MS = 4000;
const CHANNEL_NAME = "aurakon:token-refresh";

let refreshInFlight = null;

function acquireLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const ts = Number(raw);
      if (Date.now() - ts < LOCK_TIMEOUT_MS) return false; // another tab holds a fresh lock
    }
    localStorage.setItem(LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    // localStorage unavailable (SSR, privacy mode) – fall through
    return true;
  }
}

function releaseLock() {
  try {
    localStorage.removeItem(LOCK_KEY);
  } catch {
    // best-effort
  }
}

function broadcastChannel() {
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

export function refreshAccessToken() {
  if (typeof window === "undefined") return refreshSessionRequest();

  // Intra-tab dedup – multiple components hitting 401 at once share one promise.
  if (refreshInFlight) return refreshInFlight;

  // Try to become the leader.
  if (acquireLock()) {
    refreshInFlight = performRefreshAsLeader();
    return refreshInFlight;
  }

  // Another tab is refreshing – wait for the result via the channel.
  return waitForRefreshResult();
}

async function performRefreshAsLeader() {
  const channel = broadcastChannel();
  const startGeneration = logoutGeneration;

  try {
    const res = await refreshSessionRequest();
    if (startGeneration === logoutGeneration) {
      setAccessToken(res.accessToken);
    }
    channel?.postMessage({ ok: true, accessToken: res.accessToken });
    return res.accessToken;
  } catch (err) {
    channel?.postMessage({ ok: false, error: err });
    throw err;
  } finally {
    releaseLock();
    refreshInFlight = null;
    channel?.close();
  }
}

function waitForRefreshResult() {
  const startGeneration = logoutGeneration;
  return new Promise((resolve, reject) => {
    const channel = broadcastChannel();
    if (!channel) {
      // BroadcastChannel unavailable – fall back to an independent request.
      // The backend grace window (5 s) protects against a benign race.
      refreshSessionRequest()
        .then((res) => {
          if (startGeneration === logoutGeneration) {
            setAccessToken(res.accessToken);
          }
          resolve(res.accessToken);
        })
        .catch(reject);
      return;
    }

    const timeout = setTimeout(() => {
      channel.close();
      // Stale lock – the leader may have crashed.  Try our own refresh.
      localStorage.removeItem(LOCK_KEY);
      refreshSessionRequest()
        .then((res) => {
          if (startGeneration === logoutGeneration) {
            setAccessToken(res.accessToken);
          }
          resolve(res.accessToken);
        })
        .catch(reject);
    }, LOCK_TIMEOUT_MS);

    channel.onmessage = (e) => {
      clearTimeout(timeout);
      channel.close();
      if (e.data.ok) {
        if (startGeneration === logoutGeneration) {
          setAccessToken(e.data.accessToken);
        }
        resolve(e.data.accessToken);
      } else {
        reject(e.data.error);
      }
    };
  });
}
