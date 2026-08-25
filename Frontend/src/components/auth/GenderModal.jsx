"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function GenderIcon({ type }) {
  if (type === "male") {
    return (
      <svg className="gic" viewBox="0 0 20 20" fill="none">
        <circle
          cx="8.2"
          cy="11.8"
          r="5.1"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path
          d="M11.9 8.1 16.5 3.5M16.5 3.5h-4M16.5 3.5v4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg className="gic" viewBox="0 0 20 20" fill="none">
      <circle
        cx="10"
        cy="7.3"
        r="5.1"
        stroke="currentColor"
        strokeWidth="1.3"
      />
      <path
        d="M10 12.4V18M7.2 15.6h5.6"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function GenderModal({ isOpen, value, onSelect, onClose }) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="gmodal-ov" onClick={onClose}>
      <div
        className="gmodal-box"
        role="dialog"
        aria-modal="true"
        aria-label="Choose your warrior's gender"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="gmodal-x"
          aria-label="Close"
          onClick={onClose}
        >
          ✕
        </button>

        <div className="gw-lbl">
          Choose Your Warrior's Gender<span className="req">*</span>
        </div>
        <p className="gw-sub">
          Your choice will shape the warrior who carries your legacy.
        </p>

        <div
          className="gopts"
          role="radiogroup"
          aria-label="Warrior gender"
          aria-required="true"
        >
          <button
            type="button"
            role="radio"
            aria-checked={value === "male"}
            className={`gopt${value === "male" ? " active" : ""}`}
            onClick={() => onSelect("male")}
          >
            <GenderIcon type="male" />
            <span>Male</span>
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={value === "female"}
            className={`gopt${value === "female" ? " active" : ""}`}
            onClick={() => onSelect("female")}
          >
            <GenderIcon type="female" />
            <span>Female</span>
          </button>
        </div>

        <button
          type="button"
          className="btn"
          style={{ marginTop: "18px" }}
          onClick={onClose}
          disabled={!value}
        >
          Confirm Selection
        </button>
      </div>
    </div>,
    document.body,
  );
}
