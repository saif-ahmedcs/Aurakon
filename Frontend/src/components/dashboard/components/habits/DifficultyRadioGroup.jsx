"use client";

import { DIFFICULTY_OPTIONS } from "../../../../constants/habits";
import { XpIcon } from "../icons";

/* Difficulty radio group shared by the Edit Habit and Add Habit
 * dialogs - same radiogroup markup, XP hint per option. */
export function DifficultyRadioGroup({ value, onChange }) {
  return (
    <div className="edit-diff-options" role="radiogroup" aria-label="Difficulty">
      {DIFFICULTY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={
            "edit-diff-option diff-edge-" +
            opt.value +
            (value === opt.value ? " edit-diff-option-active" : "")
          }
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
          <span className="edit-diff-xp">
            +{opt.xp} <XpIcon size={10} />
            XP
          </span>
        </button>
      ))}
    </div>
  );
}
