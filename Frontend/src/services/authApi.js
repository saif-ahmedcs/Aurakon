/**
 * Auth API service – client fetch wrappers for Aurakon authentication and email workflows.
 *
 * All requests use relative URLs ("/api/auth/...") so that Next.js rewrites
 * proxy them seamlessly to the Express backend.
 */

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

/**
 * POST /api/auth/register
 */
export async function registerRequest({
  email,
  password,
  username,
  gender,
  timezone,
}) {
  let res;
  try {
    res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, username, gender, timezone }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/login
 */
export async function loginRequest({ email, password }) {
  let res;
  try {
    res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/demo/start
 * Rebuilds the shared demo account to a clean state and logs the caller
 * into it.
 */
export async function startDemoRequest() {
  let res;
  try {
    res = await fetch("/api/demo/start", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/resend-verification
 */
export async function resendVerificationRequest({ email }) {
  let res;
  try {
    res = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * GET /api/auth/verify-email?token=...
 */
export async function checkVerificationTokenRequest(token) {
  let res;
  try {
    res = await fetch(
      `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
        credentials: "include",
      },
    );
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/verify-email/confirm
 */
export async function confirmVerificationRequest(token) {
  let res;
  try {
    res = await fetch("/api/auth/verify-email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/forgot-password
 */
export async function forgotPasswordRequest({ email }) {
  let res;
  try {
    res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * GET /api/auth/reset-password?token=...
 */
export async function checkResetTokenRequest(token) {
  let res;
  try {
    res = await fetch(
      `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
      {
        method: "GET",
        credentials: "include",
      },
    );
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/reset-password
 */
export async function resetPasswordRequest({ token, email, newPassword }) {
  let res;
  try {
    res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token, email, newPassword }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * PATCH /api/auth/gender
 */
export async function setGenderRequest({ gender, accessToken }) {
  let res;
  try {
    res = await fetch("/api/auth/gender", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ gender }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/verify-email-change/confirm
 */
export async function confirmEmailChangeRequest({
  token,
  currentPassword,
  accessToken,
}) {
  let res;
  try {
    res = await fetch("/api/auth/verify-email-change/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ token, currentPassword }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/delete-account/confirm
 */
export async function confirmAccountDeletionRequest({
  token,
  currentPassword,
  accessToken,
}) {
  let res;
  try {
    res = await fetch("/api/auth/delete-account/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ token, currentPassword }),
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/refresh
 * Rotates the refresh cookie and returns a fresh access token.
 */
export async function refreshSessionRequest() {
  let res;
  try {
    res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}

/**
 * POST /api/auth/logout
 */
export async function logoutRequest() {
  let res;
  try {
    res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    throw handleNetworkError();
  }
  return handleResponse(res);
}
