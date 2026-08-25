"use client";

import { useEffect, useState } from "react";
import { confirmVerificationRequest, resendVerificationRequest } from "../../../services/authApi";

export function TokenVerifyScreen({ token, goTo, initialEmail = "" }) {
  const [status, setStatus] = useState("verifying"); // 'verifying' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState("");
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    let isMounted = true;

    async function verifyToken() {
      if (!token) {
        setStatus("error");
        setErrorMessage("Verification token is missing from the link.");
        return;
      }

      try {
        await confirmVerificationRequest(token);
        if (isMounted) {
          setStatus("success");
        }
      } catch (err) {
        if (isMounted) {
          setStatus("error");
          let msg = err.error || "This verification link is invalid or has expired.";
          if (err.status === 400 && msg.toLowerCase().includes("already verified")) {
            setStatus("success");
            return;
          }
          setErrorMessage(msg);
        }
      }
    }

    verifyToken();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (resendLoading || resendCooldown > 0) return;

    const email = resendEmail.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setResendFeedback({
        type: "error",
        message: "Please enter a valid email address.",
      });
      return;
    }

    setResendLoading(true);
    setResendFeedback(null);

    try {
      const res = await resendVerificationRequest({ email });
      setResendCooldown(60);
      setResendFeedback({
        type: "success",
        message: res.message || "A new verification link has been dispatched to your inbox!",
      });
    } catch (err) {
      setResendFeedback({
        type: "error",
        message: err.error || "Unable to resend email right now. Please try again.",
      });
    } finally {
      setResendLoading(false);
    }
  };

  if (status === "verifying") {
    return (
      <div className="isc">
        <div className="ic email-spin-icon">⏳</div>
        <h3>Awakening Your Aura…</h3>
        <p>Please wait while we verify your confirmation token.</p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="isc">
        <div className="cc">✓</div>
        <h3>Aura Successfully Awakened</h3>
        <p>Your account is verified. Your journey begins now.</p>
        <button
          className="btn"
          type="button"
          onClick={() => {
            if (goTo) goTo("login");
            else window.location.href = "/";
          }}
        >
          Continue to Log In
        </button>
      </div>
    );
  }

  return (
    <div className="isc">
      <div className="ic" style={{ borderColor: "rgba(248, 113, 113, 0.4)", color: "#f87171" }}>
        ✕
      </div>
      <h3>Verification Failed</h3>
      <p className="tx" style={{ marginBottom: "14px" }}>
        {errorMessage || "This verification link has expired or has already been used."}
      </p>

      {resendFeedback && (
        <div
          className={`auth-alert ${
            resendFeedback.type === "success" ? "auth-alert-success" : "auth-alert-error"
          }`}
          style={{ marginBottom: "14px" }}
        >
          {resendFeedback.message}
        </div>
      )}

      <form onSubmit={handleResend} style={{ width: "100%", textAlign: "left" }}>
        <input
          type="email"
          className="inp pl"
          placeholder="Enter your email to resend"
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          style={{ marginBottom: "10px" }}
        />
        <button
          className="btn"
          type="submit"
          disabled={resendLoading || resendCooldown > 0}
        >
          {resendLoading
            ? "Sending New Link…"
            : resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : "Send New Verification Link"}
        </button>
      </form>

      <div className="bt">
        <span
          className="lk"
          onClick={() => {
            if (goTo) goTo("login");
            else window.location.href = "/";
          }}
        >
          Back to Log In
        </span>
      </div>
    </div>
  );
}
