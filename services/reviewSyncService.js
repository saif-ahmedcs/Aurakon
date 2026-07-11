const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const { getPreviousUtcDate, addUtcDays } = require("../utils/reviewWindow");
const { calculateStreaks } = require("../utils/streak");

async function finalizeDay(userId, date) {
  const candidates = await habitLogModel.getHabitsMissingLogForDate(
    userId,
    date,
  );

  for (const habit of candidates) {
    const rawLogs = await habitLogModel.getLogsForHabit(habit.id);
    const logs = rawLogs.map((log) => ({
      date: log.log_date,
      status: log.status,
    }));

    const dayBeforeGap = addUtcDays(date, -1);
    const { currentStreak } = calculateStreaks(logs, dayBeforeGap);

    if (currentStreak > 0) {
      await habitLogModel.insertPendingReview(habit.id, date);
    }
  }

  await dailyAuraStatsService.recalculateDailyAuraStats(userId, date);
}

async function evaluatePendingReviews(userId) {
  await habitLogModel.expireStaleReviewsForUser(userId);

  const yesterday = getPreviousUtcDate();
  const [latestStatDate, earliestHabitDate] = await Promise.all([
    dailyAuraStatsModel.getLatestStatDate(userId),
    habitModel.getEarliestCreatedDate(userId),
  ]);

  if (!earliestHabitDate) {
    return;
  }

  let date = latestStatDate ? addUtcDays(latestStatDate, 1) : earliestHabitDate;

  while (date <= yesterday) {
    await finalizeDay(userId, date);
    date = addUtcDays(date, 1);
  }
}

module.exports = { evaluatePendingReviews };
