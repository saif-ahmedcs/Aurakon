const { runInTransaction } = require("../db");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const userProgressModel = require("../models/userProgressModel");
const levelService = require("./levelService");
const completionRewardService = require("./completionRewardService");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const guardianShieldService = require("./guardianShieldService");
const pendingReviewSessionService = require("./pendingReviewSessionService");
const bonusService = require("./bonusService");
const streakService = require("./streakService");
const { serializePendingReviewGroup } = require("../utils/habitSerializer");

const userMutexes = new Map();

function runExclusive(userId, fn) {
  const previous = userMutexes.get(userId) || Promise.resolve();
  const run = previous.catch(() => {}).then(fn);
  const tracked = run.catch(() => {});
  userMutexes.set(userId, tracked);
  tracked.finally(() => {
    if (userMutexes.get(userId) === tracked) {
      userMutexes.delete(userId);
    }
  });
  return run;
}

function computeAutoPopupThreshold(totalHabits) {
  return totalHabits < 6 ? 3 : Math.floor(totalHabits / 2);
}

async function getPendingReviews(userId) {
  const totalHabits = await habitModel.countByUser(userId);
  const pendingRows = await habitLogModel.findPendingForUser(userId);

  const rowsByHabit = new Map();

  for (const row of pendingRows) {
    let entry = rowsByHabit.get(row.habit_id);
    if (!entry) {
      entry = { habitId: row.habit_id, title: row.habit_name, rows: [] };
      rowsByHabit.set(row.habit_id, entry);
    }
    entry.rows.push(row);
  }

  const pending = [...rowsByHabit.values()].map(({ habitId, title, rows }) => ({
    habitId,
    title,
    pendingReview: serializePendingReviewGroup(rows),
  }));

  const pendingCount = pending.length;
  const autoPopupThreshold = computeAutoPopupThreshold(totalHabits);
  const shouldAutoPopup =
    pendingCount > 0 && pendingCount >= autoPopupThreshold;

  return {
    pending,
    totalHabits,
    pendingCount,
    autoPopupThreshold,
    shouldAutoPopup,
  };
}

async function applyDecisions(decisions, userId, timezone) {
  return runExclusive(userId, () =>
    runApplyDecisions(decisions, userId, timezone),
  );
}

