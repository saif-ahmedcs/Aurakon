const xpService = require("./xpService");
const dailyAuraStatsService = require("./dailyAuraStatsService");

async function awardCompletionRewards(userId, habit, date, tx) {
  await xpService.awardCompletionXp(
    userId,
    habit.id,
    date,
    habit.difficulty,
    tx,
  );

  await dailyAuraStatsService.recalculateDailyAuraStats(userId, date, tx);
}

async function awardRecoveryRewards(userId, habit, date, tx) {
  await xpService.awardCompletionXp(
    userId,
    habit.id,
    date,
    habit.difficulty,
    tx,
  );
}

module.exports = { awardCompletionRewards, awardRecoveryRewards };
