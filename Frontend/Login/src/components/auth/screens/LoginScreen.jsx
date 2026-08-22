"use client";

import LogoImage from "../../common/LogoImage";
import FormInput from "../../common/FormInput";

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
