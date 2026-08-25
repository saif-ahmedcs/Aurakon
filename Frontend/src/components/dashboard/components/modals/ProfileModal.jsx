"use client";

import { useState, useRef, useEffect } from "react";
import { RankEmblem } from "../RankEmblem";
import { LEVEL_ICON } from "../../../../constants/assets";
import {
  XpIcon,
  ShieldIcon,
  CloseIcon,
  QuillIcon,
  RuneConfirmIcon,
  RuneCancelIcon,
} from "../icons";

/* ------------------------------------------------------------------
 * Profile modal - shown when the user taps their avatar / "View
 * Profile". Username is editable in place (pencil/pin toggles an
 * input); level, title, total XP and shields are backend-provided
 * summary stats passed down from the app shell.
 * ------------------------------------------------------------------ */
export function ProfileModal({
  name,
  onSaveName,
  title,
  level,
  tier,
  totalXp,
  totalShields,
  onClose,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const nameChanged = draft.trim() && draft.trim() !== name;

  const commitName = () => {
    const trimmed = draft.trim();
    if (trimmed) onSaveName(trimmed);
    else setDraft(name);
    setEditing(false);
  };

  const cancelName = () => {
    setDraft(name);
    setEditing(false);
  };

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div
        className="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Your profile"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-dialog-head">
          <div className="detail-dialog-head-text">
            <span className="eyebrow">Profile</span>
            <h3 className="detail-dialog-title">Your Aura</h3>
          </div>
          <button
            type="button"
            className="icon-btn detail-close-btn"
            onClick={onClose}
            aria-label="Close profile"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="profile-dialog-hero">
          <span
            className="profile-dialog-avatar profile-dialog-avatar-emblem"
            aria-hidden="true"
          >
            <RankEmblem tier={tier} size={150} state="active" />
            <span className="profile-dialog-avatar-badge">{level}</span>
          </span>

          {editing ? (
            <div className="profile-dialog-name-edit">
              <input
                ref={inputRef}
                type="text"
                className="profile-dialog-name-input"
                value={draft}
                maxLength={24}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") cancelName();
                }}
              />
              <span className="profile-dialog-name-actions">
                <button
                  type="button"
                  className="rune-btn rune-btn-confirm"
                  onClick={commitName}
                  disabled={!nameChanged}
                  aria-label="Save username"
                  title="Save"
                >
                  <RuneConfirmIcon />
                </button>
                <button
                  type="button"
                  className="rune-btn rune-btn-cancel"
                  onClick={cancelName}
                  aria-label="Cancel editing username"
                  title="Cancel"
                >
                  <RuneCancelIcon />
                </button>
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="profile-dialog-name-row"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
            >
              <span className="profile-dialog-name">{name}</span>
              <span className="profile-dialog-pin" aria-label="Edit username">
                <QuillIcon size={14} />
              </span>
            </button>
          )}

          <span className="profile-dialog-title-badge">{title}</span>
        </div>

        <div className="detail-stat-row profile-dialog-stats">
          <div className="detail-stat profile-stat">
            <span className="profile-stat-glyph profile-stat-glyph-level">
              <img src={LEVEL_ICON} alt="" draggable="false" />
            </span>
            <span className="detail-stat-value">{level}</span>
            <span className="detail-stat-label">Level</span>
          </div>
          <div className="detail-stat profile-stat">
            <span className="profile-stat-glyph profile-stat-glyph-xp">
              <XpIcon size={52} />
            </span>
            <span className="detail-stat-value">
              {totalXp.toLocaleString()}
            </span>
            <span className="detail-stat-label">Total XP</span>
          </div>
          <div className="detail-stat profile-stat">
            <span className="profile-stat-glyph profile-stat-glyph-shield">
              <ShieldIcon size={56} />
            </span>
            <span className="detail-stat-value">{totalShields}</span>
            <span className="detail-stat-label">Shields</span>
          </div>
        </div>
      </div>
    </div>
  );
}
