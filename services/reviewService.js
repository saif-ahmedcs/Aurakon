const { runInTransaction } = require("../db");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const levelService = require("./levelService");
const reviewSyncService = require("./reviewSyncService");
const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const guardianShieldService = require("./guardianShieldService");
const { calculateStreaks } = require("../utils/streak");

function computeAutoPopupThreshold(totalHabits) {
  return totalHabits < 6 ? 3 : Math.floor(totalHabits / 2);
}

async function getPendingReviews(userId) {
  await reviewSyncService.evaluatePendingReviews(userId);

  const totalHabits = await habitModel.countByUser(userId);
  const pendingRows = await habitLogModel.findPendingForUser(userId);

  const pending = pendingRows.map((row) => ({
    habitId: row.habit_id,
    habitName: row.habit_name,
    missedDate: row.missed_date,
    createdAt: row.created_at,
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

async function applyDecisions(decisions, userId) {
  return runInTransaction(async (tx) => {
    const results = [];

    for (const item of decisions) {
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
        const shielded =
          await userProgressModel.decrementShieldBalanceIfAvailable(userId);

        if (shielded) {
          await habitLogModel.resolveDecision(pending.id, "shielded", tx);
          results.push({ habitId, missedDate, result: "shielded" });
        } else {
          await habitLogModel.resolveDecision(pending.id, "missed", tx);
          results.push({ habitId, missedDate, result: "missed_no_shield" });
        }
        await dailyAuraStatsService.recalculateDailyAuraStats(
          userId,
          missedDate,
          tx,
        );
        continue;
      }

      const newStatus = decision === "completed" ? "recovered" : "missed";
      await habitLogModel.resolveDecision(pending.id, newStatus, tx);
      await dailyAuraStatsService.recalculateDailyAuraStats(
        userId,
        missedDate,
        tx,
      );

      if (newStatus === "recovered") {
        const stillPendingReview = await habitLogModel.findPendingByHabit(
          habitId,
          tx,
        );
        if (!stillPendingReview) {
          const habit = await habitModel.findById(habitId, userId, tx);
          const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
          const logs = rawLogs.map((row) => ({
            date: row.log_date,
            status: row.status,
          }));
          const { currentStreak: confirmedStreak } = calculateStreaks(
            logs,
            missedDate,
          );
          await guardianShieldService.earnShieldIfEligible(
            userId,
            habit.difficulty,
            confirmedStreak,
            tx,
          );
        }
      }

      results.push({ habitId, missedDate, result: newStatus });
    }
    await levelService.recalculateAndPersistLevel(userId, tx);

    return results;
  });
}

module.exports = { getPendingReviews, applyDecisions };
