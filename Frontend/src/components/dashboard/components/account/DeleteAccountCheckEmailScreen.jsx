"use client";

import { MedalStarIcon } from "../icons";
import { openEmailProvider } from "../../../../utils/emailProvider";

/* Shown right after the account-deletion verification email goes out.
 * The person leaves the app here and taps the real link in their
 * inbox, which hits the /confirm-account-deletion route carrying a
 * one-time token. The account is only actually deleted once that link
 * is confirmed from there. */
export function DeleteAccountCheckEmailScreen({ email, onBack }) {
  return (
    <div className="logged-out-screen">
      <div className="logged-out-card">
        <span className="logged-out-badge" aria-hidden="true">
          <MedalStarIcon />
        </span>
        <h2 className="logged-out-title">Confirm Account Deletion</h2>
        <p className="logged-out-body">
          We sent a verification link to <strong>{email}</strong>. Open it to
          permanently delete your account, it won't be removed until you
          confirm from there.
        </p>
        <button
          type="button"
          className="btn btn-danger logged-out-btn"
          onClick={() => openEmailProvider(email)}
        >
          Open Email App
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
