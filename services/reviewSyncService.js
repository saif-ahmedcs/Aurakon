const { runInTransaction } = require("../db");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const levelService = require("./levelService");
const { getPreviousUtcDate, addUtcDays } = require("../utils/reviewWindow");
const { calculateHabitStreaks } = require("../utils/streak");

async function finalizeDay(userId, date, tx) {
  const candidates = await habitLogModel.getHabitsMissingLogForDate(
    userId,
    date,
    tx,
  );

  for (const habit of candidates) {
    const rawLogs = await habitLogModel.getLogsForHabit(habit.id, tx);
    const logs = rawLogs.map((log) => ({
      date: log.log_date,
      status: log.status,
    }));

    const dayBeforeGap = addUtcDays(date, -1);
    const { currentStreak } = calculateHabitStreaks(logs, dayBeforeGap);

    if (currentStreak > 0) {
      await habitLogModel.insertPendingReview(habit.id, date, tx);
    }
  }

  await dailyAuraStatsService.recalculateDailyAuraStats(userId, date, tx);
}

async function evaluatePendingReviews(userId) {
  return runInTransaction(async (tx) => {
    await habitLogModel.expireStaleReviewsForUser(userId, tx);

    const yesterday = getPreviousUtcDate();
    const [latestStatDate, earliestHabitDate] = await Promise.all([
      dailyAuraStatsModel.getLatestStatDate(userId, tx),
      habitModel.getEarliestCreatedDate(userId, tx),
    ]);

    if (!earliestHabitDate) {
      return;
    }

    let date = latestStatDate
      ? addUtcDays(latestStatDate, 1)
      : earliestHabitDate;

    while (date <= yesterday) {
      await finalizeDay(userId, date, tx);
      date = addUtcDays(date, 1);
    }
    await levelService.recalculateAndPersistLevel(userId, tx);
  });
}

module.exports = { evaluatePendingReviews };
