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

function isPresentStatus(status) {
  return (
    status === "completed" || status === "recovered" || status === "shielded"
  );
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
    if (isPresentStatus(log.status)) count += 1;
  }

  const pendingReviewDates = [
    ...(dto.pendingReview ? dto.pendingReview.missedDates : []),
  ].sort();

  const today = todayInZone(timeZone);
  const completedToday = history[today] === "done";
  const missedToday = !completedToday && pendingReviewDates.includes(today);

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
    createdAt: existing
      ? existing.createdAt
      : isoDateInZone(dto.createdAt, timeZone),
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
  const toggleInFlight = useRef(new Set());
  const refreshSeq = useRef({});
  const pendingMutations = useRef(new Set());

  const mutationEpoch = useRef(0);

  const trackMutation = useCallback((promise) => {
    pendingMutations.current.add(promise);
    promise.finally(() => {
      pendingMutations.current.delete(promise);
      mutationEpoch.current += 1;
    });
    return promise;
  }, []);

  const replaceHabit = useCallback((next) => {
    setHabits((prev) => prev.map((h) => (h.id === next.id ? next : h)));
  }, []);

  const load = useCallback(async (timeZone) => {
    let withLogs;
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const epochAtStart = mutationEpoch.current;
      const inFlightAtStart = Array.from(pendingMutations.current);

      const dtos = await listHabitsRequest();
      withLogs = await Promise.all(
        dtos.map(async (dto) => {
          try {
            return mapHabit(dto, await listHabitLogsRequest(dto.id), timeZone);
          } catch {
            // A failing log lookup shouldn't blank the whole panel.
            return mapHabit(dto, [], timeZone);
          }
        }),
      );

      if (inFlightAtStart.length > 0) {
        await Promise.allSettled(inFlightAtStart);
      }

      const committedDuringFetch = epochAtStart !== mutationEpoch.current;
      const stillInFlight = pendingMutations.current.size > 0;

      if (
        (!committedDuringFetch && !stillInFlight) ||
        attempt === MAX_ATTEMPTS
      ) {
        break;
      }
      // Either a mutation committed mid-fetch, or one is still
      // unresolved and could commit any moment - this snapshot cannot
      // be trusted as final. Refetch rather than apply it.
    }
    setHabits(withLogs);
    setLoaded(true);
  }, []);

  /* Re-sync one habit from the backend after a mutation. Streaks and
   * pending reviews are computed server-side (with bridging rules the
   * frontend must never reproduce), so the optimistic flip is followed
   * by an authoritative refresh. Failures are silent: the optimistic
   * state stays until the next sync. */
  const refreshHabit = useCallback(async (habitId, timeZone) => {
    const seq = (refreshSeq.current[habitId] =
      (refreshSeq.current[habitId] || 0) + 1);
    try {
      const [dto, logs] = await Promise.all([
        getHabitDetailRequest(habitId),
        listHabitLogsRequest(habitId),
      ]);
      if (seq !== refreshSeq.current[habitId]) return;
      setHabits((prev) =>
        prev.map((h) =>
          h.id === habitId ? buildHabitState(dto, logs, timeZone, h) : h,
        ),
      );
      if (
        Array.isArray(dto.affectedHabitIds) &&
        dto.affectedHabitIds.length > 0
      ) {
        const otherIds = dto.affectedHabitIds.filter((id) => id !== habitId);
        if (otherIds.length > 0) {
          refreshHabitsRef.current?.(otherIds, timeZone);
        }
      }
    } catch {
      // Keep the optimistic state; the next full load reconciles.
    }
  }, []);

  const refreshHabitsRef = useRef(null);

  const refreshHabits = useCallback(
    (habitIds, timeZone) => {
      const ids = [...new Set((habitIds || []).filter(Boolean))];
      return Promise.all(ids.map((id) => refreshHabit(id, timeZone)));
    },
    [refreshHabit],
  );
  refreshHabitsRef.current = refreshHabits;

  const reconcileAfterFailedMutation = useCallback(
    async (id, timeZone, snapshot) => {
      try {
        const [dto, logs] = await Promise.all([
          getHabitDetailRequest(id),
          listHabitLogsRequest(id),
        ]);
        setHabits((prev) =>
          prev.map((h) =>
            h.id === id ? buildHabitState(dto, logs, timeZone, h) : h,
          ),
        );
        if (
          Array.isArray(dto.affectedHabitIds) &&
          dto.affectedHabitIds.length > 0
        ) {
          const otherIds = dto.affectedHabitIds.filter((oid) => oid !== id);
          if (otherIds.length > 0) {
            refreshHabitsRef.current?.(otherIds, timeZone);
          }
        }
      } catch (refetchErr) {
        if (refetchErr?.status === 404) {
          setHabits((prev) => prev.filter((h) => h.id !== id));
        } else {
          replaceHabit(snapshot);
        }
      }
    },
    [replaceHabit],
  );

  /* Flip completedToday: checking in posts today's log (or recovers a
   * pending day), un-checking deletes it. Optimistic flip, reverted on
   * failure. The displayed streak is bumped in the same tick for the
   * guaranteed-safe case (see streakBump below); either way it is
   * unconditionally reconciled to the server's value once the request
   * resolves, so the optimistic number is never left as the final one.
   * Returns true when the server accepted the change. */
  const toggleHabitCompletion = useCallback(
    async (id, timeZone) => {
      if (toggleInFlight.current.has(id)) {
        showToast("Still saving that check-in - one moment.");
        return { success: false, duplicate: true };
      }
      toggleInFlight.current.add(id);

      const snapshot = habits.find((h) => h.id === id);
      if (!snapshot) {
        toggleInFlight.current.delete(id);
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
          const streakBump =
            nowDone && !h.missed
              ? {
                  currentStreak: h.currentStreak + 1,
                  longestStreak: Math.max(h.longestStreak, h.currentStreak + 1),
                }
              : null;
          return {
            ...h,
            completedToday: nowDone,
            count: nextCount,
            missed: nowDone ? false : h.missed,
            history,
            rawHistory,
            pendingReviewDates: nextPending,
            ...streakBump,
          };
        }),
      );

      try {
        let shieldEarned = false;
        let consistencyBonuses = [];
        // Un-checking today's completion can itself break a full-
        // completion streak that had already earned a bonus/shield -
        // the backend reverses that reward server-side (a real state
        // transition, not just "no bonus was awarded"), so surface it
        // the same way an award is surfaced.
        let reversedBonuses = [];
        let reversedShields = [];
        let streakPatch = null;
        let affectedHabitIds = [];
        if (nowDone) {
          const response = await trackMutation(
            createHabitLogRequest(id, today),
          );
          shieldEarned = response?.shieldEarned;
          consistencyBonuses = response?.consistencyBonuses || [];
          reversedBonuses = response?.reversedBonuses || [];
          reversedShields = response?.reversedShields || [];
          affectedHabitIds = response?.affectedHabitIds || [];
          if (typeof response?.currentStreak === "number") {
            streakPatch = {
              currentStreak: response.currentStreak,
              longestStreak: response.longestStreak,
            };
          }
          if (shieldEarned) {
            showToast("🛡️ Guardian Shield earned!");
          }
        } else {
          const response = await trackMutation(undoHabitLogRequest(id, today));
          affectedHabitIds = response?.affectedHabitIds || [];
          reversedBonuses = response?.reversedBonuses || [];
          reversedShields = response?.reversedShields || [];
          if (typeof response?.currentStreak === "number") {
            streakPatch = {
              currentStreak: response.currentStreak,
              longestStreak: response.longestStreak,
            };
          }
        }
        if (streakPatch) {
          setHabits((prev) =>
            prev.map((h) => (h.id === id ? { ...h, ...streakPatch } : h)),
          );
        }
        mutationEpoch.current += 1;
        refreshHabit(id, timeZone);
        // Cross-habit Guardian Shield fallout (see refreshHabits above) -
        // re-sync any other habit the server silently rewrote too.
        if (affectedHabitIds.length > 0) {
          refreshHabits(affectedHabitIds, timeZone);
        }
        return {
          success: true,
          consistencyBonuses,
          reversedBonuses,
          reversedShields,
        };
      } catch (err) {
        if (err?.status === 409) {
          // The server state changed underneath this request (e.g. a
          // duplicate log already exists) - still a confirmed change
          // in server truth that any in-flight load() must not clobber,
          // and one that already moved XP/level/aura/shields/global
          // streak server-side (e.g. another device beat this one to
          // it), so callers must treat this as a real mutation for
          // progress-refresh purposes even though it "failed" locally.
          mutationEpoch.current += 1;
          refreshHabit(id, timeZone);
          showToast(err.error || "Could not update the trial. Try again.");
          return { success: false, confirmed: true };
        }
        reconcileAfterFailedMutation(id, timeZone, snapshot);
        showToast(err.error || "Could not update the trial. Try again.");
        return { success: false, confirmed: false };
      } finally {
        toggleInFlight.current.delete(id);
      }
    },
    [
      habits,
      replaceHabit,
      showToast,
      refreshHabit,
      refreshHabits,
      trackMutation,
      reconcileAfterFailedMutation,
    ],
  );

  /* Undo a check-in from the habit detail calendar. The backend only
   * allows undoing today's completed log; anything else surfaces its
   * server message. Locally the day becomes unlogged again (the server
   * deletes the log entirely), then the habit re-syncs so its
   * server-computed streak stays accurate. */
  const undoCheckIn = useCallback(
    async (habitId, dateStr, timeZone) => {
      try {
        const response = await trackMutation(
          undoHabitLogRequest(habitId, dateStr),
        );
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
              currentStreak:
                typeof response?.currentStreak === "number"
                  ? response.currentStreak
                  : h.currentStreak,
              longestStreak:
                typeof response?.longestStreak === "number"
                  ? response.longestStreak
                  : h.longestStreak,
              history,
              rawHistory,
            };
          }),
        );
        mutationEpoch.current += 1;
        refreshHabit(habitId, timeZone);
        if (response?.affectedHabitIds?.length > 0) {
          refreshHabits(response.affectedHabitIds, timeZone);
        }
        return {
          success: true,
          reversedBonuses: response?.reversedBonuses || [],
          reversedShields: response?.reversedShields || [],
        };
      } catch (err) {
        if (err?.status === 409) {
          mutationEpoch.current += 1;
          refreshHabit(habitId, timeZone);
          showToast(err.error || "Could not undo this check-in.");
          return { success: false, confirmed: true };
        }
        showToast(err.error || "Could not undo this check-in.");
        return { success: false, confirmed: false };
      }
    },
    [showToast, refreshHabit, refreshHabits, trackMutation],
  );

  const deleteHabit = useCallback(
    async (id, timeZone) => {
      const dto = await trackMutation(deleteHabitRequest(id));
      mutationEpoch.current += 1;
      setHabits((prev) => prev.filter((h) => h.id !== id));
      if (dto?.affectedHabitIds?.length > 0) {
        refreshHabitsRef.current?.(dto.affectedHabitIds, timeZone);
      }
      return dto;
    },
    [trackMutation],
  );

  /* The backend only persists renames; difficulty is fixed at creation. */
  const updateHabit = useCallback(
    async (id, updates, timeZone) => {
      const dto = await trackMutation(
        updateHabitRequest(id, { title: updates.name }),
      );
      mutationEpoch.current += 1;
      const existing = habits.find((h) => h.id === id);
      const next = {
        ...(existing || {}),
        name: dto.title,
      };
      replaceHabit(next);
      if (dto?.affectedHabitIds?.length > 0) {
        refreshHabitsRef.current?.(dto.affectedHabitIds, timeZone);
      }
      return next;
    },
    [habits, replaceHabit, trackMutation],
  );

  const addHabit = useCallback(
    async ({ name, difficulty }, timeZone) => {
      const dto = await trackMutation(
        createHabitRequest({ title: name, difficulty }),
      );
      mutationEpoch.current += 1;
      const created = mapHabit(dto, [], timeZone);
      setHabits((prev) => [...prev, created]);
      if (dto?.affectedHabitIds?.length > 0) {
        refreshHabitsRef.current?.(dto.affectedHabitIds, timeZone);
      }
      return created;
    },
    [trackMutation],
  );

  /* Resolve a pending-review day once the server accepted the review
   * decision: drop it from pendingReviewDates and write the outcome
   * into history ("done" | "missed" | "shielded"). Called only after
   * the server has already confirmed the decision (useReviewSession),
   * so this counts as a confirmed mutation for load()'s guard too. */
  const resolveHabitDate = useCallback((habitId, date, status) => {
    mutationEpoch.current += 1;
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
    refreshHabits,
    trackMutation,
  };
}
