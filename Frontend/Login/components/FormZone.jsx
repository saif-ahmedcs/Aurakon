"use client";

import { useState, useRef, useEffect } from "react";
import {
  LoginScreen,
  SignupScreen,
  VerifyScreen,
  VerifiedScreen,
  ForgotScreen,
  ResetSentScreen,
  ResetScreen,
  ResetOkScreen,
} from "./AuthScreens";

const ISC_SCREENS = new Set(["verify", "verified", "reset_sent", "reset_ok"]);

const INITIAL_FORM_DATA = {
  loginEmail: "",
  loginPassword: "",
  suUsername: "",
  suEmail: "",
  suPassword: "",
  suConfirmPassword: "",
  suGender: "",
  fpEmail: "",
  rsPassword: "",
  rsConfirmPassword: "",
};

export default function FormZone() {
  const [screen, setScreen] = useState("login");
  const [exiting, setExiting] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [passwordVisibility, setPasswordVisibility] = useState({});
  const [genderError, setGenderError] = useState(false);
  const scrRef = useRef(null);

  const handleChange = (field) => (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, [field]: value }));
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

  const handleLoginSubmit = (e) => {
    e.preventDefault();
  };

  const handleSignupSubmit = (e) => {
    e.preventDefault();
    if (!formData.suGender) {
      setGenderError(true);
      return;
    }
    goTo("verify");
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    goTo("reset_sent");
  };

  const handleResetSubmit = (e) => {
    e.preventDefault();
    goTo("reset_ok");
  };

  const handleOpenEmailApp = (e) => {
    e.preventDefault();
  };

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
