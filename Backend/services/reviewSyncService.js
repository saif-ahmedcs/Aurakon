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
const {
  GRACE_PERIOD_DAYS,
  isSessionExpired,
} = require("../utils/pendingReviewSessionRules");
const { parseToUTCDay } = require("../utils/dateUtils");
const { calculateHabitStreaks } = require("../utils/streak");
const streakService = require("./streakService");

const inFlightByUser = new Map();

async function getLogsForHabitCached(habitId, tx, cache) {
  return streakService.getLogsForHabitCached(habitId, tx, cache);
}

function updateHabitLogCache(cache, habitId, date, status) {
  return streakService.updateHabitLogCache(cache, habitId, date, status);
}

async function markDayMissed(habit, date, tx, cache) {
  await habitLogModel.insertMissedLog(habit.id, date, tx);
  updateHabitLogCache(cache, habit.id, date, "missed");
}

async function finalizeDay(
  userId,
  date,
  tx,
  timezone,
  cache,
  affectedHabitIds,
) {
  const ids = affectedHabitIds || new Set();
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
      await markDayMissed(habit, date, tx, cache);
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

    const logs = await getLogsForHabitCached(habit.id, tx, cache);

    const dayBeforeGap = addUtcDays(date, -1);
    const { currentStreak } = calculateHabitStreaks(logs, dayBeforeGap);

    const existingSession = await pendingReviewSessionModel.findActiveByHabit(
      habit.id,
      tx,
    );

    if (currentStreak > 0 || existingSession) {
      const { affectedHabitIds: touchedIds } =
        await pendingReviewSessionService.addMissedDay(
          userId,
          habit.id,
          date,
          tx,
          timezone,
          cache,
        );
      for (const id of touchedIds) ids.add(id);
      if (
        existingSession &&
        isSessionExpired(existingSession.last_missed_date, parseToUTCDay(date))
      ) {
        if (cache && cache.habitLogs) {
          cache.habitLogs.delete(habit.id);
        }
      } else {
        updateHabitLogCache(cache, habit.id, date, "pending_review");
      }
      continue;
    }

    await markDayMissed(habit, date, tx, cache);
  }

  await dailyAuraStatsService.recalculateDailyAuraStats(
    userId,
    date,
    tx,
    timezone,
    cache,
  );

  return { affectedHabitIds: [...ids] };
}

async function hasPendingWork(userId, timezone) {
  const yesterday = getPreviousLocalDate(timezone);
  const [latestStatDate, earliestCreatedAt] = await Promise.all([
    dailyAuraStatsModel.getLatestStatDate(userId),
    habitModel.getEarliestCreatedAt(userId),
  ]);

  if (!earliestCreatedAt) return false;

  const earliestHabitDate = toLocalDateString(earliestCreatedAt, timezone);
  const nextDate = latestStatDate
    ? addUtcDays(latestStatDate, 1)
    : earliestHabitDate;

  if (nextDate <= yesterday) return true;

  const missingYesterday = await habitLogModel.getHabitsMissingLogForDate(
    userId,
    yesterday,
  );
  if (missingYesterday.length > 0) return true;

  const cutoffDate = addUtcDays(todayInTimezone(timezone), -GRACE_PERIOD_DAYS);
  return habitLogModel.hasStaleReviewsForUser(userId, cutoffDate);
}

async function evaluatePendingReviews(userId, timezone) {
  const existing = inFlightByUser.get(userId);
  if (existing) return existing;

  const promise = runEvaluatePendingReviews(userId, timezone).finally(() => {
    inFlightByUser.delete(userId);
  });
  inFlightByUser.set(userId, promise);
  return promise;
}

const CATCH_UP_BATCH_DAYS = 30;

async function runCatchUpBatch(userId, timezone, yesterday) {
  return runInTransaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);

    const [latestStatDate, earliestCreatedAt] = await Promise.all([
      dailyAuraStatsModel.getLatestStatDate(userId, tx),
      habitModel.getEarliestCreatedAt(userId, tx),
    ]);

    if (!earliestCreatedAt) {
      return {
        hasHabits: false,
        nextDate: null,
        didWork: false,
        affectedHabitIds: [],
      };
    }

    const earliestHabitDate = toLocalDateString(earliestCreatedAt, timezone);

    let date = latestStatDate
      ? addUtcDays(latestStatDate, 1)
      : earliestHabitDate;

    if (date > yesterday) {
      const missingYesterday = await habitLogModel.getHabitsMissingLogForDate(
        userId,
        yesterday,
        tx,
      );
      if (missingYesterday.length > 0) {
        date = yesterday;
      }
    }

    let didWork = false;
    const affectedHabitIds = new Set();
    const cache = streakService.createFullCompletionCache();
    for (let i = 0; i < CATCH_UP_BATCH_DAYS && date <= yesterday; i++) {
      await finalizeDay(userId, date, tx, timezone, cache, affectedHabitIds);
      didWork = true;
      date = addUtcDays(date, 1);
    }

    return {
      hasHabits: true,
      nextDate: date,
      didWork,
      affectedHabitIds: [...affectedHabitIds],
    };
  });
}

async function runEvaluatePendingReviews(userId, timezone) {
  if (!(await hasPendingWork(userId, timezone))) {
    return { affectedHabitIds: [] };
  }

  const yesterday = getPreviousLocalDate(timezone);
  let didWork = false;
  let nextDate;
  const affectedHabitIds = new Set();

  do {
    const batch = await runCatchUpBatch(userId, timezone, yesterday);
    if (!batch.hasHabits) {
      return { affectedHabitIds: [...affectedHabitIds] };
    }
    didWork = didWork || batch.didWork;
    nextDate = batch.nextDate;
    for (const id of batch.affectedHabitIds) affectedHabitIds.add(id);
  } while (nextDate <= yesterday);

  return runInTransaction(async (tx) => {
    await tx.query("SELECT id FROM users WHERE id = ? FOR UPDATE", [userId]);

    const cutoffDate = addUtcDays(
      todayInTimezone(timezone),
      -GRACE_PERIOD_DAYS,
    );
    const expiredReviews = await habitLogModel.expireStaleReviewsForUser(
      userId,
      cutoffDate,
      tx,
    );
    if (expiredReviews.length > 0) {
      didWork = true;
    }

    const earliestExpiredDateByHabit = new Map();
    for (const { habitId, logDate } of expiredReviews) {
      const current = earliestExpiredDateByHabit.get(habitId);
      if (!current || logDate < current) {
        earliestExpiredDateByHabit.set(habitId, logDate);
      }
      affectedHabitIds.add(habitId);
    }

    const cache = streakService.createFullCompletionCache();
    for (const [habitId, fromDate] of earliestExpiredDateByHabit) {
      const logs = await streakService.getLogsForHabitCached(
        habitId,
        tx,
        cache,
      );
      const { affectedHabitIds: crossIds } =
        await guardianShieldService.reconcileShieldsFromDate(
          userId,
          habitId,
          logs,
          fromDate,
          tx,
          timezone,
          cache,
        );
      for (const id of crossIds) affectedHabitIds.add(id);
    }

    if (didWork) {
      await levelService.recalculateAndPersistLevel(userId, tx, timezone);
    }

    return { affectedHabitIds: [...affectedHabitIds] };
  });
}

module.exports = { evaluatePendingReviews };
