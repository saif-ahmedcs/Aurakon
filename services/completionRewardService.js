const xpService = require("./xpService");
const dailyAuraStatsService = require("./dailyAuraStatsService");

async function awardCompletionRewards(userId, habit, date, tx, timezone, cache) {
  await xpService.awardCompletionXp(
    userId,
    habit.id,
    date,
    habit.difficulty,
    tx,
  );

  await dailyAuraStatsService.recalculateDailyAuraStats(
    userId,
    date,
    tx,
    timezone,
    cache,
  );
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
