const xpService = require("./xpService");
const dailyAuraStatsService = require("./dailyAuraStatsService");

async function awardCompletionXpForHabit(userId, habit, date, tx) {
  return xpService.awardCompletionXp(
    userId,
    habit.id,
    date,
    habit.difficulty,
    tx,
  );
}

async function awardCompletionRewards(userId, habit, date, tx, timezone, cache) {
  await awardCompletionXpForHabit(userId, habit, date, tx);

  await dailyAuraStatsService.recalculateDailyAuraStats(
    userId,
    date,
    tx,
    timezone,
    cache,
  );
}

async function awardRecoveryRewards(userId, habit, date, tx) {
  await awardCompletionXpForHabit(userId, habit, date, tx);
}

module.exports = { awardCompletionRewards, awardRecoveryRewards };
