"use client";

import { useState, useCallback, useRef } from "react";
import { DIFFICULTY_OPTIONS } from "../constants/habits";
import { todayInZone } from "../utils/dates";
import {
  listHabitsRequest,
  listHabitLogsRequest,
  getHabitDetailRequest,
  createHabitRequest,
  updateHabitRequest,
  deleteHabitRequest,
  createHabitLogRequest,
  undoHabitLogRequest,
} from "../services/dashboardApi";

/* ------------------------------------------------------------------
 * Owns the habits collection, backed by the Aurakon backend.
 *
 * Backend habit rows are mapped into the UI model the dashboard
 * renders (name/xp/streaks/history/pendingReviewDates ...). The
 * authoritative progression values - per-habit streaks, pending
 * review groups, XP - always come from the server; local state is
 * optimistic for snappiness and re-synced from GET /api/habits/:id
 * after every mutation.
 * ------------------------------------------------------------------ */

/* Display-only mirror of the backend award table
 * (docs/03-progression-and-rewards.md): easy = 10, medium = 15,
 * hard = 25. The backend awards and reverses XP itself; this value is
 * never accumulated anywhere in the frontend. */
const XP_BY_DIFFICULTY = Object.fromEntries(
  DIFFICULTY_OPTIONS.map((d) => [d.value, d.xp]),
);

/* Backend stores UTC timestamps; day boundaries follow the user's
 * stored time zone (backend engineering standard #3). */
function isoDateInZone(isoTimestamp, timeZone) {
  const date = new Date(isoTimestamp);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return null;
  }
}

/* Log statuses -> the three resolved colours the calendar knows.
 * "pending_review" days are surfaced separately via pendingReviewDates. */
function mapLogStatus(status) {
  if (status === "completed" || status === "recovered") return "done";
  if (status === "shielded") return "shielded";
  if (status === "missed") return "missed";
  return null;
}

function buildHabitState(dto, logs, timeZone, existing) {
  const history = {};
  const rawHistory = {};
  let count = 0;

  for (const log of logs || []) {
    const mapped = mapLogStatus(log.status);
    if (!mapped) continue;
    history[log.date] = mapped;
    // Keep the untouched backend status: undo eligibility depends on
    // it (only plain completed logs can be undone, not recovered ones).
    rawHistory[log.date] = log.status;
    count += 1;
  }

  const pendingReviewDates = [
    ...(dto.pendingReview ? dto.pendingReview.missedDates : []),
  ].sort();

  const today = todayInZone(timeZone);
  const completedToday = history[today] === "done";
  const missedToday =
    !completedToday && pendingReviewDates.includes(today);

  return {
    ...(existing || {}),
    id: dto.id,
    name: dto.title,
    difficulty: dto.difficulty,
    xp: XP_BY_DIFFICULTY[dto.difficulty] ?? 0,
    // Backend-computed streak state (authoritative).
    currentStreak: dto.currentStreak ?? 0,
    longestStreak: dto.longestStreak ?? 0,
    count,
    completedToday,
    missed: missedToday,
    createdAt: existing ? existing.createdAt : isoDateInZone(dto.createdAt, timeZone),
    history,
    rawHistory,
    pendingReviewDates,
  };
}

function mapHabit(dto, logs, timeZone) {
  return buildHabitState(dto, logs, timeZone);
}

