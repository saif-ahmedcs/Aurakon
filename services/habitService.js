const { runInTransaction } = require("../db");
const habitModel = require("../models/habitModel");
const habitLogModel = require("../models/habitLogModel");
const levelService = require("./levelService");
const xpService = require("./xpService");
const completionRewardService = require("./completionRewardService");
const bonusService = require("./bonusService");
const guardianShieldService = require("./guardianShieldService");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const pendingReviewSessionService = require("./pendingReviewSessionService");
const userProgressModel = require("../models/userProgressModel");
const { calculateHabitStreaks } = require("../utils/streak");
const { getHabitLimit } = require("../utils/habitLimitRules");
const { todayInTimezone, toLocalDateString } = require("../utils/timezone");
const {
  ConflictError,
  NotFoundError,
  BadRequestError,
} = require("../utils/AppErrors");

async function listHabitsWithPending(userId, timezone) {
  const rows = await habitModel.findAllByUser(userId);
  const pendingRows = await habitLogModel.findPendingForUser(userId);
  const pendingByHabitId = new Map();

  for (const row of pendingRows) {
    const list = pendingByHabitId.get(row.habit_id) || [];
    list.push({ missedDate: row.missed_date, createdAt: row.created_at });
    pendingByHabitId.set(row.habit_id, list);
  }

  const asOfDate = todayInTimezone(timezone);

  const allLogRows = await habitLogModel.getLogsForHabits(
    rows.map((habit) => habit.id),
  );
  const logsByHabitId = new Map();
  for (const row of allLogRows) {
    const list = logsByHabitId.get(row.habit_id) || [];
    list.push({ date: row.log_date, status: row.status });
    logsByHabitId.set(row.habit_id, list);
  }

  return rows.map((habit) => {
    const logs = logsByHabitId.get(habit.id) || [];
    const { currentStreak, longestStreak } = calculateHabitStreaks(
      logs,
      asOfDate,
    );

    return {
      ...habit,
      currentStreak,
      longestStreak,
      pendingReviews: pendingByHabitId.get(habit.id) || [],
    };
  });
}

async function createHabit(title, userId, difficulty, timezone) {
  return runInTransaction(async (tx) => {
    const progress = await userProgressModel.getProgress(userId, tx, true);
    const currentCount = await habitModel.countByUser(userId, tx);
    const limit = getHabitLimit(progress.current_level);
    if (currentCount >= limit) {
      throw new ConflictError("Habit limit reached for your current level.");
    }

    const habit = await habitModel.create(title, userId, difficulty, tx);
    const today = todayInTimezone(timezone);
    await dailyAuraStatsService.recalculateDailyAuraStats(
      userId,
      today,
      tx,
      timezone,
    );
    await levelService.recalculateAndPersistLevel(userId, tx, timezone);
    return habit;
  });
}

async function getHabitDetail(habitId, userId, timezone) {
  const habit = await habitModel.findById(habitId, userId);
  if (!habit) {
    throw new NotFoundError("habit not found");
  }

  const logRows = await habitLogModel.getLogsForHabit(habit.id);
  const logs = logRows.map((row) => ({
    date: row.log_date,
    status: row.status,
  }));

  const asOfDate = todayInTimezone(timezone);
  const { currentStreak, longestStreak } = calculateHabitStreaks(
    logs,
    asOfDate,
  );
  const pendingRows = await habitLogModel.findAllPendingByHabit(habit.id);
  const pendingReview = pendingRows.length
    ? {
        sessionId: pendingRows[0].review_session_id,
        missedDates: pendingRows.map((row) => row.missed_date),
        createdAt: pendingRows[0].created_at,
      }
    : null;

  return {
    ...habit,
    currentStreak,
    longestStreak,
    pendingReview,
  };
}

async function updateHabit(habitId, userId, title) {
  const habit = await habitModel.findById(habitId, userId);
  if (!habit) {
    throw new NotFoundError("habit not found");
  }

  if (title === habit.title) {
    return habit;
  }

  return habitModel.update(habit.id, title, habit.difficulty);
}

async function deleteHabit(habitId, userId, timezone) {
  return runInTransaction(async (tx) => {
    const affectedRows = await habitModel.archive(habitId, userId, tx);
    if (affectedRows === 0) {
      throw new NotFoundError("habit not found");
    }

    await habitLogModel.resolvePendingReviewsForHabit(habitId, tx);
    await pendingReviewSessionService.resolveSessionIfComplete(habitId, tx);

    const today = todayInTimezone(timezone);
    await dailyAuraStatsService.recalculateDailyAuraStats(
      userId,
      today,
      tx,
      timezone,
    );
    await levelService.recalculateAndPersistLevel(userId, tx, timezone);
  });
}

