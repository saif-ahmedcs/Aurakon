"use client";

import { useState } from "react";
import LogoImage from "../../common/LogoImage";
import FormInput from "../../common/FormInput";
import GenderModal, { GenderIcon } from "../GenderModal";

export function SignupScreen({
  formData,
  onChange,
  passwordVisibility,
  onTogglePassword,
  onSubmit,
  goTo,
  onSelectGender,
  genderError,
  loading,
  error,
}) {
  const [isGenderOpen, setIsGenderOpen] = useState(false);

  return (
    <>
      <LogoImage />
      <div className="sh">Begin Your Journey</div>
      <p className="tx">Create your account and awaken your Aura.</p>
      
      <form onSubmit={onSubmit} noValidate>
        <FormInput
          id="su-user"
          placeholder="Username"
          type="text"
          icon="user"
          value={formData.suUsername}
          onChange={onChange("suUsername")}
        />
        <FormInput
          id="su-email"
          placeholder="Email"
          type="email"
          icon="mail"
          value={formData.suEmail}
          onChange={onChange("suEmail")}
        />
        <FormInput
          id="su-pass"
          placeholder="Password"
          type="password"
          eye
          icon="lock"
          value={formData.suPassword}
          onChange={onChange("suPassword")}
          showPassword={!!passwordVisibility["su-pass"]}
          onToggle={() => onTogglePassword("su-pass")}
        />
        <FormInput
          id="su-cpass"
          placeholder="Confirm Password"
          type="password"
          eye
          icon="lock"
          value={formData.suConfirmPassword}
          onChange={onChange("suConfirmPassword")}
          showPassword={!!passwordVisibility["su-cpass"]}
          onToggle={() => onTogglePassword("su-cpass")}
        />
        <GenderField
          value={formData.suGender}
          error={genderError}
          onOpen={() => setIsGenderOpen(true)}
        />
        <GenderModal
          isOpen={isGenderOpen}
          value={formData.suGender}
          onSelect={onSelectGender}
          onClose={() => setIsGenderOpen(false)}
        />

        {error && <div className="login-err">{error}</div>}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Creating Account…" : "Create Account"}
        </button>
      </form>

      <div className="bt">
        Already have an account?{" "}
        <span className="lk" onClick={() => goTo("login")}>
          Log In
        </span>
      </div>
    </>
  );
}

function GenderField({ value, error, onOpen }) {
  const label = value === "male" ? "Male" : value === "female" ? "Female" : "";

  return (
    <div className={`gw${error ? " err" : ""}`}>
      <div className="gw-lbl">
        Choose Your Warrior's Gender<span className="req">*</span>
      </div>
      <button
        type="button"
        className={`gtrig${value ? " picked" : ""}`}
        onClick={onOpen}
        aria-haspopup="dialog"
        aria-expanded="false"
      >
        <span className="gtrig-left">
          {value && <GenderIcon type={value} />}
          <span className={`gtrig-txt${value ? "" : " ph"}`}>
            {label || "Select your warrior's gender"}
          </span>
        </span>
        <svg className="gtrig-chev" viewBox="0 0 20 20" fill="none">
          <path
            d="M6 8l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {error && (
        <div className="gerr">
          Select your warrior's gender to awaken your Aura.
        </div>
      )}
    </div>
  );
}
