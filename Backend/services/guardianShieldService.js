const userProgressModel = require("../models/userProgressModel");
const guardianShieldLogModel = require("../models/guardianShieldLogModel");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const dailyAuraStatsService = require("./dailyAuraStatsService");
const bonusService = require("./bonusService");
const streakService = require("./streakService");
const {
  isShieldMilestone,
  isShieldEligibleDifficulty,
} = require("../utils/guardianShieldRules");
const { calculateHabitStreaks, PRESENT_STATUSES } = require("../utils/streak");
const { todayInTimezone } = require("../utils/timezone");

async function recalculateShieldBalance(userId, tx) {
  const available = await guardianShieldLogModel.countAvailable(
    userId,
    tx,
    true,
  );
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
    !isShieldMilestone(consecutiveHabitDays, difficulty) ||
    !isShieldEligibleDifficulty(difficulty)
  ) {
    return false;
  }

  await habitModel.lockForShieldDeferral(habitId, tx);

  const stillPendingReview = await habitLogModel.findPendingByHabit(
    habitId,
    tx,
    true,
  );

  if (stillPendingReview) {
    await habitModel.recordShieldDeferral(habitId, awardedAt, tx);
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

async function reconcileShieldsFromDate(
  userId,
  habitId,
  logs,
  fromDate,
  tx,
  timezone,
  cache,
  affectedHabitIds,
  reversedBonusesAcc,
  reversedShieldsAcc,
  earnedBonusesAcc,
  earnedShieldsAcc,
) {
  const fullCompletionCache =
    cache || streakService.createFullCompletionCache();
  const crossHabitIds = affectedHabitIds || new Set();
  const reversedBonuses = reversedBonusesAcc || [];
  const reversedShields = reversedShieldsAcc || [];
  const earnedBonuses = earnedBonusesAcc || [];
  const earnedShields = earnedShieldsAcc || [];
  const habit = await habitModel.findById(habitId, userId, tx);
  if (!habit) {
    return {
      affectedHabitIds: [...crossHabitIds],
      reversedBonuses,
      reversedShields,
      earnedBonuses,
      earnedShields,
    };
  }

  const deferredSince = await habitModel.getShieldDeferredSince(habitId, tx);
  const effectiveFromDate =
    deferredSince && deferredSince < fromDate ? deferredSince : fromDate;

  const awards = await guardianShieldLogModel.findAwardsFromDate(
    habitId,
    fromDate,
    tx,
  );

  let currentLogs;
  if (
    fullCompletionCache.habitLogs &&
    fullCompletionCache.habitLogs.has(habitId)
  ) {
    currentLogs = fullCompletionCache.habitLogs.get(habitId);
  } else if (logs) {
    currentLogs = logs;
    if (fullCompletionCache.habitLogs) {
      fullCompletionCache.habitLogs.set(habitId, currentLogs);
    }
  } else {
    currentLogs = await streakService.getLogsForHabitCached(
      habitId,
      tx,
      fullCompletionCache,
    );
  }

  for (const award of awards) {
    const { currentStreak } = calculateHabitStreaks(
      currentLogs,
      award.awarded_at,
    );

    if (currentStreak >= award.milestone) {
      continue;
    }

    if (award.status === "spent") {
      const reverted = await habitLogModel.revertShieldedLog(
        award.spent_habit_log_id,
        tx,
      );

      if (reverted) {
        streakService.updateHabitLogCache(
          fullCompletionCache,
          reverted.habit_id,
          reverted.log_date,
          "missed",
        );

        const auraResult = await dailyAuraStatsService.recalculateDailyAuraStats(
          userId,
          reverted.log_date,
          tx,
          timezone,
          fullCompletionCache,
        );
        if (auraResult?.consistencyBonuses?.length) {
          earnedBonuses.push(...auraResult.consistencyBonuses);
        }
        const bonusReconcileResult = await bonusService.reconcileBonusesFromDate(
          userId,
          reverted.log_date,
          tx,
          fullCompletionCache,
        );
        if (bonusReconcileResult?.reversedBonuses?.length) {
          reversedBonuses.push(...bonusReconcileResult.reversedBonuses);
        }
        if (bonusReconcileResult?.earnedBonuses?.length) {
          earnedBonuses.push(...bonusReconcileResult.earnedBonuses);
        }

        if (reverted.habit_id !== habitId) {
          crossHabitIds.add(reverted.habit_id);
          const affectedLogs = await streakService.getLogsForHabitCached(
            reverted.habit_id,
            tx,
            fullCompletionCache,
          );
          await reconcileShieldsFromDate(
            userId,
            reverted.habit_id,
            affectedLogs,
            reverted.log_date,
            tx,
            timezone,
            fullCompletionCache,
            crossHabitIds,
            reversedBonuses,
            reversedShields,
            earnedBonuses,
            earnedShields,
          );
        }

        currentLogs = await streakService.getLogsForHabitCached(
          habitId,
          tx,
          fullCompletionCache,
        );
      }
    }

    await guardianShieldLogModel.deleteAward(award.id, award.status, tx);
    await recalculateShieldBalance(userId, tx);
    reversedShields.push({
      habitId,
      milestone: award.milestone,
      streakStartDate: award.streak_start_date,
      awardedAt: award.awarded_at,
      wasSpent: award.status === "spent",
    });
  }

  const asOfDate = todayInTimezone(timezone);
  const {
    currentStreak: finalCurrentStreak,
    longestStreak: finalLongestStreak,
  } = calculateHabitStreaks(currentLogs, asOfDate);
  await habitModel.updateStreaks(
    habitId,
    finalCurrentStreak,
    finalLongestStreak,
    tx,
  );
  const streakResult = {
    currentStreak: finalCurrentStreak,
    longestStreak: finalLongestStreak,
    affectedHabitIds: [...crossHabitIds],
    reversedBonuses,
    reversedShields,
    earnedBonuses,
    earnedShields,
  };

  if (!isShieldEligibleDifficulty(habit.difficulty)) {
    return streakResult;
  }

  const presentDatesFromDate = [
    ...new Set(
      currentLogs
        .filter(
          (log) =>
            PRESENT_STATUSES.has(log.status) && log.date >= effectiveFromDate,
        )
        .map((log) => log.date),
    ),
  ].sort();

  for (const date of presentDatesFromDate) {
    const { currentStreak, currentStreakStartDate } = calculateHabitStreaks(
      currentLogs,
      date,
    );
    if (isShieldMilestone(currentStreak, habit.difficulty)) {
      const earnedShield = await earnShieldIfEligible(
        userId,
        habitId,
        habit.difficulty,
        currentStreak,
        currentStreakStartDate,
        date,
        tx,
      );
      if (earnedShield) {
        earnedShields.push({
          habitId,
          milestone: currentStreak,
          streakStartDate: currentStreakStartDate,
          awardedAt: date,
        });
      }
    }
  }

  await habitModel.lockForShieldDeferral(habitId, tx);

  const stillPendingReview = await habitLogModel.findPendingByHabit(
    habitId,
    tx,
    true,
  );
  if (!stillPendingReview) {
    await habitModel.clearShieldDeferral(habitId, tx);
  }

  return streakResult;
}

module.exports = {
  earnShieldIfEligible,
  spendShield,
  reconcileShieldsFromDate,
};
