"use client";

import { useState, useCallback } from "react";
import { logoutRequest, forgotPasswordRequest } from "../services/authApi";
import {
  logoutAllDevicesRequest,
  changePasswordRequest,
  updateTimezoneRequest,
  requestAccountDeletionRequest,
} from "../services/dashboardApi";
import { clearAccessToken, beginLogout } from "../services/tokenStore";

/* ------------------------------------------------------------------
 * Account / session flow: the full-page screens swapped in place of
 * the dashboard (My Account and the check-email hops) plus the
 * signed-out state - all backed by the real Aurakon auth endpoints.
 *
 * - logOut / logOutAllDevices end the backend session (refresh cookie
 *   revoked) and clear the in-memory access token.
 * - startPasswordReset emails a real reset link; the emailed link
 *   opens the existing /reset-password route.
 * - requestDeleteAccount emails a real deletion-confirmation link;
 *   the account is only deleted once that link is confirmed on the
 *   /confirm-account-deletion route.
 * ------------------------------------------------------------------ */
export function useAccountFlow({
  showToast,
  email,
  createdAt,
  onTimeZoneChange,
}) {
  const [myAccountOpen, setMyAccountOpen] = useState(false);
  const [checkEmailOpen, setCheckEmailOpen] = useState(false);
  const [deleteCheckEmailOpen, setDeleteCheckEmailOpen] = useState(false);
  const [accountTimeZone, setAccountTimeZone] = useState(null);
  const [accountTimeZoneSource, setAccountTimeZoneSource] = useState(null);

  // Full sign-out screen shown after "Log Out".
  const [loggedOut, setLoggedOut] = useState(false);

  const logOut = useCallback(async () => {
    beginLogout();
    try {
      await logoutRequest();
    } catch {
      // Even if the request fails, the local session ends below.
    }
    clearAccessToken();
    setLoggedOut(true);
  }, []);

  const logOutAllDevices = useCallback(async () => {
    beginLogout();
    try {
      await logoutAllDevicesRequest();
    } catch {
      // Even if the request fails, the local session ends below.
    }
    clearAccessToken();
    setLoggedOut(true);
  }, []);

  const openMyAccount = useCallback(() => setMyAccountOpen(true), []);
  const closeMyAccount = useCallback(() => setMyAccountOpen(false), []);

  /* Shared "go back to My Account" for every email-hop screen. Only one
   * hop screen can be open at a time, so closing the others is a no-op. */
  const backToMyAccount = useCallback(() => {
    setDeleteCheckEmailOpen(false);
    setCheckEmailOpen(false);
    setMyAccountOpen(true);
  }, []);

  /* Step 1 of deletion: user confirms "Delete Account" in MyAccountPage.
   * This does NOT delete anything yet - it requests the verification
   * email, then the screen points the user at their inbox. */
  const requestDeleteAccount = useCallback(async () => {
    try {
      await requestAccountDeletionRequest();
      setMyAccountOpen(false);
      setDeleteCheckEmailOpen(true);
    } catch (err) {
      showToast(err.error || "Could not send the deletion email. Try again.");
    }
  }, [showToast]);

  /* User taps "Forgot Password?" inside My Account -> email a real
   * reset link, then point them at their inbox. */
  const startPasswordReset = useCallback(async () => {
    try {
      await forgotPasswordRequest({ email });
      setMyAccountOpen(false);
      setCheckEmailOpen(true);
    } catch (err) {
      showToast(err.error || "Could not send the reset link. Try again.");
    }
  }, [email, showToast]);

  const changeTimeZone = useCallback(
    async (nextTz) => {
      try {
        const result = await updateTimezoneRequest(nextTz);
        const confirmedTz = result ? result.timezone : nextTz;
        setAccountTimeZone(confirmedTz);
        setAccountTimeZoneSource("manual");

        if (onTimeZoneChange) {
          onTimeZoneChange(confirmedTz);
        }
        showToast("Time zone updated");
        return true;
      } catch (err) {
        showToast(err.error || "Could not update the time zone.");
        return false;
      }
    },
    [showToast, onTimeZoneChange],
  );

  /* Server-side validated password change. Returns field errors so
   * MyAccountPage can place them under the matching inputs. */
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      await changePasswordRequest(currentPassword, newPassword);
      return { ok: true };
    } catch (err) {
      const fieldErrors = {};
      if (Array.isArray(err.fields)) {
        for (const f of err.fields) {
          fieldErrors[f.path] = f.message;
        }
      }
      return {
        ok: false,
        error: err.error || "Could not update the password.",
        fieldErrors,
        retryAfter: err.retryAfter,
      };
    }
  }, []);

  const returnToSignIn = useCallback(() => {
    window.location.href = "/";
  }, []);

  return {
    accountEmail: email,
    accountCreatedAt: createdAt,
    accountTimeZone,
    accountTimeZoneSource,
    loggedOut,
    myAccountOpen,
    checkEmailOpen,
    deleteCheckEmailOpen,
    logOut,
    logOutAllDevices,
    openMyAccount,
    closeMyAccount,
    backToMyAccount,
    requestDeleteAccount,
    startPasswordReset,
    changeTimeZone,
    changePassword,
    returnToSignIn,
  };
}
