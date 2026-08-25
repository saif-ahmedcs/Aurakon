"use client";

import FormInput from "../../common/FormInput";

export function ResetScreen({
  formData,
  onChange,
  passwordVisibility,
  onTogglePassword,
  onSubmit,
  loading,
  error,
  goTo,
}) {
  const pass = formData.rsPassword || "";
  const cpass = formData.rsConfirmPassword || "";

  const hasLength = pass.length >= 8 && pass.length <= 72;
  const hasLetterAndNumber = /[A-Za-z]/.test(pass) && /[0-9]/.test(pass);
  const matches = pass.length > 0 && pass === cpass;

  return (
    <>
      <div className="sh">Restore Your Strength</div>
      <p className="tx">Choose a secure new password for your Aurakon account.</p>

      <form onSubmit={onSubmit} noValidate>
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

        <div className="pwr-checklist">
          <div className={`pwr-rule ${hasLength ? "valid" : ""}`}>
            <span className="pwr-bullet">{hasLength ? "✓" : "◦"}</span>
            <span>At least 8 characters</span>
          </div>
          <div className={`pwr-rule ${hasLetterAndNumber ? "valid" : ""}`}>
            <span className="pwr-bullet">{hasLetterAndNumber ? "✓" : "◦"}</span>
            <span>Contains letters and numbers</span>
          </div>
          <div className={`pwr-rule ${matches ? "valid" : ""}`}>
            <span className="pwr-bullet">{matches ? "✓" : "◦"}</span>
            <span>Passwords match</span>
          </div>
        </div>

        {error && <div className="login-err" style={{ marginTop: "12px" }}>{error}</div>}

        <button
          className="btn"
          style={{ marginTop: "16px" }}
          type="submit"
          disabled={loading}
        >
          {loading ? "Restoring Strength…" : "Reset Password"}
        </button>
      </form>

      {goTo && (
        <div className="bt">
          <span className="lk" onClick={() => goTo("login")}>
            Back to Log In
          </span>
        </div>
      )}
    </>
  );
}