async function runApplyDecisions(decisions, userId, timezone) {
  return runInTransaction(async (tx) => {
    const sortedDecisions = [...decisions].sort((a, b) =>
      a.missedDate < b.missedDate ? -1 : a.missedDate > b.missedDate ? 1 : 0,
    );

    const resultsByKey = new Map();
    const touchedDates = new Set();
    const recoveredHabitDates = new Map();
    const affectedHabitEarliestDate = new Map();
    const allConsistencyBonuses = [];
    const allReversedBonuses = [];
    const allReversedShields = [];
    const allEarnedBonuses = [];
    const allEarnedShields = [];

    function trackEarliest(habitId, date) {
      const current = affectedHabitEarliestDate.get(habitId);
      if (!current || date < current) {
        affectedHabitEarliestDate.set(habitId, date);
      }
    }

    const fullCompletionCache = streakService.createFullCompletionCache();

    const progressBefore = await userProgressModel.getProgress(
      userId,
      tx,
      true,
    );
    const shieldBalanceBefore = progressBefore?.shield_balance ?? 0;

    for (const item of sortedDecisions) {
      const { habitId, missedDate, decision, useShield } = item;

      const pending = await habitLogModel.findPendingByHabitAndDate(
        habitId,
        missedDate,
        userId,
        tx,
      );

      if (!pending) {
        resultsByKey.set(`${habitId}|${missedDate}`, {
          habitId,
          missedDate,
          result: "not_found",
        });
        continue;
      }

      if (decision === "missed" && useShield) {
        const shielded = await guardianShieldService.spendShield(
          userId,
          pending.id,
          tx,
        );

        if (shielded) {
          await habitLogModel.resolveDecision(pending.id, "shielded", tx);
          streakService.updateHabitLogCache(
            fullCompletionCache,
            habitId,
            missedDate,
            "shielded",
          );
          resultsByKey.set(`${habitId}|${missedDate}`, {
            habitId,
            missedDate,
            result: "shielded",
          });
        } else {
          await habitLogModel.resolveDecision(pending.id, "missed", tx);
          streakService.updateHabitLogCache(
            fullCompletionCache,
            habitId,
            missedDate,
            "missed",
          );
          resultsByKey.set(`${habitId}|${missedDate}`, {
            habitId,
            missedDate,
            result: "missed_no_shield",
          });
        }

        touchedDates.add(missedDate);
        trackEarliest(habitId, missedDate);
        await pendingReviewSessionService.resolveSessionIfComplete(habitId, tx);
        continue;
      }

      const newStatus = decision === "completed" ? "recovered" : "missed";
      await habitLogModel.resolveDecision(pending.id, newStatus, tx);
      streakService.updateHabitLogCache(
        fullCompletionCache,
        habitId,
        missedDate,
        newStatus,
      );
      touchedDates.add(missedDate);
      trackEarliest(habitId, missedDate);

      if (newStatus === "recovered") {
        const dates = recoveredHabitDates.get(habitId) || [];
        dates.push(missedDate);
        recoveredHabitDates.set(habitId, dates);
      }

      await pendingReviewSessionService.resolveSessionIfComplete(habitId, tx);
      resultsByKey.set(`${habitId}|${missedDate}`, {
        habitId,
        missedDate,
        result: newStatus,
      });
    }

    for (const date of touchedDates) {
      const auraResult = await dailyAuraStatsService.recalculateDailyAuraStats(
        userId,
        date,
        tx,
        timezone,
        fullCompletionCache,
      );
      if (
        auraResult.consistencyBonuses &&
        auraResult.consistencyBonuses.length > 0
      ) {
        allConsistencyBonuses.push(...auraResult.consistencyBonuses);
      }
    }

    const earliestTouchedDate = [...touchedDates].sort()[0];
    if (earliestTouchedDate) {
      const bonusReconcileResult = await bonusService.reconcileBonusesFromDate(
        userId,
        earliestTouchedDate,
        tx,
        fullCompletionCache,
      );
      if (bonusReconcileResult?.reversedBonuses?.length) {
        allReversedBonuses.push(...bonusReconcileResult.reversedBonuses);
      }
      if (bonusReconcileResult?.earnedBonuses?.length) {
        allEarnedBonuses.push(...bonusReconcileResult.earnedBonuses);
      }
    }

    for (const [habitId, dates] of recoveredHabitDates) {
      const habit = await habitModel.findById(habitId, userId, tx);
      if (!habit) continue;

      for (const date of dates) {
        await completionRewardService.awardRecoveryRewards(
          userId,
          habit,
          date,
          tx,
        );
      }
    }

    const crossHabitIds = new Set();

    for (const [habitId, earliestDate] of affectedHabitEarliestDate) {
      const logs = await streakService.getLogsForHabitCached(
        habitId,
        tx,
        fullCompletionCache,
      );
      await guardianShieldService.reconcileShieldsFromDate(
        userId,
        habitId,
        logs,
        earliestDate,
        tx,
        timezone,
        fullCompletionCache,
        crossHabitIds,
        allReversedBonuses,
        allReversedShields,
        allEarnedBonuses,
        allEarnedShields,
      );
    }

    const newLevel = await levelService.recalculateAndPersistLevel(userId, tx, timezone);

    const progressAfter = await userProgressModel.getProgress(userId, tx, true);
    const shieldBalance = progressAfter?.shield_balance ?? 0;
    const shieldEarned = shieldBalance > shieldBalanceBefore;

    const results = decisions.map(({ habitId, missedDate }) =>
      resultsByKey.get(`${habitId}|${missedDate}`),
    );

    const decidedHabitIds = new Set(decisions.map((d) => d.habitId));
    const affectedHabitIds = [...crossHabitIds].filter(
      (id) => !decidedHabitIds.has(id),
    );

    return {
      results,
      consistencyBonuses: allConsistencyBonuses,
      affectedHabitIds,
      reversedBonuses: allReversedBonuses,
      reversedShields: allReversedShields,
      earnedBonuses: allEarnedBonuses,
      earnedShields: allEarnedShields,
      shieldBalance,
      shieldEarned,
      level: newLevel,
    };
  });
}

module.exports = { getPendingReviews, applyDecisions };
