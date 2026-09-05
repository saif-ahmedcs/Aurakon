"use client";

import { useState, useMemo } from "react";
import { TIME_ZONE_OPTIONS } from "../../../../constants/account";
import { PasswordField } from "./PasswordField";
import { ConfirmDialog } from "../modals/ConfirmDialog";
import { ChevronLeftIcon, WarningIcon } from "../icons";

/* ------------------------------------------------------------------
 * My Account page - a full page (not a modal), swapped in by the app
 * shell in place of the dashboard, with its own back-button header.
 * Email / createdAt / gender come from the backend (GET /api/auth/me).
 * Change-password is validated server-side (POST
 * /api/auth/change-password) - returned field errors are placed under
 * the matching inputs. Delete-account is a two-step confirmation that
 * ends by calling onRequestDeleteAccount, which emails a verification
 * link and shows a "check your email" screen; the account is only
 * actually deleted once that email link is confirmed.
 * ------------------------------------------------------------------ */
export function MyAccountPage({
  email,
  createdAt,
  gender,
  timeZone,
  timeZoneSource,
  onChangeTimeZone,
  onChangePassword,
  onForgotPassword,
  onRequestDeleteAccount,
  onRequestEmailChange,
  onBack,
  heroName,
}) {
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [errors, setErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);
  const [saved, setSaved] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailErrors, setEmailErrors] = useState({});
  const [savingEmail, setSavingEmail] = useState(false);
  const [deleteStep, setDeleteStep] = useState(null); // null | "warn" | "confirm"
  const [deleteSending, setDeleteSending] = useState(false);
  const [forgotPwOpen, setForgotPwOpen] = useState(false);
  const [tzSaved, setTzSaved] = useState(false);
  const [pendingTz, setPendingTz] = useState(null);
  const [tzSuggestionDismissed, setTzSuggestionDismissed] = useState(false);

  // Client-side detection only ever *suggests* an update here — it never
  // writes the stored timezone itself. The user must explicitly confirm
  // via the same PATCH /auth/timezone flow as the manual dropdown.
  const detectedTimeZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
    } catch {
      return null;
    }
  }, []);

  const showTzSuggestion =
    !tzSuggestionDismissed &&
    !pendingTz &&
    detectedTimeZone &&
    detectedTimeZone !== timeZone;

  const acceptTzSuggestion = () => {
    setPendingTz(detectedTimeZone);
  };

  const dismissTzSuggestion = () => {
    setTzSuggestionDismissed(true);
  };

  const genderLabel = gender
    ? gender.charAt(0).toUpperCase() + gender.slice(1)
    : ",";

  const handleTimeZoneChange = (e) => {
    const nextTz = e.target.value;
    if (nextTz === timeZone) return;
    setPendingTz(nextTz);
  };

  const confirmTimeZoneChange = async () => {
    const ok = await onChangeTimeZone(pendingTz);
    if (ok) {
      setTzSaved(true);
    }
    setPendingTz(null);
  };

  const cancelTimeZoneChange = () => {
    setPendingTz(null);
    setTzSaved(false);
  };

  const submitPasswordChange = async (e) => {
    e.preventDefault();
    if (savingPassword) return;

    const nextErrors = {};
    if (!currentPw) nextErrors.currentPw = "Enter your current password.";
    if (!newPw) nextErrors.newPw = "Enter a new password.";
    else if (newPw.length < 8) nextErrors.newPw = "Use at least 8 characters.";
    if (confirmPw !== newPw) nextErrors.confirmPw = "Passwords don't match.";

    setErrors(nextErrors);
    setSaved(false);
    if (Object.keys(nextErrors).length > 0) return;

    setSavingPassword(true);
    // The current password itself is verified by the server.
    const result = await onChangePassword(currentPw, newPw);
    setSavingPassword(false);

    if (!result || !result.ok) {
      const fieldErrors = (result && result.fieldErrors) || {};
      setErrors({
        ...(fieldErrors.currentPassword
          ? { currentPw: fieldErrors.currentPassword }
          : {}),
        ...(fieldErrors.newPassword ? { newPw: fieldErrors.newPassword } : {}),
      });
      if (result && result.error && Object.keys(fieldErrors).length === 0) {
        setErrors((prev) => ({
          ...prev,
          currentPw: prev.currentPw || result.error,
        }));
      }
      return;
    }

    setCurrentPw("");
    setNewPw("");
    setConfirmPw("");
    setSaved(true);
  };

  const openEmailEdit = () => {
    setNewEmail("");
    setEmailErrors({});
    setEmailEditing(true);
  };

  const cancelEmailEdit = () => {
    setEmailEditing(false);
    setNewEmail("");
    setEmailErrors({});
  };

  const submitEmailChange = async (e) => {
    e.preventDefault();
    if (savingEmail) return;

    const nextErrors = {};
    if (!newEmail) nextErrors.newEmail = "Enter a new email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail))
      nextErrors.newEmail = "Enter a valid email address.";
    else if (newEmail.toLowerCase() === email.toLowerCase())
      nextErrors.newEmail = "That's already your current email address.";

    setEmailErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSavingEmail(true);
    const result = await onRequestEmailChange(newEmail);
    setSavingEmail(false);

    if (!result || !result.ok) {
      const fieldErrors = (result && result.fieldErrors) || {};
      setEmailErrors({
        ...(fieldErrors.newEmail ? { newEmail: fieldErrors.newEmail } : {}),
        ...(result && result.error && Object.keys(fieldErrors).length === 0
          ? { newEmail: result.error }
          : {}),
      });
      return;
    }
    // On success the parent swaps this whole page for the "check your
    // email" screen, so no local reset is needed here.
  };

  const confirmDeleteRequest = async () => {
    setDeleteSending(true);
    await onRequestDeleteAccount();
    setDeleteSending(false);
    setDeleteStep(null);
  };

  return (
    <div className="account-page">
      <header className="account-page-header">
        <div className="account-page-header-left">
          <button
            type="button"
            className="icon-btn account-page-back"
            onClick={onBack}
            aria-label="Back to dashboard"
          >
            <ChevronLeftIcon />
          </button>
          <h1 className="account-page-title">My Account</h1>
        </div>
      </header>

      <div className="account-page-body">
        <div className="account-info-grid">
          <div className="account-info-item">
            <span className="account-info-label">Email</span>
            <span className="account-info-value">{email}</span>
          </div>
          <div className="account-info-item">
            <span className="account-info-label">Created</span>
            <span className="account-info-value">{createdAt}</span>
          </div>
          <div className="account-info-item">
            <span className="account-info-label">Gender</span>
            <span className="account-info-value">{genderLabel}</span>
          </div>
        </div>

        <div className="account-section">
          <h4 className="account-section-title">Change Email</h4>
          {!emailEditing ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={openEmailEdit}
            >
              Change Email Address
            </button>
          ) : (
            <form onSubmit={submitEmailChange} autoComplete="off">
              <label className="edit-field">
                <span className="edit-field-label">New Email Address</span>
                <input
                  type="email"
                  className={
                    "edit-field-input" +
                    (emailErrors.newEmail ? " edit-field-input-error" : "")
                  }
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                  }}
                  placeholder="you@example.com"
                  autoComplete="off"
                />
                {emailErrors.newEmail && (
                  <span className="edit-field-error">
                    {emailErrors.newEmail}
                  </span>
                )}
              </label>
              <p className="account-tz-unconfirmed-note">
                We'll email a verification link to the new address. You'll enter
                your password there to finish the change, your current email
                stays active until then.
              </p>
              <div className="edit-dialog-actions confirm-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={cancelEmailEdit}
                  disabled={savingEmail}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={savingEmail}
                >
                  {savingEmail ? "Sending…" : "Send Verification Email"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="account-section">
          <h4 className="account-section-title">Time Zone</h4>
          {showTzSuggestion && (
            <div className="account-tz-suggestion" role="status">
              <span>
                Your device looks like it's set to{" "}
                <strong>{detectedTimeZone}</strong>, but your account is using{" "}
                <strong>{timeZone}</strong>. Streaks and daily resets follow the
                account setting.
              </span>
              <div className="account-tz-suggestion-actions">
                <button
                  type="button"
                  className="btn-primary confirm-actions-btn"
                  onClick={acceptTzSuggestion}
                >
                  Update to {detectedTimeZone}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={dismissTzSuggestion}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          <div className="edit-field">
            <label className="edit-field-label" htmlFor="account-timezone">
              Time Zone
            </label>
            <select
              id="account-timezone"
              className="edit-field-input account-select"
              value={timeZone}
              onChange={handleTimeZoneChange}
            >
              {TIME_ZONE_OPTIONS.some(
                (opt) => opt.value === timeZone,
              ) ? null : (
                <option value={timeZone}>{timeZone}</option>
              )}
              {TIME_ZONE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {tzSaved && <p className="account-success-msg">Time zone updated.</p>}
          {!tzSaved && timeZoneSource && timeZoneSource !== "manual" && (
            <p className="account-tz-unconfirmed-note">
              {timeZoneSource === "detected"
                ? "Set automatically at signup, not yet manually confirmed."
                : "Never confirmed — streaks are running on this default."}
            </p>
          )}
        </div>

        <div className="account-section">
          <h4 className="account-section-title">Change Password</h4>
          <form onSubmit={submitPasswordChange} autoComplete="off">
            <PasswordField
              label="Current Password"
              value={currentPw}
              onChange={(v) => {
                setCurrentPw(v);
                setSaved(false);
              }}
              placeholder="Enter current password"
              error={errors.currentPw}
              autoComplete="off"
            />
            <PasswordField
              label="New Password"
              value={newPw}
              onChange={(v) => {
                setNewPw(v);
                setSaved(false);
              }}
              placeholder="At least 8 characters"
              error={errors.newPw}
              autoComplete="off"
            />
            <PasswordField
              label="Confirm New Password"
              value={confirmPw}
              onChange={(v) => {
                setConfirmPw(v);
                setSaved(false);
              }}
              placeholder="Re-enter new password"
              error={errors.confirmPw}
              autoComplete="off"
            />

            <div className="account-password-row">
              <button
                type="button"
                className="account-forgot-link"
                onClick={() => setForgotPwOpen(true)}
              >
                Forgot Password?
              </button>
            </div>

            {saved && (
              <p className="account-success-msg">
                Password updated successfully.
              </p>
            )}

            <div className="edit-dialog-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingPassword}
              >
                Update Password
              </button>
            </div>
          </form>
        </div>

        <div className="account-section account-danger-section">
          <h4 className="account-section-title account-danger-title">
            Danger Zone
          </h4>
          <p className="account-danger-copy">
            Deleting your account permanently removes your habits, streaks, XP
            and shields.{" "}
            <span className="account-danger-copy-strong">
              This can't be undone.
            </span>
          </p>
          <button
            type="button"
            className="btn btn-ghost account-delete-btn"
            onClick={() => setDeleteStep("warn")}
          >
            Delete Account
          </button>
        </div>

        <div className="account-page-footer">
          <span className="account-contact-copy">Need help?</span>{" "}
          <a
            className="account-contact-link"
            href="mailto:seefahmed@gmail.com?subject=Aurakon%20Support"
          >
            Contact Us
          </a>
        </div>
      </div>

      {deleteStep === "warn" && (
        <ConfirmDialog
          ariaLabel="Delete account warning"
          icon={<WarningIcon />}
          title="This can't be undone"
          body={
            "Deleting your account erases everything forever, your habits, streaks, XP, shields and progress. You will lose it all permanently."
          }
          confirmLabel="Continue"
          confirmClassName="btn-danger"
          onCancel={() => setDeleteStep(null)}
          onConfirm={() => setDeleteStep("confirm")}
        />
      )}

      {deleteStep === "confirm" && (
        <ConfirmDialog
          ariaLabel="Confirm account deletion"
          icon={<WarningIcon />}
          title={'Delete "' + heroName + '"?'}
          body={
            <>
              This is your last chance to back out. We'll send a verification
              link to <strong>{email}</strong>, your account is only deleted
              once you confirm it from there.
            </>
          }
          confirmLabel={
            deleteSending ? "Sending..." : "Send Verification Email"
          }
          confirmClassName="btn-danger"
          onCancel={deleteSending ? () => {} : () => setDeleteStep(null)}
          onConfirm={deleteSending ? () => {} : confirmDeleteRequest}
        />
      )}

      {pendingTz && (
        <ConfirmDialog
          ariaLabel="Confirm time zone change"
          title="Change your time zone?"
          body={
            <>
              Your time zone will change from <strong>{timeZone}</strong> to{" "}
              <strong>{pendingTz}</strong>. Streaks and daily resets follow this
              setting.
            </>
          }
          confirmLabel="Yes, Change It"
          confirmClassName="btn-primary confirm-actions-btn"
          onCancel={cancelTimeZoneChange}
          onConfirm={confirmTimeZoneChange}
        />
      )}

      {forgotPwOpen && (
        <ConfirmDialog
          ariaLabel="Reset password"
          title="Reset Password"
          body={
            <>
              We'll send a verification link to <strong>{email}</strong>. Follow
              it to set a new password.
            </>
          }
          confirmLabel="Send Reset Link"
          confirmClassName="btn-primary confirm-actions-btn"
          onCancel={() => setForgotPwOpen(false)}
          onConfirm={() => {
            setForgotPwOpen(false);
            onForgotPassword();
          }}
        />
      )}
    </div>
  );
}
