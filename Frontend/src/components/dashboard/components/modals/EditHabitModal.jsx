"use client";

import { useState } from "react";
import { DIFFICULTY_LABEL } from "../../../../constants/habits";
import { CheckIcon, CloseIcon, XpIcon } from "../icons";

/* ---------------------------------------------------------------- */
/* Edit habit - rename only                                          */
/*                                                                    */
/* The backend's PATCH /api/habits/:id accepts just the title;        */
/* difficulty is fixed at creation (it anchors XP, aura energy and    */
/* shield eligibility), so this dialog shows it as read-only.         */
/* ---------------------------------------------------------------- */

export function EditHabitModal({ habit, onClose, onSave }) {
  const [name, setName] = useState(habit.name);
  const [confirming, setConfirming] = useState(false);
  const autoFocusTitle = typeof window === "undefined" || window.innerWidth > 640;

  const trimmedName = name.trim();
  const hasChanges = trimmedName !== habit.name;

  const handleSaveClick = () => {
    if (!trimmedName) return;
    if (!hasChanges) {
      onClose();
      return;
    }
    setConfirming(true);
  };

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div
        className="edit-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={"Edit " + habit.name}
        onClick={(e) => e.stopPropagation()}
      >
        {!confirming ? (
          <>
            <div className="review-dialog-head">
              <span className="review-dialog-progress">Edit Habit</span>
              <button
                type="button"
                className="icon-btn detail-close-btn"
                onClick={onClose}
                aria-label="Close edit habit"
              >
                <CloseIcon />
              </button>
            </div>

            <label className="edit-field">
              <span className="edit-field-label">Title</span>
              <input
                type="text"
                className="edit-field-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                autoFocus={autoFocusTitle}
              />
            </label>

            <div className="edit-field">
              <span className="edit-field-label">
                Difficulty{" "}
                <span className="edit-field-hint">
                  (fixed when the trial was accepted)
                </span>
              </span>
              <span className={"edit-diff-fixed diff-text-" + habit.difficulty}>
                {DIFFICULTY_LABEL[habit.difficulty]} · +{habit.xp}{" "}
                <XpIcon size={10} />
                XP
              </span>
            </div>

            <div className="review-dialog-actions edit-dialog-actions">
              <button
                type="button"
                className="btn btn-review btn-review-recover"
                disabled={!trimmedName}
                onClick={handleSaveClick}
              >
                <CheckIcon />
                Save Changes
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="review-dialog-eyebrow">Confirm</p>
            <h3 className="review-dialog-title">Save these changes?</h3>
            <ul className="edit-confirm-summary">
              <li>
                Title: <strong>{habit.name}</strong> →{" "}
                <strong>{trimmedName}</strong>
              </li>
            </ul>
            <div className="review-dialog-actions">
              <button
                type="button"
                className="btn btn-review btn-review-recover"
                onClick={() => onSave(habit.id, { name: trimmedName })}
              >
                <CheckIcon />
                Yes, save it
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirming(false)}
              >
                Go back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
