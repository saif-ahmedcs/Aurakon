"use client";

export function VerifyScreen({
  registeredEmail,
  onOpenEmailApp,
  onResendVerification,
  resendLoading,
  resendFeedback,
  resendCooldown,
  goTo,
}) {
  const displayEmail = registeredEmail || "your email";

  return (
    <>
      <div className="ic email-pulse-icon">✉</div>
      <h3>Your journey cannot begin yet.</h3>
      <p className="tx" style={{ marginBottom: "12px" }}>
        Verify your email address to awaken your Aura and access your dashboard.
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
        onClick={() => onResendVerification(registeredEmail)}
      >
        {resendLoading
          ? "Sending Link…"
          : resendCooldown > 0
          ? `Resend Email in ${resendCooldown}s`
          : "Resend Verification Email"}
      </button>

      <div className="verify-footer-links">
        <span className="lk" onClick={() => goTo("login")}>
          I've Verified • Log In
        </span>
        <span className="bullet-sep">•</span>
        <span className="lk" onClick={() => goTo("signup")}>
          Wrong Email?
        </span>
      </div>
    </>
  );
}