export function useHabits({ showToast }) {
  const [habits, setHabits] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const toggleInFlight = useRef(false);
  const refreshSeq = useRef({});

  const replaceHabit = useCallback((next) => {
    setHabits((prev) => prev.map((h) => (h.id === next.id ? next : h)));
  }, []);

  /* Initial load: habits plus each habit's log history (needed for the
   * completed-today flags, calendars and all-time counters). */
  const load = useCallback(
    async (timeZone) => {
      const dtos = await listHabitsRequest();
      const withLogs = await Promise.all(
        dtos.map(async (dto) => {
          try {
            return mapHabit(dto, await listHabitLogsRequest(dto.id), timeZone);
          } catch {
            // A failing log lookup shouldn't blank the whole panel.
            return mapHabit(dto, [], timeZone);
          }
        }),
      );
      setHabits(withLogs);
      setLoaded(true);
    },
    [],
  );

  /* Re-sync one habit from the backend after a mutation. Streaks and
   * pending reviews are computed server-side (with bridging rules the
   * frontend must never reproduce), so the optimistic flip is followed
   * by an authoritative refresh. Failures are silent: the optimistic
   * state stays until the next sync. */
  const refreshHabit = useCallback(async (habitId, timeZone) => {
    const seq = ++refreshSeq.current[habitId];
    try {
      const dto = await getHabitDetailRequest(habitId);
      const logs = await listHabitLogsRequest(habitId);
      if (seq !== refreshSeq.current[habitId]) return;
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? buildHabitState(dto, logs, timeZone, h) : h,
        ),
      );
    } catch {
      // Keep the optimistic state; the next full load reconciles.
    }
  }, []);

  /* Flip completedToday: checking in posts today's log (or recovers a
   * pending day), un-checking deletes it. Optimistic flip, reverted on
   * failure. Returns true when the server accepted the change. */
  const toggleHabitCompletion = useCallback(
    async (id, timeZone) => {
      if (toggleInFlight.current) return false;
      toggleInFlight.current = true;

      const snapshot = habits.find((h) => h.id === id);
      if (!snapshot) {
        toggleInFlight.current = false;
        return false;
      }

      const nowDone = !snapshot.completedToday;
      const today = todayInZone(timeZone);

      // Optimistic local transition (mirrors the pure reducer).
      setHabits((prev) =>
        prev.map((h) => {
          if (h.id !== id) return h;
          const nextCount = Math.max(0, h.count + (nowDone ? 1 : -1));
          const history = { ...h.history };
          const rawHistory = { ...h.rawHistory };
          // Checking in may also recover a pending-review day for
          // today - the server resolves it, so mirror that locally.
          const nextPending = nowDone
            ? (h.pendingReviewDates || []).filter((d) => d !== today)
            : h.pendingReviewDates;
          if (nowDone) {
            history[today] = "done";
            rawHistory[today] = "completed";
          } else {
            delete history[today];
            delete rawHistory[today];
          }
          return {
            ...h,
            completedToday: nowDone,
            count: nextCount,
            missed: nowDone ? false : h.missed,
            history,
            rawHistory,
            pendingReviewDates: nextPending,
          };
        }),
      );

      try {
        let shieldEarned = false;
        let consistencyBonuses = [];
        if (nowDone) {
          const response = await createHabitLogRequest(id, today);
          shieldEarned = response?.shieldEarned;
          consistencyBonuses = response?.consistencyBonuses || [];
          if (shieldEarned) {
            showToast("🛡️ Guardian Shield earned!");
          }
        } else {
          await undoHabitLogRequest(id, today);
        }
        // Server-side streaks/pending/XP changed - pull the truth back.
        refreshHabit(id, timeZone);
        return { success: true, consistencyBonuses };
      } catch (err) {
        if (err?.status === 409) {
          refreshHabit(id, timeZone);
        } else {
          replaceHabit(snapshot);
        }
        showToast(err.error || "Could not update the trial. Try again.");
        return { success: false };
      } finally {
        toggleInFlight.current = false;
      }
    },
    [habits, replaceHabit, showToast, refreshHabit],
  );

  /* Undo a check-in from the habit detail calendar. The backend only
   * allows undoing today's completed log; anything else surfaces its
   * server message. Locally the day becomes unlogged again (the server
   * deletes the log entirely), then the habit re-syncs so its
   * server-computed streak stays accurate. */
  const undoCheckIn = useCallback(
    async (habitId, dateStr, timeZone) => {
      try {
        await undoHabitLogRequest(habitId, dateStr);
        setHabits((prev) =>
          prev.map((h) => {
            if (h.id !== habitId) return h;
            const history = { ...h.history };
            const rawHistory = { ...h.rawHistory };
            delete history[dateStr];
            delete rawHistory[dateStr];
            return {
              ...h,
              completedToday:
                dateStr === todayInZone(timeZone) ? false : h.completedToday,
              count: Math.max(0, h.count - 1),
              history,
              rawHistory,
            };
          }),
        );
        refreshHabit(habitId, timeZone);
        return true;
      } catch (err) {
        showToast(err.error || "Could not undo this check-in.");
        return false;
      }
    },
    [showToast, refreshHabit],
  );

  const deleteHabit = useCallback(
    async (id) => {
      await deleteHabitRequest(id);
      setHabits((prev) => prev.filter((h) => h.id !== id));
      return true;
    },
    [],
  );

  /* The backend only persists renames; difficulty is fixed at creation. */
  const updateHabit = useCallback(
    async (id, updates) => {
      const dto = await updateHabitRequest(id, { title: updates.name });
      const existing = habits.find((h) => h.id === id);
      const next = {
        ...(existing || {}),
        name: dto.title,
      };
      replaceHabit(next);
      return next;
    },
    [habits, replaceHabit],
  );

  const addHabit = useCallback(
    async ({ name, difficulty }) => {
      const dto = await createHabitRequest({ title: name, difficulty });
      const created = mapHabit(dto, [], undefined);
      setHabits((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  /* Resolve a pending-review day once the server accepted the review
   * decision: drop it from pendingReviewDates and write the outcome
   * into history ("done" | "missed" | "shielded"). */
  const resolveHabitDate = useCallback((habitId, date, status) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== habitId) return h;
        const nextPending = (h.pendingReviewDates || []).filter(
          (d) => d !== date,
        );
        const nextHistory = { ...h.history, [date]: status };
        const nextRaw = {
          ...h.rawHistory,
          [date]:
            status === "done"
              ? "recovered"
              : status === "shielded"
                ? "shielded"
                : "missed",
        };
        return {
          ...h,
          pendingReviewDates: nextPending,
          history: nextHistory,
          rawHistory: nextRaw,
        };
      }),
    );
  }, []);

  return {
    habits,
    loaded,
    load,
    toggleHabitCompletion,
    deleteHabit,
    updateHabit,
    addHabit,
    undoCheckIn,
    resolveHabitDate,
    refreshHabit,
  };
}
