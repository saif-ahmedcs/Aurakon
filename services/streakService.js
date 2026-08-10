const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const habitLogModel = require("../models/habitLogModel");
const {
  MS_PER_DAY,
  parseToUTCDay,
  formatUTCDay,
} = require("../utils/dateUtils");

async function reconcileStaleStreak(userId, asOfDate, prefetchedProgress, tx) {
  const progress =
    prefetchedProgress || (await userProgressModel.getProgress(userId, tx));
  const lastDate = progress.last_full_completion_date;

  if (!lastDate || progress.global_daily_streak === 0) {
    return progress.global_daily_streak;
  }

  const lastDay = parseToUTCDay(lastDate);
  const today = parseToUTCDay(asOfDate);
  const diffDays = (today - lastDay) / MS_PER_DAY;

  if (diffDays > 1) {
    const wasReset = await userProgressModel.resetStaleGlobalStreak(
      userId,
      asOfDate,
      tx,
    );
    if (wasReset) {
      progress.global_daily_streak = 0;
      return 0;
    }

    const fresh = await userProgressModel.getProgress(userId, tx);
    return fresh ? fresh.global_daily_streak : 0;
  }

  return progress.global_daily_streak;
}

function createFullCompletionCache() {
  return { dates: null };
}

async function loadFullCompletionCache(userId, tx, cache) {
  if (!cache.dates) {
    const rows = await dailyAuraStatsModel.getFullCompletionDates(userId, tx);
    cache.dates = new Set(rows.map((row) => row.stat_date));
  }
  return cache.dates;
}

function updateFullCompletionCache(cache, date, fullCompletion) {
  if (!cache || !cache.dates) return;
  if (fullCompletion) {
    cache.dates.add(date);
  } else {
    cache.dates.delete(date);
  }
}

async function recalculateGlobalStreak(userId, tx, cache) {
  const dateStrings = cache
    ? [...(await loadFullCompletionCache(userId, tx, cache))]
    : (await dailyAuraStatsModel.getFullCompletionDates(userId, tx)).map(
        (row) => row.stat_date,
      );
  const trueDays = [...new Set(dateStrings.map(parseToUTCDay))].sort(
    (a, b) => a - b,
  );

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

async function getStreakAsOfDate(
  userId,
  date,
  tx,
  requiredHabitCount = null,
  cache,
) {
  const targetDay = parseToUTCDay(date);
  let trueDaySet;

  if (cache) {
    const dateStrings = await loadFullCompletionCache(userId, tx, cache);
    trueDaySet = new Set(
      [...dateStrings].map(parseToUTCDay).filter((d) => d <= targetDay),
    );
  } else {
    const rows = await dailyAuraStatsModel.getFullCompletionDatesUpTo(
      userId,
      date,
      tx,
    );
    trueDaySet = new Set(rows.map((row) => parseToUTCDay(row.stat_date)));
  }

  if (!trueDaySet.has(targetDay) && requiredHabitCount !== null) {
    const presentCount = await habitLogModel.countPresentStatusesForDate(
      userId,
      date,
      tx,
    );
    if (presentCount >= requiredHabitCount) {
      trueDaySet.add(targetDay);
    }
  }

  if (!trueDaySet.has(targetDay)) return 0;

  const trueDays = [...trueDaySet].sort((a, b) => a - b);
  let runLength = 1;
  for (let i = trueDays.length - 1; i > 0; i--) {
    if (trueDays[i] - trueDays[i - 1] === MS_PER_DAY) {
      runLength += 1;
    } else {
      break;
    }
  }
  return runLength;
}

module.exports = {
  recalculateGlobalStreak,
  reconcileStaleStreak,
  getStreakAsOfDate,
  createFullCompletionCache,
  updateFullCompletionCache,
};
