const userProgressModel = require("../models/userProgressModel");
const guardianShieldLogModel = require("../models/guardianShieldLogModel");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const bonusService = require("./bonusService");
const {
  isShieldMilestone,
  isShieldEligibleDifficulty,
} = require("../utils/guardianShieldRules");
const { calculateHabitStreaks, PRESENT_STATUSES } = require("../utils/streak");

async function recalculateShieldBalance(userId, tx) {
  const available = await guardianShieldLogModel.countAvailable(userId, tx);
  await userProgressModel.setShieldBalance(userId, available, tx);
  return available;
}

async function earnShieldIfEligible(
  userId,
  habitId,
  difficulty,
  consecutiveHabitDays,
  streakStartDate,
  awardedAt,
  tx,
) {
  if (
    !isShieldMilestone(consecutiveHabitDays) ||
    !isShieldEligibleDifficulty(difficulty)
  ) {
    return false;
  }

  const alreadyAwarded = await guardianShieldLogModel.hasMilestoneBeenAwarded(
    habitId,
    consecutiveHabitDays,
    streakStartDate,
    tx,
  );
  if (alreadyAwarded) {
    return false;
  }

  try {
    await guardianShieldLogModel.insertAward(
      userId,
      habitId,
      consecutiveHabitDays,
      streakStartDate,
      awardedAt,
      tx,
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return false;
    }
    throw err;
  }

  await recalculateShieldBalance(userId, tx);
  return true;
}

async function spendShield(userId, habitLogId, tx) {
  const award = await guardianShieldLogModel.findOldestAvailableForUser(
    userId,
    tx,
  );
  if (!award) {
    return false;
  }

  await guardianShieldLogModel.markSpent(award.id, habitLogId, tx);
  await recalculateShieldBalance(userId, tx);
  return true;
}

async function reconcileShieldsFromDate(userId, habitId, logs, fromDate, tx) {
  const awards = await guardianShieldLogModel.findAwardsFromDate(
    habitId,
    fromDate,
    tx,
  );

  let currentLogs = logs;

  for (const award of awards) {
    const { currentStreak, currentStreakStartDate } = calculateHabitStreaks(
      currentLogs,
      award.awarded_at,
    );

    if (
      currentStreak === award.milestone &&
      currentStreakStartDate === award.streak_start_date
    ) {
      continue;
    }

    if (award.status === "spent") {
      const reverted = await habitLogModel.revertShieldedLog(
        award.spent_habit_log_id,
        tx,
      );

      if (reverted) {
        await dailyAuraStatsService.recalculateDailyAuraStats(
          userId,
          reverted.log_date,
          tx,
        );
        await bonusService.reconcileBonusesFromDate(
          userId,
          reverted.log_date,
          tx,
        );

        if (reverted.habit_id !== habitId) {
          const affectedRawLogs = await habitLogModel.getLogsForHabit(
            reverted.habit_id,
            tx,
          );
          const affectedLogs = affectedRawLogs.map((row) => ({
            date: row.log_date,
            status: row.status,
          }));
          await reconcileShieldsFromDate(
            userId,
            reverted.habit_id,
            affectedLogs,
            reverted.log_date,
            tx,
          );
        }

        const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
        currentLogs = rawLogs.map((row) => ({
          date: row.log_date,
          status: row.status,
        }));
      }
    }

    await guardianShieldLogModel.deleteAward(award.id, tx);
    await recalculateShieldBalance(userId, tx);
  }

  const habit = await habitModel.findById(habitId, userId, tx);
  if (!habit || !isShieldEligibleDifficulty(habit.difficulty)) {
    return;
  }

  const presentDatesFromDate = [
    ...new Set(
      currentLogs
        .filter(
          (log) => PRESENT_STATUSES.has(log.status) && log.date >= fromDate,
        )
        .map((log) => log.date),
    ),
  ].sort();

  for (const date of presentDatesFromDate) {
    const { currentStreak, currentStreakStartDate } = calculateHabitStreaks(
      currentLogs,
      date,
    );
    if (isShieldMilestone(currentStreak)) {
      await earnShieldIfEligible(
        userId,
        habitId,
        habit.difficulty,
        currentStreak,
        currentStreakStartDate,
        date,
        tx,
      );
    }
  }
}

module.exports = {
  earnShieldIfEligible,
  spendShield,
  reconcileShieldsFromDate,
};
