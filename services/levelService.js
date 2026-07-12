const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const { computeLevel } = require("../utils/levelCalculator");

async function recalculateAndPersistLevel(userId, tx) {
  const progress = (await userProgressModel.getProgress(userId, tx)) || {};
  const stats = (await dailyAuraStatsModel.getLifetimeStats(userId, tx)) || {};

  const fullyCompletedDays = stats.fullyCompletedDays || 0;
  const lifetimeCompleted = stats.lifetimeCompleted || 0;
  const lifetimeTotal = stats.lifetimeTotal || 0;

  const consistencyRatio =
    lifetimeTotal > 0 ? lifetimeCompleted / lifetimeTotal : 0;

  const currentStreak = progress.global_daily_streak || 0;
  const streakStability = Math.min(currentStreak / 30, 1.0);

  const newLevel = computeLevel(
    fullyCompletedDays,
    consistencyRatio,
    streakStability,
    progress.current_level || 0,
  );

  await userProgressModel.updateLevel(userId, newLevel, tx);

  return newLevel;
}

module.exports = { recalculateAndPersistLevel };
