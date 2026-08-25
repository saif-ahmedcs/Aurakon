import { PendingIcon } from "./icons";

/* ---------------------------------------------------------------- */
/* Pending review banner - a moving, ticker-style notification that  */
/* only appears while at least one trial is awaiting review.         */
/* ---------------------------------------------------------------- */

export function PendingReviewBanner({ count, onOpen }) {
  if (count <= 0) return null;
  const message =
    count +
    " trial" +
    (count > 1 ? "s" : "") +
    " awaiting your review, tap to confirm what happened and protect your streak.";

  return (
    <button
      type="button"
      className="review-banner"
      onClick={onOpen}
      aria-label={message}
    >
      <span className="review-banner-icon">
        <PendingIcon size={36} />
      </span>
      <span className="review-banner-track">
        <span className="review-banner-marquee">
          <span className="review-banner-text">{message}</span>
          <span className="review-banner-text" aria-hidden="true">
            {message}
          </span>
        </span>
      </span>
      <span className="review-banner-cta">Review</span>
    </button>
  );
}
