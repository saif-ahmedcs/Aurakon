const userProgressModel = require("../models/userProgressModel");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseToUTCDay(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

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

async function updateGlobalStreak(userId, date, tx) {
  const progress = await userProgressModel.getProgress(userId, tx);
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

  await userProgressModel.updateGlobalDailyStreak(userId, newStreak, tx);
  await userProgressModel.updateLastFullCompletionDate(userId, date, tx);

  return newStreak;
}

module.exports = {
  updateGlobalStreak,
  reconcileStaleStreak,
};