async function logHabit(habitId, date, userId, timezone) {
  return await runInTransaction(async (tx) => {
    let log;
    let created;

    const habit = await habitModel.findById(habitId, userId, tx);
    if (!habit) {
      throw new NotFoundError("habit not found");
    }
    const habitCreatedLocalDate = toLocalDateString(habit.created_at, timezone);
    if (date < habitCreatedLocalDate) {
      throw new BadRequestError(
        "log date cannot be before the habit's creation date",
      );
    }

    // (1)
    const pending = await habitLogModel.findPendingByHabitAndDate(
      habitId,
      date,
      userId,
      tx,
    );

    if (pending) {
      await habitLogModel.resolveDecision(pending.id, "recovered", tx);
      await pendingReviewSessionService.resolveSessionIfComplete(habitId, tx);
      log = await habitLogModel.findById(pending.id, tx);
      created = false;
    } else {
      const today = todayInTimezone(timezone);
      if (date !== today) {
        throw new ConflictError(
          "This date is outside the loggable window. Missed days must be recovered through the pending review system before their review window expires.",
        );
      }
      try {
        log = await habitLogModel.insertLog(habitId, date, tx);
        created = true;
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          throw new ConflictError("habit already logged for this date");
        }
        if (err.code === "ER_NO_REFERENCED_ROW_2") {
          throw new NotFoundError("habit not found");
        }
        throw err;
      }
    }

    // (2)
    const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
    const logs = rawLogs.map((row) => ({
      date: row.log_date,
      status: row.status,
    }));
    const {
      currentStreak: habitStreak,
      currentStreakStartDate: habitStreakStartDate,
    } = calculateHabitStreaks(logs, date);

    // (3)-(7)
    await completionRewardService.awardCompletionRewards(
      userId,
      habit,
      date,
      tx,
      timezone,
    );

    if (!created) {
      await bonusService.reconcileBonusesFromDate(userId, date, tx);
    }

    // (8)
    if (created) {
      const stillPendingReview = await habitLogModel.findPendingByHabit(
        habitId,
        tx,
      );
      if (!stillPendingReview) {
        await guardianShieldService.earnShieldIfEligible(
          userId,
          habitId,
          habit.difficulty,
          habitStreak,
          habitStreakStartDate,
          date,
          tx,
        );
      }
    } else {
      await guardianShieldService.reconcileShieldsFromDate(
        userId,
        habitId,
        logs,
        date,
        tx,
        timezone,
      );
    }
    // (9)
    await levelService.recalculateAndPersistLevel(userId, tx, timezone);

    return { log, created };
  });
}

async function undoLog(habitId, date, userId, timezone) {
  return await runInTransaction(async (tx) => {
    const habit = await habitModel.findById(habitId, userId, tx);
    if (!habit) {
      throw new NotFoundError("habit not found");
    }

    const today = todayInTimezone(timezone);
    if (date !== today) {
      throw new ConflictError(
        "Only today's log can be undone. Past dates must be handled through the pending review system.",
      );
    }

    const log = await habitLogModel.findByHabitAndDate(habitId, date, tx);
    if (!log || log.status !== "completed") {
      throw new ConflictError("only completed logs can be undone");
    }

    const affectedRows = await habitLogModel.deleteCompletedLog(log.id, tx);
    if (affectedRows === 0) {
      throw new ConflictError("only completed logs can be undone");
    }

    await xpService.reverseCompletionXp(userId, habit.id, date, tx);
    await dailyAuraStatsService.recalculateDailyAuraStats(
      userId,
      date,
      tx,
      timezone,
    );
    await bonusService.reconcileBonusesFromDate(userId, date, tx);

    const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
    const logs = rawLogs.map((row) => ({
      date: row.log_date,
      status: row.status,
    }));
    await guardianShieldService.reconcileShieldsFromDate(
      userId,
      habitId,
      logs,
      date,
      tx,
      timezone,
    );

    await levelService.recalculateAndPersistLevel(userId, tx, timezone);
  });
}

async function listLogs(habitId, userId) {
  return habitLogModel.findAllByHabit(habitId, userId);
}

module.exports = {
  listHabitsWithPending,
  createHabit,
  getHabitDetail,
  updateHabit,
  deleteHabit,
  logHabit,
  undoLog,
  listLogs,
};
