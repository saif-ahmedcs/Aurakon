"use client";

import { useState, useRef, useEffect } from "react";

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

// Owns all state and business logic for the login/signup/reset flow:
// which screen is showing, form field values, password visibility,
// gender validation, and the screen-transition animation. FormZone.jsx
// consumes this hook and stays focused on rendering.
export function useAuthFlow() {
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

  return {
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
  };
}
