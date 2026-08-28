"use client";

import { useMemo, useState } from "react";
import {
  DIFFICULTY_LABEL,
  LEGEND_ITEMS,
  DAY_STATUS_COPY,
} from "../../../../constants/habits";
import { WEEKDAY_LABELS, MONTH_LABELS } from "../../../../constants/calendar";
import {
  buildMonthWeeks,
  dateKey,
  todayInZone,
  yearMonthInZone,
} from "../../../../utils/dates";
import {
  XpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CalendarGlyphIcon,
  PendingIcon,
} from "../icons";

/* ---------------------------------------------------------------- */
/* Habit detail - calendar + legend                                  */
/*                                                                    */
/* Left column explains what each colour on the calendar means so    */
/* the grid never has to be decoded from memory. Right column is the */
/* month itself: a filled ring is a resolved day, a dashed amber ring */
/* is a day still waiting on the user via the review session.        */
/* ---------------------------------------------------------------- */

function HabitDetailCalendar({
  habit,
  monthCursor,
  timeZone,
  onPrevMonth,
  onNextMonth,
  onSelectPending,
  onSelectDay,
  selectedDate,
}) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const weeks = useMemo(() => buildMonthWeeks(year, month), [year, month]);

  const todayKey = todayInZone(timeZone);
  const { year: todayYear, month: todayMonth } = yearMonthInZone(timeZone);
  const isCurrentMonth = year === todayYear && month === todayMonth;
  const pendingSet = useMemo(
    () => new Set(habit.pendingReviewDates || []),
    [habit.pendingReviewDates],
  );

  const created = habit.createdAt
    ? new Date(habit.createdAt + "T00:00:00")
    : null;
  const isCreationMonth =
    created && year === created.getFullYear() && month === created.getMonth();

  return (
    <div className="detail-calendar">
      <div className="detail-calendar-nav">
        <button
          type="button"
          className="icon-btn detail-cal-nav-btn"
          onClick={onPrevMonth}
          disabled={isCreationMonth}
          aria-label="Previous month"
        >
          <ChevronLeftIcon />
        </button>
        <span className="detail-calendar-month">
          {MONTH_LABELS[month]} {year}
        </span>
        <button
          type="button"
          className="icon-btn detail-cal-nav-btn"
          onClick={onNextMonth}
          disabled={isCurrentMonth}
          aria-label="Next month"
        >
          <ChevronRightIcon />
        </button>
      </div>

      <div className="detail-calendar-weekdays">
        {WEEKDAY_LABELS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="detail-calendar-grid">
        {weeks.map((week, wi) =>
          week.map((day, di) => {
            if (day === null)
              return (
                <span
                  key={wi + "-" + di}
                  className="detail-day detail-day-empty"
                />
              );
            const key = dateKey(year, month, day);
            const status = habit.history ? habit.history[key] : undefined;
            const isPending = pendingSet.has(key);
            const isFuture = key > todayKey;
            const isBeforeCreation =
              created &&
              new Date(year, month, day) <
                new Date(
                  created.getFullYear(),
                  created.getMonth(),
                  created.getDate(),
                );
            const isToday = key === todayKey;
            const isSelected = key === selectedDate;

            let cls = "detail-day";
            if (isFuture || isBeforeCreation) cls += " detail-day-future";
            else if (isPending) cls += " detail-day-pending";
            else if (status === "done") cls += " detail-day-done";
            else if (status === "shielded") cls += " detail-day-shielded";
            else if (status === "missed") cls += " detail-day-missed";
            else cls += " detail-day-neutral";
            if (isToday) cls += " detail-day-today";
            if (isSelected) cls += " detail-day-selected";

            const label =
              (isPending && "Awaiting review") ||
              (status === "done" && "Checked in") ||
              (status === "shielded" && "Shielded") ||
              (status === "missed" && "Missed") ||
              "No data";

            if (isPending) {
              return (
                <button
                  key={key}
                  type="button"
                  className={cls}
                  onClick={() => onSelectPending(key)}
                  aria-label={
                    MONTH_LABELS[month] +
                    " " +
                    day +
                    " - " +
                    label +
                    " - tap to review"
                  }
                  title={label + " · tap to review"}
                >
                  <span className="detail-day-num">{day}</span>
                </button>
              );
            }

            const isClickable =
              !isFuture &&
              !isBeforeCreation &&
              (status === "done" ||
                status === "shielded" ||
                status === "missed");

            return isClickable ? (
              <button
                key={key}
                type="button"
                className={cls}
                onClick={() => onSelectDay(key, status)}
                aria-label={
                  MONTH_LABELS[month] +
                  " " +
                  day +
                  " - " +
                  label +
                  " - tap for details"
                }
                title={label}
              >
                <span className="detail-day-num">{day}</span>
              </button>
            ) : (
              <span
                key={key}
                className={cls}
                aria-label={MONTH_LABELS[month] + " " + day + " - " + label}
                title={label}
              >
                <span className="detail-day-num">{day}</span>
              </span>
            );
          }),
        )}
      </div>
    </div>
  );
}

