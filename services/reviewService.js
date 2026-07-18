const { runInTransaction } = require("../db");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const levelService = require("./levelService");
const completionRewardService = require("./completionRewardService");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const guardianShieldService = require("./guardianShieldService");
const pendingReviewSessionService = require("./pendingReviewSessionService");
const { calculateHabitStreaks } = require("../utils/streak");

function computeAutoPopupThreshold(totalHabits) {
  return totalHabits < 6 ? 3 : Math.floor(totalHabits / 2);
}

async function checkGuardianShieldEligibility(
  userId,
  habitId,
  latestConfirmedDate,
  tx,
) {
  const habit = await habitModel.findById(habitId, userId, tx);
  if (!habit) return;

  const stillPendingReview = await habitLogModel.findPendingByHabit(
    habitId,
    tx,
  );
  if (stillPendingReview) return;

  const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
  const logs = rawLogs.map((row) => ({
    date: row.log_date,
    status: row.status,
  }));
  const {
    currentStreak: confirmedStreak,
    currentStreakStartDate: confirmedStreakStartDate,
  } = calculateHabitStreaks(logs, latestConfirmedDate);
  await guardianShieldService.earnShieldIfEligible(
    userId,
    habitId,
    habit.difficulty,
    confirmedStreak,
    confirmedStreakStartDate,
    latestConfirmedDate,
    tx,
  );
}

async function getPendingReviews(userId) {
  const totalHabits = await habitModel.countByUser(userId);
  const pendingRows = await habitLogModel.findPendingForUser(userId);

  const sessionsByHabit = new Map();
  for (const row of pendingRows) {
    let session = sessionsByHabit.get(row.habit_id);
    if (!session) {
      session = {
        habitId: row.habit_id,
        habitName: row.habit_name,
        sessionId: row.review_session_id,
        missedDates: [],
      };
      sessionsByHabit.set(row.habit_id, session);
    }
    session.missedDates.push(row.missed_date);
  }

  const pending = [...sessionsByHabit.values()];
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

async function applyDecisions(decisions, userId) {
  return runInTransaction(async (tx) => {
    const sortedDecisions = [...decisions].sort((a, b) =>
      a.missedDate < b.missedDate ? -1 : a.missedDate > b.missedDate ? 1 : 0,
    );

    const results = [];
    const touchedDates = new Set();
    const recoveredHabitDates = new Map();

    for (const item of sortedDecisions) {
      const { habitId, missedDate, decision, useShield } = item;

      const pending = await habitLogModel.findPendingByHabitAndDate(
        habitId,
        missedDate,
        userId,
        tx,
      );

      if (!pending) {
        results.push({ habitId, missedDate, result: "not_found" });
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
          results.push({ habitId, missedDate, result: "shielded" });
          await checkGuardianShieldEligibility(userId, habitId, missedDate, tx);
        } else {
          await habitLogModel.resolveDecision(pending.id, "missed", tx);
          results.push({ habitId, missedDate, result: "missed_no_shield" });
        }
        touchedDates.add(missedDate);
        await pendingReviewSessionService.resolveSessionIfComplete(habitId, tx);
        continue;
      }

      const newStatus = decision === "completed" ? "recovered" : "missed";
      await habitLogModel.resolveDecision(pending.id, newStatus, tx);
      touchedDates.add(missedDate);

      if (newStatus === "recovered") {
        const dates = recoveredHabitDates.get(habitId) || [];
        dates.push(missedDate);
        recoveredHabitDates.set(habitId, dates);
      }

      await pendingReviewSessionService.resolveSessionIfComplete(habitId, tx);
      results.push({ habitId, missedDate, result: newStatus });
    }

    for (const date of touchedDates) {
      await dailyAuraStatsService.recalculateDailyAuraStats(userId, date, tx);
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

      for (const date of dates) {
        await checkGuardianShieldEligibility(userId, habitId, date, tx);
      }
    }

    await levelService.recalculateAndPersistLevel(userId, tx);

    return results;
  });
}

module.exports = { getPendingReviews, applyDecisions };
