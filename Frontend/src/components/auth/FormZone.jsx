"use client";

import { useAuthFlow } from "../../hooks/useAuthFlow";
import {
  LoginScreen,
  SignupScreen,
  VerifyScreen,
  VerifiedScreen,
  ForgotScreen,
  ResetSentScreen,
  ResetScreen,
  ResetOkScreen,
  TokenVerifyScreen,
} from "./screens";

const ISC_SCREENS = new Set(["verify", "verified", "reset_sent", "reset_ok", "verify_token"]);

export default function FormZone({ initialScreen = "login", initialToken = null, initialEmail = "" }) {
  const {
    screen,
    exiting,
    isFirstLoad,
    formData,
    passwordVisibility,
    genderError,
    // Status states
    loginLoading,
    loginError,
    loginNeedsVerification,
    demoLoading,
    demoError,
    signupLoading,
    signupError,
    forgotLoading,
    forgotError,
    resetLoading,
    resetError,
    resetToken,
    registeredEmail,
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
  } = useAuthFlow({ initialScreen, initialToken });

  const activeEmail = registeredEmail || initialEmail;

  const screenProps = {
    formData,
    onChange: handleChange,
    passwordVisibility,
    onTogglePassword: togglePasswordVisibility,
    goTo,
  };

  const screenContent = {
    login: (
      <LoginScreen
        {...screenProps}
        onSubmit={handleLoginSubmit}
        loading={loginLoading}
        error={loginError}
        needsVerification={loginNeedsVerification}
        onResendVerification={handleResendVerification}
        onTryDemo={handleTryDemo}
        demoLoading={demoLoading}
        demoError={demoError}
      />
    ),
    signup: (
      <SignupScreen
        {...screenProps}
        onSubmit={handleSignupSubmit}
        onSelectGender={handleSelectGender}
        genderError={genderError}
        loading={signupLoading}
        error={signupError}
      />
    ),
    verify: (
      <VerifyScreen
        registeredEmail={activeEmail}
        onOpenEmailApp={handleOpenEmailApp}
        onResendVerification={handleResendVerification}
        resendLoading={resendLoading}
        resendFeedback={resendFeedback}
        resendCooldown={resendCooldown}
        goTo={goTo}
      />
    ),
    verified: <VerifiedScreen goTo={goTo} />,
    forgot: (
      <ForgotScreen
        {...screenProps}
        onSubmit={handleForgotSubmit}
        loading={forgotLoading}
        error={forgotError}
      />
    ),
    reset_sent: (
      <ResetSentScreen
        registeredEmail={activeEmail}
        onOpenEmailApp={handleOpenEmailApp}
        onResend={() => handleForgotSubmit()}
        resendLoading={forgotLoading}
        resendFeedback={resendFeedback}
        resendCooldown={resendCooldown}
        goTo={goTo}
      />
    ),
    reset: (
      <ResetScreen
        {...screenProps}
        onSubmit={(e) => handleResetSubmit(e, initialToken || resetToken)}
        loading={resetLoading}
        error={resetError}
      />
    ),
    reset_ok: <ResetOkScreen goTo={goTo} />,
    verify_token: (
      <TokenVerifyScreen
        token={initialToken}
        initialEmail={activeEmail}
        goTo={goTo}
      />
    ),
  }[screen];

  const scrClassName = [
    "scr",
    ISC_SCREENS.has(screen) ? "isc" : "",
    isFirstLoad ? "intro" : "",
    exiting ? "out" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="fz" id="fz">
      <div className={`fc${screen === "signup" ? " fc-su" : ""}`}>
        <div id="scrhost">
          <div className={scrClassName} ref={scrRef}>
            {screenContent}
          </div>
        </div>
      </div>
    </div>
  );
}
