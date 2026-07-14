const userProgressModel = require("../models/userProgressModel");
const guardianShieldLogModel = require("../models/guardianShieldLogModel");
const {
  isShieldMilestone,
  isShieldEligibleDifficulty,
} = require("../utils/guardianShieldRules");
const { calculateHabitStreaks } = require("../utils/streak");

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

  await userProgressModel.incrementShieldBalance(userId, tx);
  return true;
}

async function reconcileShieldsFromDate(userId, habitId, logs, fromDate, tx) {
  const awards = await guardianShieldLogModel.findAwardsFromDate(
    habitId,
    fromDate,
    tx,
  );

  for (const award of awards) {
    const { currentStreak } = calculateHabitStreaks(logs, award.awarded_at);

    if (currentStreak !== award.milestone) {
      await guardianShieldLogModel.deleteAward(habitId, award.milestone, tx);
      await userProgressModel.decrementShieldBalanceFloor(userId, tx);
    }
  }
}

module.exports = { earnShieldIfEligible, reconcileShieldsFromDate };
