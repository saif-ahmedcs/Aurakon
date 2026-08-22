"use client";

import FormInput from "../../common/FormInput";

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
