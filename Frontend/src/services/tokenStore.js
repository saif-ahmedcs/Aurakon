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

const LOCK_NAME = "aurakon:token-refresh-lock";
const RESULT_KEY = "aurakon:token-refresh-result";
const RESULT_FRESHNESS_MS = 4000;
const CHANNEL_NAME = "aurakon:token-refresh";

// Fallback coordination for browsers without the Web Locks API.
const LEGACY_LOCK_KEY = "aurakon:refresh-lock";
const LEGACY_LOCK_TIMEOUT_MS = 4000;

let refreshInFlight = null;

function hasWebLocks() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.locks &&
    typeof navigator.locks.request === "function"
  );
}

function readRecentResult() {
  try {
    const raw = localStorage.getItem(RESULT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.at !== "number" || !parsed.accessToken) {
      return null;
    }
    if (Date.now() - parsed.at > RESULT_FRESHNESS_MS) return null;
    return parsed.accessToken;
  } catch {
    return null;
  }
}

function writeRecentResult(accessToken) {
  try {
    localStorage.setItem(
      RESULT_KEY,
      JSON.stringify({ accessToken, at: Date.now() }),
    );
  } catch {
    // best-effort - a missed cache write just means the next tab in
    // line performs its own refresh instead of reusing this one.
  }
}

function broadcastChannel() {
  try {
    return new BroadcastChannel(CHANNEL_NAME);
  } catch {
    return null;
  }
}

async function refreshOnce(alreadyRetried = false) {
  try {
    const res = await refreshSessionRequest();
    return res.accessToken;
  } catch (err) {
    if (!alreadyRetried && err && err.error === "token_already_used") {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return refreshOnce(true);
    }
    throw err;
  }
}

export function refreshAccessToken() {
  if (typeof window === "undefined") return refreshSessionRequest();

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (
    hasWebLocks() ? refreshWithWebLock() : refreshWithLegacyLock()
  ).finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

async function refreshWithWebLock() {
  const startGeneration = logoutGeneration;

  return navigator.locks.request(LOCK_NAME, async () => {
    const cached = readRecentResult();
    if (cached) {
      if (startGeneration === logoutGeneration) setAccessToken(cached);
      return cached;
    }

    const accessToken = await refreshOnce();
    writeRecentResult(accessToken);
    if (startGeneration === logoutGeneration) {
      setAccessToken(accessToken);
    }
    return accessToken;
  });
}

function acquireLegacyLock() {
  try {
    const raw = localStorage.getItem(LEGACY_LOCK_KEY);
    if (raw) {
      const ts = Number(raw);
      if (Date.now() - ts < LEGACY_LOCK_TIMEOUT_MS) return false; // another tab holds a fresh lock
    }
    localStorage.setItem(LEGACY_LOCK_KEY, String(Date.now()));
    return true;
  } catch {
    return true;
  }
}

function releaseLegacyLock() {
  try {
    localStorage.removeItem(LEGACY_LOCK_KEY);
  } catch {
    // best-effort
  }
}

function refreshWithLegacyLock() {
  if (acquireLegacyLock()) {
    return performLegacyRefreshAsLeader();
  }
  return waitForLegacyRefreshResult();
}

async function performLegacyRefreshAsLeader() {
  const channel = broadcastChannel();
  const startGeneration = logoutGeneration;

  try {
    const cached = readRecentResult();
    const accessToken = cached ? cached : await refreshOnce();
    if (!cached) writeRecentResult(accessToken);
    if (startGeneration === logoutGeneration) {
      setAccessToken(accessToken);
    }
    channel?.postMessage({ ok: true, accessToken });
    return accessToken;
  } catch (err) {
    channel?.postMessage({ ok: false, error: err });
    throw err;
  } finally {
    releaseLegacyLock();
    channel?.close();
  }
}

const LEGACY_RESULT_POLL_INTERVAL_MS = 300;
const LEGACY_RESULT_POLL_ATTEMPTS = 10;

function waitForLegacyRefreshResult() {
  const startGeneration = logoutGeneration;
  return new Promise((resolve, reject) => {
    const channel = broadcastChannel();

    const fallbackToOwnRefresh = async () => {
      for (let i = 0; i < LEGACY_RESULT_POLL_ATTEMPTS; i++) {
        const cached = readRecentResult();
        if (cached) {
          if (startGeneration === logoutGeneration) setAccessToken(cached);
          resolve(cached);
          return;
        }
        await new Promise((r) => setTimeout(r, LEGACY_RESULT_POLL_INTERVAL_MS));
      }

      try {
        const accessToken = await refreshOnce();
        writeRecentResult(accessToken);
        if (startGeneration === logoutGeneration) {
          setAccessToken(accessToken);
        }
        resolve(accessToken);
      } catch (err) {
        reject(err);
      }
    };

    if (!channel) {
      fallbackToOwnRefresh();
      return;
    }

    const timeout = setTimeout(() => {
      channel.close();
      localStorage.removeItem(LEGACY_LOCK_KEY);
      fallbackToOwnRefresh();
    }, LEGACY_LOCK_TIMEOUT_MS);

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
