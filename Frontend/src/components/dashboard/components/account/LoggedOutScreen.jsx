"use client";

import { CrossedSwordsIcon } from "../icons";

/* Full-screen sign-out state shown after logging out or deleting the
 * account. Swap onReturn for a real route change to the sign-in page
 * once auth is wired up. */
export function LoggedOutScreen({ deleted, onReturn }) {
  return (
    <div className="logged-out-screen">
      <div className="logged-out-card">
        <span className="logged-out-badge" aria-hidden="true">
          <CrossedSwordsIcon />
        </span>
        <h2 className="logged-out-title">
          {deleted ? "Account Deleted" : "You're Logged Out"}
        </h2>
        <p className="logged-out-body">
          {deleted
            ? "Your account and all of its progress have been permanently removed."
            : "You've been signed out. Sign back in to keep tracking your habits and streak."}
        </p>
        <button
          type="button"
          className="btn btn-primary logged-out-btn"
          onClick={onReturn}
        >
          {deleted ? "Back to Sign Up" : "Return to Sign In"}
        </button>
      </div>
    </div>
  );
}
