const { runInTransaction } = require("../db");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
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

    function trackEarliest(habitId, date) {
      const current = affectedHabitEarliestDate.get(habitId);
      if (!current || date < current) {
        affectedHabitEarliestDate.set(habitId, date);
      }
    }

    const fullCompletionCache = streakService.createFullCompletionCache();

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
      await dailyAuraStatsService.recalculateDailyAuraStats(
        userId,
        date,
        tx,
        timezone,
        fullCompletionCache,
      );
    }

    const earliestTouchedDate = [...touchedDates].sort()[0];
    if (earliestTouchedDate) {
      await bonusService.reconcileBonusesFromDate(
        userId,
        earliestTouchedDate,
        tx,
        fullCompletionCache,
      );
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
      );
    }

    await levelService.recalculateAndPersistLevel(userId, tx, timezone);

    const results = decisions.map(({ habitId, missedDate }) =>
      resultsByKey.get(`${habitId}|${missedDate}`),
    );

    return results;
  });
}

module.exports = { getPendingReviews, applyDecisions };
