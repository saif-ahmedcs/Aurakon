const xpService = require("./xpService");
const auraEnergyService = require("./auraEnergyService");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const streakService = require("./streakService");
const bonusService = require("./bonusService");

async function awardCompletionRewards(userId, habit, date, tx) {
  await xpService.awardCompletionXp(userId, habit.difficulty, tx);

  await auraEnergyService.applyEnergyForCompletion(
    userId,
    habit.difficulty,
    date,
    tx,
  );

  const { fullCompletion: isFullDay } =
    await dailyAuraStatsService.recalculateDailyAuraStats(userId, date, tx);

  if (isFullDay) {
    const globalStreak = await streakService.updateGlobalStreak(
      userId,
      date,
      tx,
    );

    await bonusService.checkAndAwardConsistencyBonus(userId, globalStreak, tx);
  }
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
