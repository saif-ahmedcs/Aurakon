"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  loginRequest,
  registerRequest,
  resendVerificationRequest,
  forgotPasswordRequest,
  resetPasswordRequest,
  startDemoRequest,
} from "../services/authApi";
import { setAccessToken } from "../services/tokenStore";
import { openEmailProvider } from "../utils/emailProvider";

const INITIAL_FORM_DATA = {
  loginEmail: "",
  loginPassword: "",
  suUsername: "",
  suEmail: "",
  suPassword: "",
  suConfirmPassword: "",
  suGender: "",
  fpEmail: "",
  rsEmail: "",
  rsPassword: "",
  rsConfirmPassword: "",
};

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function meetsPasswordPolicy(password) {
  return (
    password.length >= 8 &&
    password.length <= 72 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password)
  );
}

export function useAuthFlow({
  initialScreen = "login",
  initialToken = null,
} = {}) {
  const [screen, setScreen] = useState(initialScreen);
  const [exiting, setExiting] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [passwordVisibility, setPasswordVisibility] = useState({});
  const [genderError, setGenderError] = useState(false);

  // Status & loading states
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginNeedsVerification, setLoginNeedsVerification] = useState(false);

  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState("");

  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState("");

  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetToken, setResetToken] = useState(initialToken);

  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState(null); // { type: 'success' | 'error', message: string }
  const [resendCooldown, setResendCooldown] = useState(0);

  const scrRef = useRef(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (field) => (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (loginError && (field === "loginEmail" || field === "loginPassword")) {
      setLoginError("");
      setLoginNeedsVerification(false);
    }
    if (signupError) setSignupError("");
    if (forgotError) setForgotError("");
    if (resetError) setResetError("");
  };

  const handleSelectGender = (value) => {
    setFormData((prev) => ({ ...prev, suGender: value }));
    setGenderError(false);
  };

  const togglePasswordVisibility = (id) => {
    setPasswordVisibility((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const goTo = (name) => {
    if (name === screen) return;
    setLoginError("");
    setLoginNeedsVerification(false);
    setSignupError("");
    setForgotError("");
    setResetError("");
    setResendFeedback(null);
    setExiting(true);
    setTimeout(() => {
      setScreen(name);
      setIsFirstLoad(false);
      setExiting(false);
    }, 180);
  };

  useEffect(() => {
    const el = scrRef.current;
    if (!el || exiting) return;

    if (isFirstLoad) {
      Array.from(el.children).forEach((child, i) => {
        child.style.transitionDelay = `${i * 80}ms`;
      });
    } else {
      el.style.opacity = "0";
      el.style.transform = "translateY(10px)";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        });
      });
    }
  }, [screen, exiting, isFirstLoad]);

  // Login handler
  const handleLoginSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (loginLoading) return;

      const email = formData.loginEmail.trim();
      const password = formData.loginPassword;

      if (!email) {
        setLoginError("Please enter your email.");
        return;
      }
      if (!password) {
        setLoginError("Please enter your password.");
        return;
      }

      setLoginError("");
      setLoginNeedsVerification(false);
      setLoginLoading(true);

      try {
        const { accessToken } = await loginRequest({ email, password });
        setAccessToken(accessToken);
        // Authenticated: hand off to the dashboard. A full navigation
        // keeps the flow simple - the refresh cookie restores the
        // short-lived access token on the other side.
        window.location.href = "/dashboard";
      } catch (err) {
        let message = err.error || "Something went wrong. Please try again.";

        if (err.status === 429 && typeof err.retryAfter === "number") {
          const mins = Math.ceil(err.retryAfter / 60);
          message =
            mins >= 2
              ? `${message} Try again in ${mins} minutes.`
              : `${message} Try again in ${err.retryAfter} seconds.`;
        }

        if (
          err.status === 403 &&
          message.toLowerCase().includes("verify your email")
        ) {
          setLoginNeedsVerification(true);
          setRegisteredEmail(email);
        }

        setLoginError(message);
      } finally {
        setLoginLoading(false);
      }
    },
    [loginLoading, formData.loginEmail, formData.loginPassword],
  );

  // Demo handler - rebuilds the shared demo account fresh, then logs in
  const handleTryDemo = useCallback(async () => {
    if (demoLoading) return;

    setDemoError("");
    setDemoLoading(true);

    try {
      const { accessToken } = await startDemoRequest();
      setAccessToken(accessToken);
      window.location.href = "/dashboard";
    } catch (err) {
      let message = err.error || "Couldn't start the demo. Please try again.";

      if (err.status === 429 && typeof err.retryAfter === "number") {
        const mins = Math.ceil(err.retryAfter / 60);
        message =
          mins >= 2
            ? `${message} Try again in ${mins} minutes.`
            : `${message} Try again in ${err.retryAfter} seconds.`;
      }

      setDemoError(message);
    } finally {
      setDemoLoading(false);
    }
  }, [demoLoading]);

  // Signup handler with validation and backend registration
  const handleSignupSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (signupLoading) return;

      const username = formData.suUsername.trim();
      const email = formData.suEmail.trim();
      const password = formData.suPassword;
      const confirmPassword = formData.suConfirmPassword;
      const gender = formData.suGender;

      if (!username) {
        setSignupError("Please enter a username.");
        return;
      }
      if (username.length < 3 || username.length > 20) {
        setSignupError("Username must be between 3 and 20 characters.");
        return;
      }
      if (!email || !isValidEmail(email)) {
        setSignupError("Please enter a valid email address.");
        return;
      }
      if (!password) {
        setSignupError("Please enter a password.");
        return;
      }
      if (!meetsPasswordPolicy(password)) {
        setSignupError(
          "Password must be at least 8 characters and contain both letters and numbers.",
        );
        return;
      }
      if (password !== confirmPassword) {
        setSignupError("Passwords do not match.");
        return;
      }
      if (!gender) {
        setGenderError(true);
        setSignupError(
          "Please select your warrior's gender to awaken your Aura.",
        );
        return;
      }

      setGenderError(false);
      setSignupError("");
      setSignupLoading(true);

      let detectedTimezone;
      try {
        detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch {
        detectedTimezone = undefined;
      }

      try {
        await registerRequest({
          email,
          password,
          username,
          gender,
          timezone: detectedTimezone,
        });
        setRegisteredEmail(email);
        setResendCooldown(60); // 60s cooldown
        goTo("verify");
      } catch (err) {
        let message =
          err.error || "Failed to create account. Please try again.";
        if (err.status === 409) {
          message = "An account with this email already exists.";
        }
        setSignupError(message);
      } finally {
        setSignupLoading(false);
      }
    },
    [
      signupLoading,
      formData.suUsername,
      formData.suEmail,
      formData.suPassword,
      formData.suConfirmPassword,
      formData.suGender,
    ],
  );

  // Resend verification email
  const handleResendVerification = useCallback(
    async (overrideEmail) => {
      if (resendLoading || resendCooldown > 0) return;

      const targetEmail = (
        overrideEmail ||
        registeredEmail ||
        formData.suEmail ||
        formData.loginEmail
      ).trim();

      if (!targetEmail || !isValidEmail(targetEmail)) {
        setResendFeedback({
          type: "error",
          message: "Please specify a valid email address.",
        });
        return;
      }

      setResendLoading(true);
      setResendFeedback(null);

      try {
        const result = await resendVerificationRequest({ email: targetEmail });
        setResendCooldown(60);
        setResendFeedback({
          type: "success",
          message:
            result.message ||
            "A new verification link has been sent to your inbox!",
        });
      } catch (err) {
        setResendFeedback({
          type: "error",
          message:
            err.error || "Unable to resend email right now. Please try later.",
        });
      } finally {
        setResendLoading(false);
      }
    },
    [
      resendLoading,
      resendCooldown,
      registeredEmail,
      formData.suEmail,
      formData.loginEmail,
    ],
  );

  // Forgot password handler
  const handleForgotSubmit = useCallback(
    async (e) => {
      if (e) e.preventDefault();
      if (forgotLoading) return;

      const email = formData.fpEmail.trim();

      if (!email || !isValidEmail(email)) {
        setForgotError("Please enter a valid email address.");
        return;
      }

      setForgotError("");
      setForgotLoading(true);

      try {
        await forgotPasswordRequest({ email });
        setRegisteredEmail(email);
        setResendCooldown(60);
        goTo("reset_sent");
      } catch (err) {
        let message =
          err.error || "Failed to send reset link. Please try again.";
        if (err.status === 429 && typeof err.retryAfter === "number") {
          const mins = Math.ceil(err.retryAfter / 60);
          message = `Too many requests. Please try again in ${mins} minute${mins > 1 ? "s" : ""}.`;
        }
        setForgotError(message);
      } finally {
        setForgotLoading(false);
      }
    },
    [forgotLoading, formData.fpEmail],
  );

  // Reset password submit handler
  const handleResetSubmit = useCallback(
    async (e, tokenParam) => {
      if (e) e.preventDefault();
      if (resetLoading) return;

      const token = tokenParam || resetToken;
      const email = formData.rsEmail.trim();
      const newPassword = formData.rsPassword;
      const confirmPassword = formData.rsConfirmPassword;

      if (!token) {
        setResetError(
          "Reset token is missing or invalid. Please request a new link.",
        );
        return;
      }
      if (!email || !isValidEmail(email)) {
        setResetError("Please enter the email address for your account.");
        return;
      }
      if (!newPassword) {
        setResetError("Please enter a new password.");
        return;
      }
      if (!meetsPasswordPolicy(newPassword)) {
        setResetError(
          "Password must be at least 8 characters and contain both letters and numbers.",
        );
        return;
      }
      if (newPassword !== confirmPassword) {
        setResetError("Passwords do not match.");
        return;
      }

      setResetError("");
      setResetLoading(true);

      try {
        await resetPasswordRequest({ token, email, newPassword });
        goTo("reset_ok");
      } catch (err) {
        let message =
          err.error || "Failed to reset password. Please try again.";
        if (err.status === 400 && message.toLowerCase().includes("different")) {
          message =
            "New password must be different from your previous password.";
        } else if (err.status === 400 || err.status === 404) {
          message =
            "This password reset link is invalid or has expired. Please request a new one.";
        }
        setResetError(message);
      } finally {
        setResetLoading(false);
      }
    },
    [
      resetLoading,
      resetToken,
      formData.rsEmail,
      formData.rsPassword,
      formData.rsConfirmPassword,
    ],
  );

  const handleOpenEmailApp = (e) => {
    if (e) e.preventDefault();
    const targetEmail =
      registeredEmail ||
      formData.suEmail ||
      formData.fpEmail ||
      formData.loginEmail;
    openEmailProvider(targetEmail);
  };

  return {
    screen,
    exiting,
    isFirstLoad,
    formData,
    passwordVisibility,
    genderError,
    // Login state
    loginLoading,
    loginError,
    loginNeedsVerification,
    // Demo state
    demoLoading,
    demoError,
    // Signup state
    signupLoading,
    signupError,
    // Forgot state
    forgotLoading,
    forgotError,
    // Reset state
    resetLoading,
    resetError,
    resetToken,
    setResetToken,
    // Email & Resend state
    registeredEmail,
    setRegisteredEmail,
    resendLoading,
    resendFeedback,
    resendCooldown,
    // Handlers
    scrRef,
    handleChange,
    handleSelectGender,
    togglePasswordVisibility,
    goTo,
    handleLoginSubmit,
    handleTryDemo,
    handleSignupSubmit,
    handleResendVerification,
    handleForgotSubmit,
    handleResetSubmit,
    handleOpenEmailApp,
  };
}
