"use client";

export function ResetSentScreen({
  registeredEmail,
  onOpenEmailApp,
  onResend,
  resendLoading,
  resendFeedback,
  resendCooldown,
  goTo,
}) {
  const displayEmail = registeredEmail || "your email";

  return (
    <>
      <div className="ic email-pulse-icon" style={{ fontSize: "24px" }}>
        ✉
      </div>
      <h3>A recovery message has been sent.</h3>
      <p className="tx" style={{ marginBottom: "12px" }}>
        We sent password reset instructions to your address. This link is valid for 1 hour.
      </p>

      {displayEmail && (
        <div className="verify-email-badge">
          <span className="verify-email-text">{displayEmail}</span>
        </div>
      )}

      <p className="tx" style={{ marginBottom: "16px", fontSize: "12.5px" }}>
        Didn't receive the email? Check your Spam or Junk folder.
      </p>

      {resendFeedback && (
        <div
          className={`auth-alert ${
            resendFeedback.type === "success" ? "auth-alert-success" : "auth-alert-error"
          }`}
        >
          {resendFeedback.message}
        </div>
      )}

      <button className="btn" type="button" onClick={onOpenEmailApp}>
        Open Email App
      </button>

      <button
        className="btn out"
        type="button"
        disabled={resendLoading || resendCooldown > 0}
        onClick={() => onResend && onResend(registeredEmail)}
      >
        {resendLoading
          ? "Sending Link…"
          : resendCooldown > 0
          ? `Resend in ${resendCooldown}s`
          : "Resend Reset Link"}
      </button>

      <div className="bt">
        <span className="lk" onClick={() => goTo("login")}>
          Back to Log In
        </span>
      </div>
    </>
  );
}
