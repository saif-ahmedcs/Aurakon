const { runInTransaction } = require("../db");
const habitModel = require("../models/habitModel");
const habitLogModel = require("../models/habitLogModel");
const reviewSyncService = require("./reviewSyncService");
const xpService = require("./xpService");
const auraEnergyService = require("./auraEnergyService");
const streakService = require("./streakService");
const bonusService = require("./bonusService");
const guardianShieldService = require("./guardianShieldService");
const { calculateStreaks } = require("../utils/streak");
const { ConflictError, NotFoundError } = require("../utils/AppErrors");

async function listHabitsWithPending(userId) {
  await reviewSyncService.evaluatePendingReviews(userId);
  const rows = await habitModel.findAllByUser(userId);
  const pendingRows = await habitLogModel.findPendingForUser(userId);
  const pendingByHabitId = new Map(
    pendingRows.map((row) => [row.habit_id, row]),
  );

  return rows.map((habit) => {
    const pending = pendingByHabitId.get(habit.id);
    return {
      ...habit,
      pendingReview: pending
        ? { missedDate: pending.missed_date, createdAt: pending.created_at }
        : null,
    };
  });
}

async function createHabit(title, userId, difficulty) {
  return habitModel.create(title, userId, difficulty);
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
  const { currentStreak, longestStreak } = calculateStreaks(logs, asOfDate);

  await reviewSyncService.evaluatePendingReviews(userId);
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
  const affectedRows = await habitModel.remove(habitId, userId);
  if (affectedRows === 0) {
    throw new NotFoundError("habit not found");
  }
}

async function logHabit(habitId, date, userId) {
  const { log, created } = await runInTransaction(async (tx) => {
    const pending = await habitLogModel.findPendingByHabitAndDate(
      habitId,
      date,
      userId,
      tx,
    );

    if (pending) {
      await habitLogModel.resolveDecision(pending.id, "recovered", tx);
      const resolvedLog = await habitLogModel.findById(pending.id, tx);
      return { log: resolvedLog, created: false };
    }

    try {
      const insertedLog = await habitLogModel.insertLog(habitId, date, tx);
      return { log: insertedLog, created: true };
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        throw new ConflictError("habit already logged for this date");
      }
      if (err.code === "ER_NO_REFERENCED_ROW_2") {
        throw new NotFoundError("habit not found");
      }
      throw err;
    }
  });

  const habit = await habitModel.findById(habitId, userId);

  const rawLogs = await habitLogModel.getLogsForHabit(habitId);
  const logs = rawLogs.map((row) => ({
    date: row.log_date,
    status: row.status,
  }));
  const { currentStreak: habitStreak } = calculateStreaks(logs, date);

  // (1)
  await xpService.awardCompletionXp(userId, habit.difficulty);

  // (2)
  await auraEnergyService.applyEnergyForCompletion(
    userId,
    habit.difficulty,
    date,
  );

  // (3)
  const isFullDay = await streakService.evaluateFullDayCompletion(userId, date);
  if (isFullDay) {
    const globalStreak = await streakService.updateGlobalStreak(userId, date);

    // (4)
    await bonusService.checkAndAwardConsistencyBonus(userId, globalStreak);
  }

  // (5)
  await guardianShieldService.earnShieldIfEligible(
    userId,
    habit.difficulty,
    habitStreak,
  );

  return { log, created };
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
  listLogs,
};
