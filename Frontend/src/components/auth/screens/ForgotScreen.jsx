"use client";

import FormInput from "../../common/FormInput";

export function ForgotScreen({
  formData,
  onChange,
  onSubmit,
  goTo,
  loading,
  error,
}) {
  return (
    <>
      <div className="sh-sm">Even the strongest warriors lose their way.</div>
      <p className="tx">Let's restore your path. Enter your email to receive a recovery link.</p>
      
      <form onSubmit={onSubmit} noValidate>
        <FormInput
          id="fp-email"
          placeholder="Email"
          type="email"
          icon="mail"
          value={formData.fpEmail}
          onChange={onChange("fpEmail")}
        />

        {error && <div className="login-err">{error}</div>}

        <button
          className="btn"
          style={{ marginTop: "14px" }}
          type="submit"
          disabled={loading}
        >
          {loading ? "Sending Reset Link…" : "Send Reset Link"}
        </button>
      </form>

      <div className="bt">
        <span className="lk" onClick={() => goTo("login")}>
          Back to Log In
        </span>
      </div>
    </>
  );
}
