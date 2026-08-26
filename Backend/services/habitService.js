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
const streakService = require("./streakService");
const { calculateHabitStreaks } = require("../utils/streak");
const {
  serializeHabit,
  serializePendingReviewGroup,
  serializeHabitLog,
} = require("../utils/habitSerializer");
const { getHabitLimit } = require("../utils/habitLimitRules");
const { todayInTimezone, toLocalDateString } = require("../utils/timezone");
const {
  ConflictError,
  NotFoundError,
  BadRequestError,
} = require("../utils/AppErrors");

async function attachPendingReviewAndSerialize(habitRow) {
  const pendingRows = await habitLogModel.findAllPendingByHabit(habitRow.id);
  return serializeHabit(habitRow, serializePendingReviewGroup(pendingRows));
}

async function recalculateStatsAndLevelForToday(userId, tx, timezone) {
  const today = todayInTimezone(timezone);
  await dailyAuraStatsService.recalculateDailyAuraStats(
    userId,
    today,
    tx,
    timezone,
  );
  await levelService.recalculateAndPersistLevel(userId, tx, timezone);
}

async function listHabitsWithPending(userId, timezone) {
  const rows = await habitModel.findAllByUser(userId);
  const pendingRows = await habitLogModel.findPendingForUser(userId);
  const pendingByHabitId = new Map();

  for (const row of pendingRows) {
    const list = pendingByHabitId.get(row.habit_id) || [];
    list.push(row);
    pendingByHabitId.set(row.habit_id, list);
  }

  return rows.map((habit) =>
    serializeHabit(
      habit,
      serializePendingReviewGroup(pendingByHabitId.get(habit.id)),
    ),
  );
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
    await recalculateStatsAndLevelForToday(userId, tx, timezone);
    return serializeHabit(habit, null);
  });
}

async function getHabitDetail(habit, userId, timezone) {
  return attachPendingReviewAndSerialize(habit);
}

async function updateHabit(habit, userId, title) {
  const updated =
    title === habit.title
      ? habit
      : await habitModel.update(habit.id, userId, title, habit.difficulty);

  return attachPendingReviewAndSerialize(updated);
}

async function deleteHabit(habitId, userId, timezone) {
  return runInTransaction(async (tx) => {
    await userProgressModel.getProgress(userId, tx, true);
    const affectedRows = await habitModel.archive(habitId, userId, tx);
    if (affectedRows === 0) {
      throw new NotFoundError("habit not found");
    }

    await habitLogModel.resolvePendingReviewsForHabit(habitId, tx);
    await pendingReviewSessionService.resolveSessionIfComplete(habitId, tx);

    await recalculateStatsAndLevelForToday(userId, tx, timezone);
  });
}

async function logHabit(habitId, date, userId, timezone) {
  return await runInTransaction(async (tx) => {
    await userProgressModel.getProgress(userId, tx, true);
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
    const fullCompletionCache = streakService.createFullCompletionCache();
    const logs = await streakService.getLogsForHabitCached(
      habitId,
      tx,
      fullCompletionCache,
    );
    const {
      currentStreak: habitStreak,
      longestStreak: habitLongestStreak,
      currentStreakStartDate: habitStreakStartDate,
    } = calculateHabitStreaks(logs, date);

    // (3)-(7)
    const rewardResult = await completionRewardService.awardCompletionRewards(
      userId,
      habit,
      date,
      tx,
      timezone,
      fullCompletionCache,
    );

    if (!created) {
      await bonusService.reconcileBonusesFromDate(
        userId,
        date,
        tx,
        fullCompletionCache,
      );
    }

    // (8)
    let shieldEarned = false;
    let newShieldBalance = null;
    let shieldBalanceBefore = null;

    const progressBefore = await userProgressModel.getProgress(
      userId,
      tx,
      true,
    );
    shieldBalanceBefore = progressBefore?.shield_balance ?? 0;

    if (created) {
      await habitModel.updateStreaks(
        habitId,
        habitStreak,
        habitLongestStreak,
        tx,
      );

      const stillPendingReview = await habitLogModel.findPendingByHabit(
        habitId,
        tx,
        true,
      );
      if (!stillPendingReview) {
        shieldEarned = await guardianShieldService.earnShieldIfEligible(
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
        fullCompletionCache,
      );
    }
    // (9)
    await levelService.recalculateAndPersistLevel(userId, tx, timezone);

    const progressAfter = await userProgressModel.getProgress(userId, tx, true);
    newShieldBalance = progressAfter?.shield_balance ?? 0;

    if (!shieldEarned && newShieldBalance > shieldBalanceBefore) {
      shieldEarned = true;
    }

    return {
      log: serializeHabitLog(log),
      created,
      shieldEarned,
      shieldBalance: newShieldBalance,
      consistencyBonuses: rewardResult.consistencyBonuses || [],
    };
  });
}

async function undoLog(habitId, date, userId, timezone) {
  return await runInTransaction(async (tx) => {
    await userProgressModel.getProgress(userId, tx, true);
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

    const fullCompletionCache = streakService.createFullCompletionCache();

    await xpService.reverseCompletionXp(userId, habit.id, date, tx);
    await dailyAuraStatsService.recalculateDailyAuraStats(
      userId,
      date,
      tx,
      timezone,
      fullCompletionCache,
    );
    await bonusService.reconcileBonusesFromDate(
      userId,
      date,
      tx,
      fullCompletionCache,
    );

    const logs = await streakService.getLogsForHabitCached(
      habitId,
      tx,
      fullCompletionCache,
    );
    await guardianShieldService.reconcileShieldsFromDate(
      userId,
      habitId,
      logs,
      date,
      tx,
      timezone,
      fullCompletionCache,
    );

    await levelService.recalculateAndPersistLevel(userId, tx, timezone);
  });
}

async function listLogs(habitId, userId) {
  const rows = await habitLogModel.findAllByHabit(habitId, userId);
  return rows.map(serializeHabitLog);
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
