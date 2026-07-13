const xpService = require("./xpService");
const auraEnergyService = require("./auraEnergyService");
const dailyAuraStatsService = require("./dailyAuraStatsService");

async function awardCompletionRewards(userId, habit, date, tx) {
  await xpService.awardCompletionXp(userId, habit.difficulty, tx);

  await auraEnergyService.applyEnergyForCompletion(
    userId,
    habit.difficulty,
    date,
    tx,
  );
  await dailyAuraStatsService.recalculateDailyAuraStats(userId, date, tx);
}

async function awardRecoveryRewards(userId, habit, date, tx) {
  await xpService.awardCompletionXp(userId, habit.difficulty, tx);

  await auraEnergyService.applyEnergyForCompletion(
    userId,
    habit.difficulty,
    date,
    tx,
  );
}

module.exports = { awardCompletionRewards, awardRecoveryRewards };
