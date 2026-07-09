const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const reviewSyncService = require("./reviewSyncService");

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
  const results = [];

  for (const item of decisions) {
    const { habitId, missedDate, decision } = item;

    const pending = await habitLogModel.findPendingByHabitAndDate(
      habitId,
      missedDate,
      userId,
    );

    if (!pending) {
      results.push({ habitId, missedDate, result: "not_found" });
      continue;
    }

    const newStatus = decision === "completed" ? "recovered" : "missed";
    await habitLogModel.resolveDecision(pending.id, newStatus);

    results.push({ habitId, missedDate, result: newStatus });
  }

  return results;
}

module.exports = { getPendingReviews, applyDecisions };
