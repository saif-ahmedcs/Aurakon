/**
 * Tracks the user's global daily streak.
 *
 * The streak only continues when every habit is completed each day.
 * Missing a day resets it.
 *
 * This is separate from the per-habit streak in utils/streak.js and
 * is used for consistency bonuses.
 */

const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const {
  MS_PER_DAY,
  parseToUTCDay,
  formatUTCDay,
} = require("../utils/dateUtils");

function toDateOnly(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : date;
}

async function reconcileStaleStreak(userId, asOfDate, prefetchedProgress, tx) {
  const progress =
    prefetchedProgress || (await userProgressModel.getProgress(userId, tx));
  const lastDate = progress.last_full_completion_date;

  if (!lastDate || progress.global_daily_streak === 0) {
    return progress.global_daily_streak;
  }

  const lastDay = parseToUTCDay(toDateOnly(lastDate));
  const today = parseToUTCDay(toDateOnly(asOfDate));
  const diffDays = (today - lastDay) / MS_PER_DAY;

  if (diffDays > 1) {
    await userProgressModel.updateGlobalDailyStreak(userId, 0, tx);
    progress.global_daily_streak = 0;
    return 0;
  }

  return progress.global_daily_streak;
}

async function recalculateGlobalStreak(userId, tx) {
  const rows = await dailyAuraStatsModel.getFullCompletionDates(userId, tx);
  const trueDays = [
    ...new Set(rows.map((row) => parseToUTCDay(toDateOnly(row.stat_date)))),
  ].sort((a, b) => a - b);

  if (trueDays.length === 0) {
    await userProgressModel.updateGlobalDailyStreak(userId, 0, tx);
    return 0;
  }

  let runLength = 1;
  for (let i = 1; i < trueDays.length; i++) {
    if (trueDays[i] - trueDays[i - 1] === MS_PER_DAY) {
      runLength += 1;
    } else {
      runLength = 1;
    }
  }

  const lastDay = trueDays[trueDays.length - 1];
  const lastDateString = formatUTCDay(lastDay);

  await userProgressModel.updateGlobalDailyStreak(userId, runLength, tx);
  await userProgressModel.updateLastFullCompletionDate(
    userId,
    lastDateString,
    tx,
  );

  return runLength;
}

module.exports = {
  recalculateGlobalStreak,
  reconcileStaleStreak,
};
