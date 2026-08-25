const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const streakService = require("./streakService");
const { computeLevel } = require("../utils/levelCalculator");
const { todayInTimezone } = require("../utils/timezone");

async function recalculateAndPersistLevel(userId, tx, timezone) {
  await tx.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);
  const progress = (await userProgressModel.getProgress(userId, tx)) || {};
  const stats = (await dailyAuraStatsModel.getLifetimeStats(userId, tx)) || {};

  const fullyCompletedDays = stats.fullyCompletedDays || 0;
  const lifetimeCompleted = stats.lifetimeCompleted || 0;
  const lifetimeTotal = stats.lifetimeTotal || 0;

  const consistencyRatio =
    lifetimeTotal > 0 ? lifetimeCompleted / lifetimeTotal : 0;

  const today = todayInTimezone(timezone);
  const currentStreak = await streakService.reconcileStaleStreak(
    userId,
    today,
    progress,
    tx,
  );
  const streakStability = Math.min(currentStreak / 30, 1.0);

  const newLevel = computeLevel(
    fullyCompletedDays,
    consistencyRatio,
    streakStability,
    progress.current_level || 1,
    lifetimeTotal,
  );

  await userProgressModel.updateLevel(userId, newLevel, tx);

  return newLevel;
}

module.exports = { recalculateAndPersistLevel };
