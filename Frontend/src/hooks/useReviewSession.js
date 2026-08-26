"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { applyReviewDecisionsRequest } from "../services/dashboardApi";

/* -------------------------------------------------------------- */
/* Pending review session                                          */
/*                                                                  */
/* openReviewSession(habitId, singleDate) builds the queue fresh    */
/* from current habit state every time it's opened, so it always    */
/* reflects whatever is still unresolved - whether entered from the */
/* top banner (every pending day, across every habit) or from a     */
/* single habit's pending badge / calendar day (just that habit).   */
/*                                                                  */
/* Each decision is committed to the backend as it is made; the     */
/* local habit state only resolves once the server confirms. A miss */
/* only offers the shield option when shields are available; with   */
/* none, that step is skipped entirely rather than showing a        */
/* disabled/greyed-out offer.                                       */
/* -------------------------------------------------------------- */

/* Backend decision result -> calendar status. */
function resultToStatus(result) {
  if (result === "recovered") return "done";
  if (result === "shielded") return "shielded";
  return "missed"; // "missed" | "missed_no_shield"
}

export function useReviewSession({
  habits,
  resolveHabitDate,
  shieldsAvailable,
  showToast,
  onProgressChanged,
  onHabitChanged,
}) {
  const [reviewQueue, setReviewQueue] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewStep, setReviewStep] = useState("ask"); // "ask" | "shieldOffer" | "confirmShield"
  const [reviewOpen, setReviewOpen] = useState(false);
  const reviewSummary = useRef({ recovered: 0, missed: 0, shielded: 0 });
  const decisionsCommitted = useRef(false);
  const resolvingRef = useRef(false);

  const totalPendingCount = useMemo(
    () =>
      habits.reduce((sum, h) => sum + (h.pendingReviewDates || []).length, 0),
    [habits],
  );

  const finishReviewSession = useCallback(() => {
    setReviewOpen(false);
    setReviewQueue([]);
    setReviewIndex(0);
    setReviewStep("ask");
    const { recovered, missed, shielded } = reviewSummary.current;
    const parts = [];
    if (recovered) parts.push(recovered + " recovered");
    if (shielded) parts.push(shielded + " shielded");
    if (missed) parts.push(missed + " missed");
    showToast(
      parts.length
        ? "Review complete · " + parts.join(" · ")
        : "Review complete",
    );
    // Shields and XP changed server-side during the session.
    if (decisionsCommitted.current && onProgressChanged) {
      onProgressChanged();
    }
    decisionsCommitted.current = false;
  }, [showToast, onProgressChanged]);

  /* Commit one decision to the backend, then resolve it locally with
   * the authoritative result (the server may downgrade a shield spend
   * when the balance ran out). On failure the queue stays on the same
   * item so the user can retry. A guard keeps a second click while a
   * request is in flight from double-submitting. */
  const resolveCurrentReviewItem = useCallback(
    async (decision, useShield = false) => {
      const item = reviewQueue[reviewIndex];
      if (!item || resolvingRef.current) return;
      resolvingRef.current = true;

      try {
        const payload = await applyReviewDecisionsRequest([
          {
            habitId: item.habitId,
            missedDate: item.date,
            decision,
            ...(useShield ? { useShield: true } : {}),
          },
        ]);

        const result =
          payload &&
          Array.isArray(payload.results) &&
          payload.results[0] &&
          payload.results[0].result
            ? payload.results[0].result
            : null;

        if (!result || result === "not_found") {
          // Already resolved elsewhere - drop it from the local queue.
          resolveHabitDate(item.habitId, item.date, "missed");
        } else {
          const status = resultToStatus(result);
          resolveHabitDate(item.habitId, item.date, status);
          if (status === "done") reviewSummary.current.recovered += 1;
          else if (status === "missed") reviewSummary.current.missed += 1;
          else if (status === "shielded") reviewSummary.current.shielded += 1;
        }

        // Show consistency bonus toasts if any were awarded
        if (payload.consistencyBonuses && payload.consistencyBonuses.length > 0) {
          for (const bonus of payload.consistencyBonuses) {
            const bonusLabel = bonus.bonusType === '7day' ? '7-Day Streak' : '30-Day Streak';
            const bonusXp = bonus.delta;
            showToast(`🎉 Consistency Bonus: ${bonusLabel} · +${bonusXp} XP!`);
          }
        }

        decisionsCommitted.current = true;

        // The server recomputed this habit's streak (bridging rules and
        // reconciliation) - pull its authoritative state back.
        if (onHabitChanged) onHabitChanged(item.habitId);

        const nextIndex = reviewIndex + 1;
        if (nextIndex >= reviewQueue.length) {
          finishReviewSession();
        } else {
          setReviewIndex(nextIndex);
          setReviewStep("ask");
        }
      } catch (err) {
        showToast(err.error || "Could not save that decision. Try again.");
      } finally {
        resolvingRef.current = false;
      }
    },
    [
      reviewQueue,
      reviewIndex,
      resolveHabitDate,
      finishReviewSession,
      onHabitChanged,
      showToast,
    ],
  );

  const openReviewSession = useCallback(
    (habitId, singleDate) => {
      const queue = [];
      habits.forEach((h) => {
        if (habitId && h.id !== habitId) return;
        (h.pendingReviewDates || []).forEach((date) => {
          if (singleDate && date !== singleDate) return;
          queue.push({ habitId: h.id, habitName: h.name, date });
        });
      });
      queue.sort((a, b) => (a.date < b.date ? -1 : 1));
      if (queue.length === 0) return;
      reviewSummary.current = { recovered: 0, missed: 0, shielded: 0 };
      decisionsCommitted.current = false;
      setReviewQueue(queue);
      setReviewIndex(0);
      setReviewStep("ask");
      setReviewOpen(true);
    },
    [habits],
  );

  const handleReviewRecovered = useCallback(
    () => resolveCurrentReviewItem("completed"),
    [resolveCurrentReviewItem],
  );

  const handleReviewMissed = useCallback(() => {
    if (shieldsAvailable > 0) {
      setReviewStep("shieldOffer");
    } else {
      resolveCurrentReviewItem("missed");
    }
  }, [shieldsAvailable, resolveCurrentReviewItem]);

  // "Use a shield" doesn't spend it right away - it first asks the user
  // to confirm, since consuming a shield can't be undone.
  const requestShieldUse = useCallback(
    () => setReviewStep("confirmShield"),
    [],
  );
  const cancelShieldUse = useCallback(() => setReviewStep("shieldOffer"), []);

  const confirmShieldUse = useCallback(
    () => resolveCurrentReviewItem("missed", true),
    [resolveCurrentReviewItem],
  );

  const declineShield = useCallback(
    () => resolveCurrentReviewItem("missed"),
    [resolveCurrentReviewItem],
  );

  const closeReviewSession = useCallback(() => {
    setReviewOpen(false);
    setReviewQueue([]);
    setReviewIndex(0);
    setReviewStep("ask");
    if (decisionsCommitted.current && onProgressChanged) {
      onProgressChanged();
    }
    decisionsCommitted.current = false;
  }, [onProgressChanged]);

  return {
    totalPendingCount,
    reviewOpen,
    reviewQueue,
    reviewIndex,
    reviewStep,
    openReviewSession,
    closeReviewSession,
    handleReviewRecovered,
    handleReviewMissed,
    requestShieldUse,
    confirmShieldUse,
    cancelShieldUse,
    declineShield,
  };
}
