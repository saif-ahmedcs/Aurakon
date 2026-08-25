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
  loading,
  error,
  needsVerification,
  onResendVerification,
}) {
  return (
    <>
      <LogoImage />
      <div className="sh">Continue Your Journey</div>
      <p className="tx">Continue building your legacy.</p>
      <form onSubmit={onSubmit} noValidate>
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

        {error && (
          <div className="login-err">
            <div>{error}</div>
            {needsVerification && (
              <div style={{ marginTop: "6px" }}>
                <span
                  className="lk"
                  style={{ textDecoration: "underline", fontWeight: 600 }}
                  onClick={() => {
                    if (onResendVerification) {
                      onResendVerification(formData.loginEmail);
                    }
                    goTo("verify");
                  }}
                >
                  Resend verification email &rarr;
                </span>
              </div>
            )}
          </div>
        )}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? "Logging in…" : "Log In"}
        </button>
      </form>
      <div className="bt">
        Don't have an account?{" "}
        <span className="lk" onClick={() => goTo("signup")}>
          Sign Up
        </span>
      </div>
    </>
  );
}
