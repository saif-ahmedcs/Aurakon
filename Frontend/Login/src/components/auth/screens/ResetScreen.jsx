"use client";

import FormInput from "../../common/FormInput";

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
