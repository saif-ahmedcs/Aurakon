"use client";

import {
  CheckIcon,
  HourglassIcon,
  PendingIcon,
  DotsIcon,
  XpIcon,
  CurrentStreakIcon,
} from "./icons";
import { DIFFICULTY_LABEL } from "../../../constants/habits";

/* ---------------------------------------------------------------- */
/* Habit row                                                         */
/* ---------------------------------------------------------------- */

export function HabitRow({
  habit,
  isMenuOpen,
  onToggleMenu,
  onToggleComplete,
  onAction,
  onOpenDetail,
}) {
  const missed = !!habit.missed && !habit.completedToday;
  const pendingCount = (habit.pendingReviewDates || []).length;

  return (
    <li
      className={
        "habit-row diff-edge-" +
        habit.difficulty +
        (habit.completedToday ? " habit-row-done" : "") +
        (missed ? " habit-row-missed" : "") +
        (isMenuOpen ? " habit-row-menu-open" : "")
      }
    >
      <button
        type="button"
        className={
          "habit-check diff-" +
          habit.difficulty +
          (habit.completedToday ? " habit-check-on" : "") +
          (missed ? " habit-check-missed" : "")
        }
        onClick={() => onToggleComplete(habit.id)}
        aria-pressed={habit.completedToday}
        aria-label={
          missed
            ? habit.name + " - trial missed today"
            : habit.completedToday
              ? "Mark " + habit.name + " as not done today"
              : "Mark " + habit.name + " done today"
        }
      >
        {habit.completedToday ? (
          <CheckIcon />
        ) : missed ? (
          <HourglassIcon />
        ) : null}
      </button>

      <div className="habit-main">
        <div className="habit-top">
          <span className="habit-name">
            {habit.name}
            {pendingCount > 0 && (
              <button
                type="button"
                className="habit-pending-badge"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail(habit.id, { review: true });
                }}
                aria-label={
                  pendingCount +
                  " day" +
                  (pendingCount > 1 ? "s" : "") +
                  " awaiting review for " +
                  habit.name
                }
                title={
                  pendingCount +
                  " day" +
                  (pendingCount > 1 ? "s" : "") +
                  " awaiting review"
                }
              >
                <PendingIcon size={11} />
                <span>{pendingCount}</span>
              </button>
            )}
          </span>
          {missed ? (
            <span className="habit-missed-tag">Trial Missed</span>
          ) : (
            <span className="habit-top-meta">
              {/* Backend-computed per-habit streak (GET /api/habits). */}
              <span
                className={"habit-streak" + (habit.currentStreak > 0 ? " habit-streak-live" : "")}
                title={
                  "Current streak: " +
                  (habit.currentStreak || 0) +
                  " day" +
                  ((habit.currentStreak || 0) === 1 ? "" : "s")
                }
              >
                <CurrentStreakIcon />
                {habit.currentStreak || 0}
              </span>
              <span className={"habit-diff diff-text-" + habit.difficulty}>
                {DIFFICULTY_LABEL[habit.difficulty]} · +{habit.xp}{" "}
                <XpIcon size={11} />
                XP
              </span>
            </span>
          )}
        </div>
      </div>

      <div className="habit-menu-wrap">
        <button
          type="button"
          className="icon-btn habit-menu-btn"
          onClick={() => onToggleMenu(habit.id)}
          aria-label={"Options for " + habit.name}
          aria-expanded={isMenuOpen}
        >
          <DotsIcon />
        </button>
        {isMenuOpen && (
          <div className="dropdown habit-dropdown" role="menu">
            <button
              role="menuitem"
              onClick={() => {
                onToggleMenu(habit.id);
                onOpenDetail(habit.id);
              }}
            >
              View Details
            </button>
            <button role="menuitem" onClick={() => onAction(habit.id, "edit")}>
              Edit Habit
            </button>
            <button
              role="menuitem"
              className="dropdown-danger"
              onClick={() => onAction(habit.id, "delete")}
            >
              Delete Habit
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
