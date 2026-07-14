const { runInTransaction } = require("../db");
const habitModel = require("../models/habitModel");
const habitLogModel = require("../models/habitLogModel");
const levelService = require("./levelService");
const xpService = require("./xpService");
const completionRewardService = require("./completionRewardService");
const guardianShieldService = require("./guardianShieldService");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const { calculateHabitStreaks } = require("../utils/streak");
const { ConflictError, NotFoundError } = require("../utils/AppErrors");

async function listHabitsWithPending(userId) {
  const rows = await habitModel.findAllByUser(userId);
  const pendingRows = await habitLogModel.findPendingForUser(userId);
  const pendingByHabitId = new Map();

  for (const row of pendingRows) {
    const list = pendingByHabitId.get(row.habit_id) || [];
    list.push({ missedDate: row.missed_date, createdAt: row.created_at });
    pendingByHabitId.set(row.habit_id, list);
  }

  return rows.map((habit) => ({
    ...habit,
    pendingReviews: pendingByHabitId.get(habit.id) || [],
  }));
}

async function createHabit(title, userId, difficulty) {
  return runInTransaction(async (tx) => {
    const habit = await habitModel.create(title, userId, difficulty, tx);
    const today = new Date().toISOString().slice(0, 10);
    await dailyAuraStatsService.recalculateDailyAuraStats(userId, today, tx);
    await levelService.recalculateAndPersistLevel(userId, tx);
    return habit;
  });
}

async function getHabitDetail(habitId, userId) {
  const habit = await habitModel.findById(habitId, userId);
  if (!habit) {
    throw new NotFoundError("habit not found");
  }

  const logRows = await habitLogModel.getLogsForHabit(habit.id);
  const logs = logRows.map((row) => ({
    date: row.log_date,
    status: row.status,
  }));

  const asOfDate = new Date().toISOString().slice(0, 10);
  const { currentStreak, longestStreak } = calculateHabitStreaks(
    logs,
    asOfDate,
  );
  const pending = await habitLogModel.findPendingByHabit(habit.id);
  const pendingReview = pending
    ? { missedDate: pending.missed_date, createdAt: pending.created_at }
    : null;

  return {
    ...habit,
    currentStreak,
    longestStreak,
    pendingReview,
  };
}

async function updateHabit(habitId, userId, title, target_days) {
  const habit = await habitModel.findById(habitId, userId);
  if (!habit) {
    throw new NotFoundError("habit not found");
  }

  const updatedTitle = title !== undefined ? title : habit.title;
  const updatedTargetDays =
    target_days !== undefined ? target_days : habit.target_days;

  const isNoOp =
    updatedTitle === habit.title && updatedTargetDays === habit.target_days;

  if (isNoOp) {
    return habit;
  }

  return habitModel.update(
    habit.id,
    updatedTitle,
    updatedTargetDays,
    habit.difficulty,
  );
}

async function deleteHabit(habitId, userId) {
  return runInTransaction(async (tx) => {
    const affectedRows = await habitModel.archive(habitId, userId, tx);
    if (affectedRows === 0) {
      throw new NotFoundError("habit not found");
    }

    await habitLogModel.resolvePendingReviewsForHabit(habitId, tx);

    const today = new Date().toISOString().slice(0, 10);
    await dailyAuraStatsService.recalculateDailyAuraStats(userId, today, tx);
    await levelService.recalculateAndPersistLevel(userId, tx);
  });
}

async function logHabit(habitId, date, userId) {
  return await runInTransaction(async (tx) => {
    let log;
    let created;

    // (1)
    const pending = await habitLogModel.findPendingByHabitAndDate(
      habitId,
      date,
      userId,
      tx,
    );

    if (pending) {
      await habitLogModel.resolveDecision(pending.id, "recovered", tx);
      log = await habitLogModel.findById(pending.id, tx);
      created = false;
    } else {
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
    const habit = await habitModel.findById(habitId, userId, tx);

    const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
    const logs = rawLogs.map((row) => ({
      date: row.log_date,
      status: row.status,
    }));
    const { currentStreak: habitStreak } = calculateHabitStreaks(logs, date);

    // (3)-(7): award XP, Aura Energy, and if the day is now fully
    // complete — advance the global streak and check consistency bonuses
    await completionRewardService.awardCompletionRewards(
      userId,
      habit,
      date,
      tx,
    );

    // (8)
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
        date,
        tx,
      );
    }
    // (9)
    await levelService.recalculateAndPersistLevel(userId, tx);

    return { log, created };
  });
}

async function undoLog(habitId, date, userId) {
  return await runInTransaction(async (tx) => {
    const habit = await habitModel.findById(habitId, userId, tx);
    if (!habit) {
      throw new NotFoundError("habit not found");
    }

    const log = await habitLogModel.findByHabitAndDate(habitId, date, tx);
    if (!log || log.status !== "completed") {
      throw new ConflictError("only completed logs can be undone");
    }

    const affectedRows = await habitLogModel.deleteCompletedLog(log.id, tx);
    if (affectedRows === 0) {
      throw new ConflictError("only completed logs can be undone");
    }

    await xpService.reverseCompletionXp(userId, habit.difficulty, tx);
    await dailyAuraStatsService.recalculateDailyAuraStats(userId, date, tx);
    await levelService.recalculateAndPersistLevel(userId, tx);
  });
}

async function listLogs(habitId) {
  return habitLogModel.findAllByHabit(habitId);
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
