const habitLogModel = require("../models/habitLogModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const streakService = require("./streakService");
const bonusService = require("./bonusService");
const { isFullDayCompletion, PRESENT_STATUSES } = require("../utils/streak");

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
  const globalStreak = await streakService.recalculateGlobalStreak(userId, tx);

  if (fullCompletion) {
    await bonusService.checkAndAwardConsistencyBonus(userId, globalStreak, tx);
  }

  return { totalHabits, completedHabits, fullCompletion };
}

module.exports = { recalculateDailyAuraStats };
