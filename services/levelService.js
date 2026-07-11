const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const { computeLevel } = require("../utils/levelCalculator");

async function recalculateAndPersistLevel(userId, tx) {
  const progress = await userProgressModel.getProgress(userId, tx);
  const { fullyCompletedDays, lifetimeCompleted, lifetimeTotal } =
    await dailyAuraStatsModel.getLifetimeStats(userId, tx);

  const consistencyRatio =
    lifetimeTotal > 0 ? lifetimeCompleted / lifetimeTotal : 0;
  const streakStability = Math.min(progress.global_daily_streak / 30, 1.0);

  const newLevel = computeLevel(
    fullyCompletedDays,
    consistencyRatio,
    streakStability,
    progress.current_level,
  );

  await userProgressModel.updateLevel(userId, newLevel, tx);

  return newLevel;
}

module.exports = { recalculateAndPersistLevel };
