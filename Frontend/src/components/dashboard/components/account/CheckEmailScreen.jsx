"use client";

import { MedalStarIcon } from "../icons";
import { openEmailProvider } from "../../../../utils/emailProvider";

/* Shown right after a password-reset email goes out. The person leaves
 * the app here and taps the real link in their inbox, which opens the
 * existing /reset-password route with a one-time token. */
export function CheckEmailScreen({ email, onBack }) {
  return (
    <div className="logged-out-screen">
      <div className="logged-out-card">
        <span className="logged-out-badge" aria-hidden="true">
          <MedalStarIcon />
        </span>
        <h2 className="logged-out-title">Check Your Email</h2>
        <p className="logged-out-body">
          We sent a verification link to <strong>{email}</strong>. Open it to
          choose a new password.
        </p>
        <button
          type="button"
          className="btn btn-primary logged-out-btn"
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
