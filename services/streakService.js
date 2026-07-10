const habitLogModel = require("../models/habitLogModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const userProgressModel = require("../models/userProgressModel");
const { isFullDayCompletion } = require("../utils/streak");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseToUTCDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toDateOnly(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : date;
}

async function reconcileStaleStreak(userId, asOfDate) {
  const progress = await userProgressModel.getProgress(userId);
  const lastDate = progress.last_full_completion_date;

  if (!lastDate || progress.global_daily_streak === 0) {
    return progress.global_daily_streak;
  }

  const lastDay = parseToUTCDay(toDateOnly(lastDate));
  const today = parseToUTCDay(toDateOnly(asOfDate));
  const diffDays = (today - lastDay) / MS_PER_DAY;

  if (diffDays > 1) {
    await userProgressModel.updateGlobalDailyStreak(userId, 0);
    return 0;
  }

  return progress.global_daily_streak;
}

async function evaluateFullDayCompletion(userId, date) {
  const habitsForDay = await habitLogModel.getStatusesForUserAndDate(
    userId,
    date,
  );

  const isFull = isFullDayCompletion(habitsForDay);

  if (isFull) {
    await dailyAuraStatsModel.markFullCompletion(userId, date);
  }

  return isFull;
}

async function updateGlobalStreak(userId, date) {
  const progress = await userProgressModel.getProgress(userId);
  const lastDate = progress.last_full_completion_date;

  let newStreak;
  if (lastDate) {
    const lastDay = parseToUTCDay(toDateOnly(lastDate));
    const currentDay = parseToUTCDay(date);
    const diffDays = (currentDay - lastDay) / MS_PER_DAY;

    newStreak = diffDays === 1 ? progress.global_daily_streak + 1 : 1;
  } else {
    newStreak = 1;
  }

  await userProgressModel.updateGlobalDailyStreak(userId, newStreak);
  await userProgressModel.updateLastFullCompletionDate(userId, date);

  return newStreak;
}

module.exports = {
  evaluateFullDayCompletion,
  updateGlobalStreak,
  reconcileStaleStreak,
};
