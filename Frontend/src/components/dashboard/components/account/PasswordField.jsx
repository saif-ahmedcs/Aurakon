"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "../icons";

/* Small controlled password field with a show/hide toggle - shared by
 * the change-password form and the reset-password page. */
export function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  error,
  autoComplete,
}) {
  const [reveal, setReveal] = useState(false);
  const [locked, setLocked] = useState(true);
  return (
    <label className="edit-field">
      <span className="edit-field-label">{label}</span>
      <div className="account-password-input-wrap">
        <input
          type={reveal ? "text" : "password"}
          className={
            "edit-field-input" + (error ? " edit-field-input-error" : "")
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setLocked(false)}
          readOnly={locked}
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="account-password-toggle"
          onClick={() => setReveal((r) => !r)}
          aria-label={reveal ? "Hide password" : "Show password"}
        >
          {reveal ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <span className="edit-field-error">{error}</span>}
    </label>
  );
}
