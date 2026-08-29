"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
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
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const reviewSummary = useRef({ recovered: 0, missed: 0, shielded: 0 });
  const decisionsCommitted = useRef(false);
  const resolvingRef = useRef(false);
  // Reactive mirror of resolvingRef: while true, a decision commit is
  // outstanding against the backend (POST /api/review/decisions). The
  // ref alone can't drive UI, but this state is what closes the actual
  // race - the review endpoint reads and rewrites shared per-user
  // progression (shield balance, aura stats, bonus reconciliation)
  // *before* it takes the same row lock a habit check-in/undo takes
  // first thing, so those two writes can interleave if the user is
  // able to back out of the modal and fire a check-in while a
  // decision from this session is still in flight. Consumers use this
  // to keep the modal open (can't dismiss mid-request) and to hold off
  // check-in/undo actions elsewhere until it clears.
  const [decisionInFlight, setDecisionInFlight] = useState(false);
  const countdownTimerRef = useRef(null);

  const [reviewShieldsAvailable, setReviewShieldsAvailable] =
    useState(shieldsAvailable);
  useEffect(() => {
    if (!reviewOpen) setReviewShieldsAvailable(shieldsAvailable);
  }, [shieldsAvailable, reviewOpen]);

  const totalPendingCount = useMemo(
    () =>
      habits.reduce((sum, h) => sum + (h.pendingReviewDates || []).length, 0),
    [habits],
  );

  useEffect(() => {
    if (rateLimitCountdown > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setRateLimitCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    return () => {
      if (countdownTimerRef.current) {
        clearTimeout(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
    };
  }, [rateLimitCountdown]);

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
      setDecisionInFlight(true);

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
          // Already resolved elsewhere - skip local write, rely on refetch.
        } else {
          const status = resultToStatus(result);
          resolveHabitDate(item.habitId, item.date, status);
          if (status === "done") reviewSummary.current.recovered += 1;
          else if (status === "missed") reviewSummary.current.missed += 1;
          else if (status === "shielded") reviewSummary.current.shielded += 1;

          if (result === "shielded") {
            setReviewShieldsAvailable((prev) => Math.max(0, prev - 1));
          } else if (result === "missed_no_shield") {
            setReviewShieldsAvailable(0);
            showToast(
              "No shields left - that day was marked as missed instead.",
            );
          }
        }

        // Show consistency bonus toasts if any were awarded
        if (
          payload.consistencyBonuses &&
          payload.consistencyBonuses.length > 0
        ) {
          for (const bonus of payload.consistencyBonuses) {
            const bonusLabel =
              bonus.bonusType === "7day" ? "7-Day Streak" : "30-Day Streak";
            const bonusXp = bonus.delta;
            showToast(`🎉 Consistency Bonus: ${bonusLabel} · +${bonusXp} XP!`);
          }
        }

        // A "missed" decision (or a shield spend that fails to hold)
        // can itself break a full-completion streak that had already
        // earned a bonus, or revoke a Guardian Shield outright - the
        // backend reverses that reward server-side, so announce it the
        // same way an award is announced above.
        if (payload.reversedBonuses && payload.reversedBonuses.length > 0) {
          for (const bonus of payload.reversedBonuses) {
            const bonusLabel =
              bonus.bonusType === "7day" ? "7-Day Streak" : "30-Day Streak";
            const bonusXp = Math.abs(bonus.delta || 0);
            showToast(`⚠️ ${bonusLabel} bonus reversed · −${bonusXp} XP`);
          }
        }
        if (payload.reversedShields && payload.reversedShields.length > 0) {
          for (const shield of payload.reversedShields) {
            showToast(
              `🛡️ Guardian Shield revoked · ${shield.milestone}-day streak broke`,
            );
          }
        }

        decisionsCommitted.current = true;

        // The server recomputed this habit's streak (bridging rules and
        // reconciliation) - pull its authoritative state back. Guardian
        // Shields are a shared wallet, so this decision can also have
        // silently reverted a shielded/missed day on a *different*
        // habit (docs/04-guardian-shield.md, "Reconciliation"); the
        // response's affectedHabitIds names any such habits so they get
        // the same re-sync instead of quietly drifting from the server.
        if (onHabitChanged) {
          const idsToSync = [item.habitId, ...(payload.affectedHabitIds || [])];
          onHabitChanged(idsToSync);
        }

        const nextIndex = reviewIndex + 1;
        if (nextIndex >= reviewQueue.length) {
          finishReviewSession();
        } else {
          setReviewIndex(nextIndex);
          setReviewStep("ask");
        }
      } catch (err) {
        if (err.status === 429 && err.retryAfter) {
          setRateLimitCountdown(err.retryAfter);
          showToast(`Rate limited. Retry in ${err.retryAfter}s...`);
        } else {
          showToast(err.error || "Could not save that decision. Try again.");
        }
      } finally {
        resolvingRef.current = false;
        setDecisionInFlight(false);
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
    if (reviewShieldsAvailable > 0) {
      setReviewStep("shieldOffer");
    } else {
      resolveCurrentReviewItem("missed");
    }
  }, [reviewShieldsAvailable, resolveCurrentReviewItem]);

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
    // A decision commit is still outstanding - closing now would hand
    // the (now-interactive) dashboard back to the user while that
    // write is unresolved, opening the exact window a concurrent
    // check-in/undo could race against it. Ignore the close until it
    // settles; resolveCurrentReviewItem's finally block clears
    // resolvingRef/decisionInFlight either way, so this never sticks.
    if (resolvingRef.current) return;
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
    reviewShieldsAvailable,
    rateLimitCountdown,
    decisionInFlight,
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
