const habitLogModel = require("../models/habitLogModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const levelService = require("./levelService");
const { isFullDayCompletion, PRESENT_STATUSES } = require("../utils/streak");

// Single source of truth for daily_aura_stats.total_habits / completed_habits.
// Always recomputes from habits + habit_logs rather than incrementing/decrementing,
// so it is safe to call repeatedly (idempotent) and after any operation that could
// change either count.
async function recalculateDailyAuraStats(userId, date, tx) {
  const statuses = await habitLogModel.getStatusesForUserAndDate(
    userId,
    date,
    tx,
  );

  const totalHabits = statuses.length;
  const completedHabits = statuses.filter((row) =>
    PRESENT_STATUSES.has(row.status),
  ).length;
  const fullCompletion = isFullDayCompletion(statuses);

  await dailyAuraStatsModel.upsertCounts(
    userId,
    date,
    totalHabits,
    completedHabits,
    fullCompletion,
    tx,
  );

  await levelService.recalculateAndPersistLevel(userId, tx);

  return { totalHabits, completedHabits, fullCompletion };
}

module.exports = { recalculateDailyAuraStats };
