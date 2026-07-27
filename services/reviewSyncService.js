const { runInTransaction } = require("../db");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const levelService = require("./levelService");
const pendingReviewSessionService = require("./pendingReviewSessionService");
const pendingReviewSessionModel = require("../models/pendingReviewSessionModel");
const guardianShieldService = require("./guardianShieldService");
const { getPreviousLocalDate, addUtcDays } = require("../utils/reviewWindow");
const {
  todayInTimezone,
  toLocalDateString,
  isActiveOnLocalDate,
} = require("../utils/timezone");
const { GRACE_PERIOD_DAYS } = require("../utils/pendingReviewSessionRules");
const { calculateHabitStreaks } = require("../utils/streak");

async function finalizeDay(userId, date, tx, timezone) {
  const allCandidates = await habitLogModel.getHabitsMissingLogForDate(
    userId,
    date,
    tx,
  );
  const candidates = allCandidates.filter((habit) =>
    isActiveOnLocalDate(habit.created_at, habit.archived_at, date, timezone),
  );

  for (const habit of candidates) {
    if (habit.archived_at) {
      await habitLogModel.insertMissedLog(habit.id, date, tx);
      continue;
    }

    const existingLog = await habitLogModel.findByHabitAndDate(
      habit.id,
      date,
      tx,
    );

    if (existingLog) {
      continue;
    }

    const rawLogs = await habitLogModel.getLogsForHabit(habit.id, tx);
    const logs = rawLogs.map((log) => ({
      date: log.log_date,
      status: log.status,
    }));

    const dayBeforeGap = addUtcDays(date, -1);
    const { currentStreak } = calculateHabitStreaks(logs, dayBeforeGap);

    const existingSession = await pendingReviewSessionModel.findActiveByHabit(
      habit.id,
      tx,
    );

    if (currentStreak > 0 || existingSession) {
      await pendingReviewSessionService.addMissedDay(
        userId,
        habit.id,
        date,
        tx,
        timezone,
      );
      continue;
    }

    await habitLogModel.insertMissedLog(habit.id, date, tx);
  }

  await dailyAuraStatsService.recalculateDailyAuraStats(
    userId,
    date,
    tx,
    timezone,
  );
}

async function evaluatePendingReviews(userId, timezone) {
  return runInTransaction(async (tx) => {
    const yesterday = getPreviousLocalDate(timezone);
    const [latestStatDate, earliestCreatedAt] = await Promise.all([
      dailyAuraStatsModel.getLatestStatDate(userId, tx),
      habitModel.getEarliestCreatedAt(userId, tx),
    ]);

    if (!earliestCreatedAt) {
      return;
    }

    const earliestHabitDate = toLocalDateString(earliestCreatedAt, timezone);

    let date = latestStatDate
      ? addUtcDays(latestStatDate, 1)
      : earliestHabitDate;

    while (date <= yesterday) {
      await finalizeDay(userId, date, tx, timezone);
      date = addUtcDays(date, 1);
    }

    const cutoffDate = addUtcDays(
      todayInTimezone(timezone),
      -GRACE_PERIOD_DAYS,
    );
    const expiredReviews = await habitLogModel.expireStaleReviewsForUser(
      userId,
      cutoffDate,
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
        timezone,
      );
    }

    await levelService.recalculateAndPersistLevel(userId, tx, timezone);
  });
}

module.exports = { evaluatePendingReviews };
