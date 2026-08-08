const habitLogModel = require("../models/habitLogModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const streakService = require("./streakService");
const bonusService = require("./bonusService");
const auraEnergyService = require("./auraEnergyService");
const { isFullDayCompletion, PRESENT_STATUSES } = require("../utils/streak");
const { isActiveOnLocalDate } = require("../utils/timezone");

async function recalculateDailyAuraStats(userId, date, tx, timezone) {
  await tx.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
  await dailyAuraStatsModel.lockRow(userId, date, tx);
  const allStatuses = await habitLogModel.getStatusesForUserAndDate(
    userId,
    date,
    tx,
    true,
  );
  const statuses = allStatuses.filter((row) =>
    isActiveOnLocalDate(row.created_at, row.archived_at, date, timezone),
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
      totalHabits,
    );
  }
  return { totalHabits, completedHabits, fullCompletion };
}

module.exports = { recalculateDailyAuraStats };
