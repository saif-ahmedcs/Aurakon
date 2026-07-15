const userProgressModel = require("../models/userProgressModel");
const guardianShieldLogModel = require("../models/guardianShieldLogModel");
const habitLogModel = require("../models/habitLogModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const bonusService = require("./bonusService");
const {
  isShieldMilestone,
  isShieldEligibleDifficulty,
} = require("../utils/guardianShieldRules");
const { calculateHabitStreaks } = require("../utils/streak");

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
    const { currentStreak } = calculateHabitStreaks(
      currentLogs,
      award.awarded_at,
    );

    if (currentStreak === award.milestone) {
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

        const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
        currentLogs = rawLogs.map((row) => ({
          date: row.log_date,
          status: row.status,
        }));
      }
    }

    await guardianShieldLogModel.deleteAward(habitId, award.milestone, tx);
    await recalculateShieldBalance(userId, tx);
  }
}

module.exports = {
  earnShieldIfEligible,
  spendShield,
  reconcileShieldsFromDate,
};
