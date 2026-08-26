"use client";

import {
  CheckIcon,
  HourglassIcon,
  ShieldIcon,
  CloseIcon,
} from "../icons";

/* ---------------------------------------------------------------- */
/* Review session - walks the user through every unresolved day, one */
/* at a time. A miss only offers the shield option when the backend  */
/* reports shields available; with none, that step is skipped        */
/* entirely rather than showing a disabled/greyed-out offer.         */
/* ---------------------------------------------------------------- */

export function ReviewSessionModal({
  queue,
  index,
  step,
  shieldsAvailable,
  rateLimitCountdown,
  onRecovered,
  onMissed,
  onRequestShieldUse,
  onConfirmShieldUse,
  onCancelShieldUse,
  onDeclineShield,
  onClose,
}) {
  if (!queue.length || index >= queue.length) return null;
  const current = queue[index];
  const d = new Date(current.date + "T00:00:00");
  const prettyDate = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const isRateLimited = rateLimitCountdown > 0;

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div
        className={`review-dialog${step === "confirmShield" ? " review-dialog-confirm" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Review missed trial"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="review-dialog-head">
          <span className="review-dialog-progress">
            {index + 1} of {queue.length}
          </span>
          <button
            type="button"
            className="icon-btn detail-close-btn"
            onClick={onClose}
            aria-label="Close review session"
          >
            <CloseIcon />
          </button>
        </div>

        {step === "ask" && (
          <>
            <p className="review-dialog-eyebrow">Pending trial</p>
            <h3 className="review-dialog-title">{current.habitName}</h3>
            <p className="review-dialog-date">{prettyDate}</p>
            <p className="review-dialog-body">
              You didn't check in that day. What actually happened?
            </p>
            {isRateLimited && (
              <p className="review-dialog-rate-limit">
                Rate limited. Retry in {rateLimitCountdown}s...
              </p>
            )}
            <div className="review-dialog-actions">
              <button
                type="button"
                className="btn btn-review btn-review-recover"
                onClick={onRecovered}
                disabled={isRateLimited}
              >
                <CheckIcon />I did it, just forgot to check in
              </button>
              <button
                type="button"
                className="btn btn-review btn-review-miss"
                onClick={onMissed}
                disabled={isRateLimited}
              >
                <HourglassIcon />I actually missed this one
              </button>
            </div>
          </>
        )}

        {step === "shieldOffer" && (
          <>
            <p className="review-dialog-eyebrow">Streak shield available</p>
            <h3 className="review-dialog-title">Save your streak?</h3>
            <p className="review-dialog-date">
              {current.habitName} · {prettyDate}
            </p>
            <p className="review-dialog-body">
              You have {shieldsAvailable} streak shield
              {shieldsAvailable === 1 ? "" : "s"} available. Use one to cover
              this miss and keep your streak going.
            </p>
            {isRateLimited && (
              <p className="review-dialog-rate-limit">
                Rate limited. Retry in {rateLimitCountdown}s...
              </p>
            )}
            <div className="review-dialog-actions">
              <button
                type="button"
                className="btn btn-review btn-review-shield"
                onClick={onRequestShieldUse}
                disabled={isRateLimited}
              >
                <ShieldIcon size={26} />
                Use a shield
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onDeclineShield}
                disabled={isRateLimited}
              >
                No, mark it missed
              </button>
            </div>
          </>
        )}

        {step === "confirmShield" && (
          <>
            <div className="review-confirm-icon" aria-hidden="true">
              <span className="review-confirm-ring" />
              <span className="review-confirm-ring review-confirm-ring-delay" />
              <span className="review-confirm-icon-core">
                <ShieldIcon size={64} />
              </span>
            </div>
            <p className="review-dialog-eyebrow review-dialog-eyebrow-confirm">
              Are you sure?
            </p>
            <h3 className="review-dialog-title review-dialog-title-confirm">
              Use 1 streak shield?
            </h3>
            <p className="review-dialog-date">
              {current.habitName} · {prettyDate}
            </p>
            <p className="review-dialog-body">
              This will spend one shield to cover this miss and keep your streak
              alive. You'll have {Math.max(0, shieldsAvailable - 1)} left
              afterward. This can't be undone.
            </p>
            {isRateLimited && (
              <p className="review-dialog-rate-limit">
                Rate limited. Retry in {rateLimitCountdown}s...
              </p>
            )}
            <div className="review-dialog-actions">
              <button
                type="button"
                className="btn btn-review btn-review-shield btn-review-confirm"
                onClick={onConfirmShieldUse}
                disabled={isRateLimited}
              >
                <ShieldIcon size={26} />
                Yes, use it
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onCancelShieldUse}
                disabled={isRateLimited}
              >
                No, go back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
