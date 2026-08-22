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
} from "./screens";

const ISC_SCREENS = new Set(["verify", "verified", "reset_sent", "reset_ok"]);

export default function FormZone() {
  const {
    screen,
    exiting,
    isFirstLoad,
    formData,
    passwordVisibility,
    genderError,
    scrRef,
    handleChange,
    handleSelectGender,
    togglePasswordVisibility,
    goTo,
    handleLoginSubmit,
    handleSignupSubmit,
    handleForgotSubmit,
    handleResetSubmit,
    handleOpenEmailApp,
  } = useAuthFlow();

  const screenProps = {
    formData,
    onChange: handleChange,
    passwordVisibility,
    onTogglePassword: togglePasswordVisibility,
    goTo,
  };

  const screenContent = {
    login: <LoginScreen {...screenProps} onSubmit={handleLoginSubmit} />,
    signup: (
      <SignupScreen
        {...screenProps}
        onSubmit={handleSignupSubmit}
        onSelectGender={handleSelectGender}
        genderError={genderError}
      />
    ),
    verify: <VerifyScreen goTo={goTo} onOpenEmailApp={handleOpenEmailApp} />,
    verified: <VerifiedScreen goTo={goTo} />,
    forgot: <ForgotScreen {...screenProps} onSubmit={handleForgotSubmit} />,
    reset_sent: <ResetSentScreen goTo={goTo} />,
    reset: <ResetScreen {...screenProps} onSubmit={handleResetSubmit} />,
    reset_ok: <ResetOkScreen goTo={goTo} />,
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
