/**
 * Dashboard API service – client fetch wrappers for the authenticated
 * Aurakon habit/review/progress surfaces.
 *
 * Follows the same conventions as authApi.js: relative URLs proxied by
 * the Next.js rewrite to the Express backend, cookies included, Bearer
 * access token from the shared token store. On a 401 the session is
 * silently recovered once via POST /api/auth/refresh before retrying;
 * if that also fails the error propagates (the caller signs out).
 */

import {
  getAccessToken,
  refreshAccessToken,
  getLogoutGeneration,
} from "./tokenStore";

async function handleResponse(res) {
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw {
      status: res.status,
      error:
        data?.error ||
        data?.message ||
        "Something went wrong. Please try again.",
      fields: data?.fields,
      retryAfter: data?.retryAfter,
    };
  }

  return data;
}

function handleNetworkError() {
  return {
    status: 0,
    error: "Network error. Please check your connection and try again.",
  };
}

/* Core authenticated request with one silent refresh-and-retry on 401.
 * The access token lives ~15 minutes; this keeps long dashboard
 * sessions working without any user-visible re-auth while the refresh
 * cookie is valid. Concurrent 401s share a single refresh request via
 * refreshAccessToken() (the backend rotates its single-use refresh
 * tokens - parallel refreshes would look like token replay).
 *
 * The refresh above is a separate, independently-timed round trip, so
 * the user can click "Log Out" while it's still in flight. We snapshot
 * the logout generation before making the refresh call; if it has moved
 * on by the time we come back (i.e. logOut()/logOutAllDevices() ran
 * meanwhile), this request is stale and must not retry with whatever
 * token the refresh reinstated - otherwise a real, state-mutating
 * action could complete after the user has already been shown the
 * signed-out screen. */
async function authedFetch(path, options = {}) {
  const startGeneration = getLogoutGeneration();

  const run = (token) =>
    fetch(path, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await run(getAccessToken()).catch(() => {
    throw handleNetworkError();
  });

  if (res.status === 401) {
    let refreshed = null;
    try {
      refreshed = await refreshAccessToken();
    } catch {
      // Refresh failed - fall through and surface the original 401.
    }
    if (refreshed && getLogoutGeneration() === startGeneration) {
      res = await run(getAccessToken()).catch(() => {
        throw handleNetworkError();
      });
    }
  }

  return res;
}

async function authedJson(path, method, body) {
  const res = await authedFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return handleResponse(res);
}

/* ---------------------------------------------------------------- */
/* Habits                                                            */
/* ---------------------------------------------------------------- */

/**
 * GET /api/habits - every active habit incl. its pending review group.
 */
export async function listHabitsRequest() {
  const res = await authedFetch("/api/habits");
  return handleResponse(res);
}

/**
 * GET /api/habits/:id - one habit incl. its backend-computed streaks
 * and pending review group.
 */
export async function getHabitDetailRequest(habitId) {
  const res = await authedFetch(`/api/habits/${habitId}`);
  return handleResponse(res);
}

/**
 * GET /api/habits/:id/logs - full log history for one habit.
 */
export async function listHabitLogsRequest(habitId) {
  const res = await authedFetch(`/api/habits/${habitId}/logs`);
  return handleResponse(res);
}

/**
 * POST /api/habits
 */
export async function createHabitRequest({ title, difficulty }) {
  return authedJson("/api/habits", "POST", { title, difficulty });
}

/**
 * PATCH /api/habits/:id - the backend only allows renaming; difficulty
 * is fixed at creation time.
 */
export async function updateHabitRequest(habitId, { title }) {
  return authedJson(`/api/habits/${habitId}`, "PATCH", { title });
}

/**
 * DELETE /api/habits/:id - archives the habit.
 */
export async function deleteHabitRequest(habitId) {
  return authedJson(`/api/habits/${habitId}`, "DELETE");
}

/**
 * POST /api/habits/:id/logs { date } - check in today or recover a
 * pending-review day.
 */
export async function createHabitLogRequest(habitId, date) {
  return authedJson(`/api/habits/${habitId}/logs`, "POST", { date });
}

/**
 * DELETE /api/habits/:id/logs/:date - undo today's check-in.
 */
export async function undoHabitLogRequest(habitId, date) {
  return authedJson(`/api/habits/${habitId}/logs/${date}`, "DELETE");
}

/* ---------------------------------------------------------------- */
/* Pending reviews                                                    */
/* ---------------------------------------------------------------- */

/**
 * GET /api/review/pending - server-side pending-review summary. The
 * day-by-day queue itself is still built from each habit's
 * pendingReview (GET /api/habits, already loaded); this call exists
 * so the dashboard can read shouldAutoPopup - the backend's signal
 * that enough trials are awaiting review to open the session
 * automatically rather than waiting for the user to tap the banner.
 */
export async function getPendingReviewSummaryRequest() {
  const res = await authedFetch("/api/review/pending");
  return handleResponse(res);
}

/**
 * POST /api/review/decisions
 * decisions: [{ habitId, missedDate, decision: "completed"|"missed",
 * useShield?: boolean }]
 */
export async function applyReviewDecisionsRequest(decisions) {
  return authedJson("/api/review/decisions", "POST", { decisions });
}

/* ---------------------------------------------------------------- */
/* Progress & profile                                                */
/* ---------------------------------------------------------------- */

/**
 * GET /api/progress - XP, level, title ladder position, aura energy,
 * global streak and shield balance.
 */
export async function getProgressRequest() {
  const res = await authedFetch("/api/progress");
  return handleResponse(res);
}

/**
 * GET /api/profile - public profile summary (username included).
 */
export async function getProfileRequest() {
  const res = await authedFetch("/api/profile");
  return handleResponse(res);
}

/**
 * POST /api/auth/logout-all - revokes every refresh token for the
 * account.
 */
export async function logoutAllDevicesRequest() {
  const res = await authedFetch("/api/auth/logout-all", {
    method: "POST",
  });
  return handleResponse(res);
}

/* ---------------------------------------------------------------- */
/* Authenticated account surfaces                                    */
/*                                                                    */
/* These reuse the same authed request core (silent refresh-and-retry */
/* on 401) because they are reachable long after sign-in, unlike the  */
/* public auth flows which stay in authApi.js.                        */
/* ---------------------------------------------------------------- */

/**
 * GET /api/auth/me - account summary (email, createdAt, gender,
 * timezone).
 */
export async function getCurrentUserRequest() {
  const res = await authedFetch("/api/auth/me");
  return handleResponse(res);
}

/**
 * PATCH /api/auth/username
 */
export async function updateUsernameRequest(username) {
  return authedJson("/api/auth/username", "PATCH", { username });
}

/**
 * PATCH /api/auth/timezone
 */
export async function updateTimezoneRequest(timezone) {
  return authedJson("/api/auth/timezone", "PATCH", { timezone });
}

/**
 * POST /api/auth/change-password
 */
export async function changePasswordRequest(currentPassword, newPassword) {
  return authedJson("/api/auth/change-password", "POST", {
    currentPassword,
    newPassword,
  });
}

/**
 * POST /api/auth/delete-account/request - emails a one-time deletion
 * confirmation link.
 */
export async function requestAccountDeletionRequest() {
  const res = await authedFetch("/api/auth/delete-account/request", {
    method: "POST",
  });
  return handleResponse(res);
}
