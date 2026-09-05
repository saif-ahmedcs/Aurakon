"use client";

import { useState } from "react";
import { MedalStarIcon } from "../icons";
import { openEmailProvider } from "../../../../utils/emailProvider";

/* Shown right after requesting an email change. The person leaves the
 * app here and taps the real link sent to their *new* address, which
 * hits the /confirm-email-change route carrying a one-time token
 * (that route asks for the current password again before finalizing).
 * The account keeps its current email until that link is confirmed. */
export function EmailChangeCheckScreen({
  newEmail,
  onBack,
  onResend,
  onCancel,
}) {
  const [resending, setResending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async () => {
    if (resending) return;
    setResending(true);
    setResent(false);
    const ok = await onResend();
    setResending(false);
    if (ok) setResent(true);
  };

  const handleCancel = async () => {
    if (cancelling) return;
    setCancelling(true);
    await onCancel();
    setCancelling(false);
  };

  return (
    <div className="logged-out-screen">
      <div className="logged-out-card">
        <span className="logged-out-badge" aria-hidden="true">
          <MedalStarIcon />
        </span>
        <h2 className="logged-out-title">Confirm New Email</h2>
        <p className="logged-out-body" style={{ marginBottom: "10px" }}>
          We sent a verification link to <strong>{newEmail}</strong>. Open it to
          finish moving your account to this address, it won't change until you
          confirm from there.
        </p>
        <p
          className="logged-out-body"
          style={{ fontSize: "12px", color: "var(--t3)" }}
        >
          Didn't receive the email? Check your Spam or Junk folder.
        </p>
        <button
          type="button"
          className="btn btn-primary logged-out-btn"
          onClick={() => openEmailProvider(newEmail)}
        >
          Open Email App
        </button>
        <button
          type="button"
          className="btn btn-ghost check-email-back-btn"
          onClick={handleResend}
          disabled={resending}
        >
          {resending ? "Resending…" : "Resend Verification Email"}
        </button>
        {resent && (
          <p className="account-success-msg" style={{ marginTop: "-4px" }}>
            Verification email resent.
          </p>
        )}
        <button
          type="button"
          className="btn btn-ghost check-email-back-btn"
          onClick={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? "Cancelling…" : "Cancel Email Change"}
        </button>
        <button
          type="button"
          className="btn btn-ghost check-email-back-btn"
          onClick={onBack}
        >
          Back to My Account
        </button>
      </div>
    </div>
  );
}
