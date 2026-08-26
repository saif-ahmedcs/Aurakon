"use client";

import { useState } from "react";
import { DifficultyRadioGroup } from "../habits/DifficultyRadioGroup";
import { CheckIcon, CloseIcon } from "../icons";

/* ---------------------------------------------------------------- */
/* Add habit - accept a new trial                                    */
/* ---------------------------------------------------------------- */

export function AddHabitModal({
  onClose,
  onCreate,
  habitLimit,
  currentHabitCount,
  atHabitLimit,
}) {
  const [name, setName] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [touched, setTouched] = useState(false);
  const autoFocusTitle = typeof window === "undefined" || window.innerWidth > 640;

  const trimmedName = name.trim();
  const isValid = trimmedName.length > 0;
  const canCreate = isValid && !atHabitLimit;

  const handleCreateClick = () => {
    if (!isValid) {
      setTouched(true);
      return;
    }
    if (atHabitLimit) return;
    onCreate({ name: trimmedName, difficulty });
  };

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div
        className="edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Add a new trial"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="review-dialog-head">
          <span className="review-dialog-progress">New Trial</span>
          <button
            type="button"
            className="icon-btn detail-close-btn"
            onClick={onClose}
            aria-label="Close new trial"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="add-habit-intro">
          Set the trial you want to commit to. You can always fine-tune it
          later.
        </p>

        <p className={`habit-limit-info ${atHabitLimit ? "at-limit" : ""}`}>
          {currentHabitCount} / {habitLimit} active trials
          {atHabitLimit && " — limit reached for your current level"}
        </p>

        <label className="edit-field">
          <span className="edit-field-label">Title</span>
          <input
            type="text"
            className={
              "edit-field-input" +
              (touched && !isValid ? " edit-field-input-error" : "")
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="e.g. Stretch for 10 minutes"
            maxLength={60}
            autoFocus={autoFocusTitle}
          />
          {touched && !isValid && (
            <span className="edit-field-error">
              Give this trial a name to continue.
            </span>
          )}
        </label>

        <div className="edit-field">
          <span className="edit-field-label">Difficulty</span>
          <DifficultyRadioGroup
            value={difficulty}
            onChange={setDifficulty}
          />
        </div>

        <div className="review-dialog-actions edit-dialog-actions">
          <button
            type="button"
            className={`btn btn-review btn-review-recover ${atHabitLimit ? "btn-disabled" : ""}`}
            onClick={handleCreateClick}
            disabled={atHabitLimit}
          >
            <CheckIcon />
            {atHabitLimit ? "Limit Reached" : "Accept Trial"}
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
