const habitLogModel = require("../models/habitLogModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const streakService = require("./streakService");
const bonusService = require("./bonusService");
const auraEnergyService = require("./auraEnergyService");
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
  const auraEnergy = auraEnergyService.computeEnergyForDay(statuses);

  await dailyAuraStatsModel.upsertCounts(
    userId,
    date,
    totalHabits,
    completedHabits,
    fullCompletion,
    auraEnergy,
    tx,
  );
  await streakService.recalculateGlobalStreak(userId, tx);

  if (fullCompletion) {
    const streakAtDate = await streakService.getStreakAsOfDate(
      userId,
      date,
      tx,
    );
    await bonusService.checkAndAwardConsistencyBonus(
      userId,
      streakAtDate,
      date,
      tx,
    );
  }
  return { totalHabits, completedHabits, fullCompletion };
}

module.exports = { recalculateDailyAuraStats };
