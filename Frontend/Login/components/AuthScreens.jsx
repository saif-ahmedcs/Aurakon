"use client";

import { useState } from "react";
import LogoImage from "./LogoImage";
import FormInput from "./FormInput";
import GenderModal, { GenderIcon } from "./GenderModal";

export function LoginScreen({
  formData,
  onChange,
  passwordVisibility,
  onTogglePassword,
  onSubmit,
  goTo,
}) {
  return (
    <>
      <LogoImage />
      <div className="sh">Continue Your Journey</div>
      <p className="tx">Continue building your legacy.</p>
      <FormInput
        id="lg-email"
        placeholder="Email"
        type="email"
        icon="mail"
        value={formData.loginEmail}
        onChange={onChange("loginEmail")}
      />
      <FormInput
        id="lg-pass"
        placeholder="Password"
        type="password"
        eye
        icon="lock"
        value={formData.loginPassword}
        onChange={onChange("loginPassword")}
        showPassword={!!passwordVisibility["lg-pass"]}
        onToggle={() => onTogglePassword("lg-pass")}
      />
      <div className="fr">
        <span className="lk" onClick={() => goTo("forgot")}>
          Forgot Password?
        </span>
      </div>
      <button className="btn" onClick={onSubmit}>
        Log In
      </button>
      <div className="bt">
        Don't have an account?{" "}
        <span className="lk" onClick={() => goTo("signup")}>
          Sign Up
        </span>
      </div>
    </>
  );
}

export function SignupScreen({
  formData,
  onChange,
  passwordVisibility,
  onTogglePassword,
  onSubmit,
  goTo,
  onSelectGender,
  genderError,
}) {
  const [isGenderOpen, setIsGenderOpen] = useState(false);

  return (
    <>
      <LogoImage />
      <div className="sh">Begin Your Journey</div>
      <p className="tx">Create your account and begin your journey</p>
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
      <button className="btn" onClick={onSubmit}>
        Create Account
      </button>
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

export function VerifyScreen({ onOpenEmailApp, goTo }) {
  return (
    <>
      <div className="ic">✉</div>
      <h3>Your journey cannot begin yet.</h3>
      <p>Verify your email to awaken your Aura.</p>
      <button className="btn" onClick={onOpenEmailApp}>
        Open Email App
      </button>
      <button className="btn out" onClick={() => goTo("verified")}>
        I've Verified
      </button>
    </>
  );
}

export function VerifiedScreen({ goTo }) {
  return (
    <>
      <div className="cc">✓</div>
      <h3>Aura Successfully Awakened.</h3>
      <p>Your journey begins now.</p>
      <button className="btn" onClick={() => goTo("login")}>
        Continue
      </button>
    </>
  );
}

export function ForgotScreen({ formData, onChange, onSubmit, goTo }) {
  return (
    <>
      <div className="sh-sm">Even the strongest warriors lose their way.</div>
      <p className="tx">Let's restore your path.</p>
      <FormInput
        id="fp-email"
        placeholder="Email"
        type="email"
        icon="mail"
        value={formData.fpEmail}
        onChange={onChange("fpEmail")}
      />
      <button className="btn" style={{ marginTop: "14px" }} onClick={onSubmit}>
        Send Reset Link
      </button>
      <div className="bt">
        <span className="lk" onClick={() => goTo("login")}>
          Back to Log In
        </span>
      </div>
    </>
  );
}

export function ResetSentScreen({ goTo }) {
  return (
    <>
      <div className="ic" style={{ fontSize: "20px" }}>
        ✈
      </div>
      <h3>A recovery message has been sent.</h3>
      <p>Your Aura awaits your return.</p>
      <button className="btn" onClick={() => goTo("login")}>
        Back to Log In
      </button>
    </>
  );
}

export function ResetScreen({
  formData,
  onChange,
  passwordVisibility,
  onTogglePassword,
  onSubmit,
}) {
  return (
    <>
      <div className="sh">Restore Your Strength.</div>
      <FormInput
        id="rs-pass"
        placeholder="New Password"
        type="password"
        eye
        icon="lock"
        value={formData.rsPassword}
        onChange={onChange("rsPassword")}
        showPassword={!!passwordVisibility["rs-pass"]}
        onToggle={() => onTogglePassword("rs-pass")}
      />
      <FormInput
        id="rs-cpass"
        placeholder="Confirm New Password"
        type="password"
        eye
        icon="lock"
        value={formData.rsConfirmPassword}
        onChange={onChange("rsConfirmPassword")}
        showPassword={!!passwordVisibility["rs-cpass"]}
        onToggle={() => onTogglePassword("rs-cpass")}
      />
      <div className="pwr">
        <div>◦ At least 8 characters</div>
        <div>◦ One uppercase letter</div>
        <div>◦ One number</div>
      </div>
      <button className="btn" style={{ marginTop: "16px" }} onClick={onSubmit}>
        Reset Password
      </button>
    </>
  );
}

export function ResetOkScreen({ goTo }) {
  return (
    <>
      <div className="cc">✓</div>
      <h3>Your strength has returned.</h3>
      <p>Welcome back, Warrior.</p>
      <button className="btn" onClick={() => goTo("login")}>
        Back to Log In
      </button>
    </>
  );
}
