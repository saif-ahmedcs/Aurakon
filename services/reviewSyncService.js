const { runInTransaction } = require("../db");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const levelService = require("./levelService");
const pendingReviewSessionService = require("./pendingReviewSessionService");
const pendingReviewSessionModel = require("../models/pendingReviewSessionModel");
const guardianShieldService = require("./guardianShieldService");
const { getPreviousUtcDate, addUtcDays } = require("../utils/reviewWindow");
const { calculateHabitStreaks } = require("../utils/streak");

async function finalizeDay(userId, date, tx) {
  const candidates = await habitLogModel.getHabitsMissingLogForDate(
    userId,
    date,
    tx,
  );

  for (const habit of candidates) {
    const existingSession = await pendingReviewSessionModel.findActiveByHabit(
      habit.id,
      tx,
    );

    if (existingSession) {
      await pendingReviewSessionService.addMissedDay(
        userId,
        habit.id,
        date,
        tx,
      );
      continue;
    }

    const rawLogs = await habitLogModel.getLogsForHabit(habit.id, tx);
    const logs = rawLogs.map((log) => ({
      date: log.log_date,
      status: log.status,
    }));

    const dayBeforeGap = addUtcDays(date, -1);
    const { currentStreak } = calculateHabitStreaks(logs, dayBeforeGap);

    if (currentStreak > 0) {
      await pendingReviewSessionService.addMissedDay(
        userId,
        habit.id,
        date,
        tx,
      );
    } else {
      await habitLogModel.insertMissedLog(habit.id, date, tx);
    }
  }

  await dailyAuraStatsService.recalculateDailyAuraStats(userId, date, tx);
}

async function evaluatePendingReviews(userId) {
  return runInTransaction(async (tx) => {
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

    const expiredReviews = await habitLogModel.expireStaleReviewsForUser(
      userId,
      tx,
    );

    const earliestExpiredDateByHabit = new Map();
    for (const { habitId, logDate } of expiredReviews) {
      const current = earliestExpiredDateByHabit.get(habitId);
      if (!current || logDate < current) {
        earliestExpiredDateByHabit.set(habitId, logDate);
      }
    }

    for (const [habitId, fromDate] of earliestExpiredDateByHabit) {
      const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
      const logs = rawLogs.map((row) => ({
        date: row.log_date,
        status: row.status,
      }));
      await guardianShieldService.reconcileShieldsFromDate(
        userId,
        habitId,
        logs,
        fromDate,
        tx,
      );
    }

    await levelService.recalculateAndPersistLevel(userId, tx);
  });
}

module.exports = { evaluatePendingReviews };