function DayDetailPanel({
  dateKeyStr,
  status,
  canUndo,
  onUndoCheckIn,
  onClose,
}) {
  const [confirmingUndo, setConfirmingUndo] = useState(false);
  const d = new Date(dateKeyStr + "T00:00:00");
  const prettyDate = d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const copy = DAY_STATUS_COPY[status];

  return (
    <div className="day-detail-panel" role="region" aria-label="Day details">
      <div className="day-detail-panel-head">
        <span className="day-detail-date">{prettyDate}</span>
        <button
          type="button"
          className="icon-btn detail-close-btn"
          onClick={onClose}
          aria-label="Close day details"
        >
          <CloseIcon />
        </button>
      </div>

      <p className={"gem-text " + copy.gemClass}>{copy.heading}</p>
      <p className="day-detail-body">{copy.body}</p>

      {/* The backend only undoes plain completed logs - recovered days
          keep their recovery reward and shielded days keep the spent
          shield, so no undo is offered for those. */}
      {canUndo && !confirmingUndo && (
        <button
          type="button"
          className="btn btn-ghost day-detail-action"
          onClick={() => setConfirmingUndo(true)}
        >
          Undo check-in
        </button>
      )}

      {canUndo && confirmingUndo && (
        <div className="day-detail-confirm">
          <p className="day-detail-confirm-text">
            Undo this check-in? The XP awarded for this day will be reversed.
          </p>
          <div className="day-detail-confirm-actions">
            <button
              type="button"
              className="btn btn-review btn-review-miss"
              onClick={() => {
                onUndoCheckIn(dateKeyStr);
                setConfirmingUndo(false);
              }}
            >
              Yes, undo it
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmingUndo(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function HabitDetailModal({
  habit,
  onClose,
  onReviewDay,
  onReviewAll,
  onUndoCheckIn,
  timeZone,
}) {
  const { year: initYear, month: initMonth } = yearMonthInZone(timeZone);
  const [monthCursor, setMonthCursor] = useState(
    new Date(initYear, initMonth, 1),
  );
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);

  const todayKey = todayInZone(timeZone);

  const stats = useMemo(() => {
    const values = Object.values(habit.history || {});
    const done = values.filter((v) => v === "done").length;
    const shielded = values.filter((v) => v === "shielded").length;
    const missed = values.filter((v) => v === "missed").length;
    const tracked = done + shielded + missed;
    const rate =
      tracked > 0 ? Math.round(((done + shielded) / tracked) * 100) : 0;
    return { done, shielded, missed, rate };
  }, [habit.history]);

  const pendingCount = (habit.pendingReviewDates || []).length;

  return (
    <div className="overlay overlay-center" onClick={onClose}>
      <div
        className="detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={habit.name + " details"}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-dialog-head">
          <div className="detail-dialog-head-text">
            <span className={"habit-diff diff-text-" + habit.difficulty}>
              {DIFFICULTY_LABEL[habit.difficulty]} · +{habit.xp}{" "}
              <XpIcon size={11} />
              XP
            </span>
            <h3 className="detail-dialog-title">{habit.name}</h3>
          </div>
          <button
            type="button"
            className="icon-btn detail-close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            <CloseIcon />
          </button>
        </div>

        {pendingCount > 0 && (
          <button
            type="button"
            className="detail-pending-callout"
            onClick={() => onReviewAll(habit.id)}
          >
            <PendingIcon size={13} />
            <span>
              {pendingCount} day{pendingCount > 1 ? "s" : ""} awaiting your
              review
            </span>
            <span className="detail-pending-callout-cta">Review now →</span>
          </button>
        )}

        <div className="detail-dialog-body">
          <aside
            className="detail-legend"
            aria-label="What the calendar colours mean"
          >
            <div className="detail-stat-row">
              <div className="detail-stat">
                <span className="detail-stat-value">{stats.rate}%</span>
                <span className="detail-stat-label">Completion</span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-value">{habit.count}</span>
                <span className="detail-stat-label">All-time Check-ins</span>
              </div>
            </div>

            {/* Streaks are computed by the backend per habit. */}
            <div className="detail-stat-row detail-streak-row">
              <div className="detail-stat">
                <span className="detail-stat-value">
                  {habit.currentStreak || 0}
                  <span className="detail-stat-value-sub"> days</span>
                </span>
                <span className="detail-stat-label">Current Streak</span>
              </div>
              <div className="detail-stat">
                <span className="detail-stat-value">
                  {habit.longestStreak || 0}
                  <span className="detail-stat-value-sub"> days</span>
                </span>
                <span className="detail-stat-label">Longest Streak</span>
              </div>
            </div>

            <h4 className="detail-legend-heading">
              <CalendarGlyphIcon /> Calendar Key
            </h4>
            <ul className="detail-legend-list">
              {LEGEND_ITEMS.map((item) => (
                <li key={item.cls} className="detail-legend-item">
                  <span
                    className={"legend-dot " + item.cls}
                    aria-hidden="true"
                  />
                  <span className="detail-legend-text">
                    <span className="detail-legend-label">{item.label}</span>
                    <span className="detail-legend-copy">{item.copy}</span>
                  </span>
                </li>
              ))}
            </ul>
          </aside>

          <div className="detail-calendar-column">
            <HabitDetailCalendar
              habit={habit}
              monthCursor={monthCursor}
              timeZone={timeZone}
              onPrevMonth={() =>
                setMonthCursor(
                  (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                )
              }
              onNextMonth={() =>
                setMonthCursor(
                  (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                )
              }
              onSelectPending={(dateStr) => onReviewDay(habit.id, dateStr)}
              onSelectDay={(dateStr, status) => {
                setSelectedDate(dateStr);
                setSelectedStatus(status);
              }}
              selectedDate={selectedDate}
            />

            {selectedDate && (
              <DayDetailPanel
                dateKeyStr={selectedDate}
                status={selectedStatus}
                canUndo={
                  selectedDate === todayKey &&
                  (habit.rawHistory
                    ? habit.rawHistory[selectedDate] === "completed"
                    : selectedStatus === "done")
                }
                onUndoCheckIn={(dateStr) => {
                  onUndoCheckIn(habit.id, dateStr);
                  // The day is now unlogged - close its detail panel.
                  setSelectedDate(null);
                  setSelectedStatus(null);
                }}
                onClose={() => {
                  setSelectedDate(null);
                  setSelectedStatus(null);
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
