const xpBonusLogModel = require("../models/xpBonusLogModel");
const xpService = require("../services/xpService");
const streakService = require("./streakService");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const { checkBonusEligibility } = require("../utils/consistencyBonusRules");
const { ConflictError } = require("../utils/AppErrors");

async function checkAndAwardConsistencyBonus(
  userId,
  consecutiveFullDays,
  milestoneDate,
  tx,
  requiredHabitCount,
) {
  const eligibility = checkBonusEligibility(consecutiveFullDays);
  const awardedAt = milestoneDate;
  const results = [];

  for (const bonusType of Object.keys(eligibility)) {
    if (!eligibility[bonusType]) continue;

    const alreadyAwarded = await xpBonusLogModel.hasBonusBeenAwarded(
      userId,
      bonusType,
      awardedAt,
      tx,
    );
    if (alreadyAwarded) continue;

    try {
      await xpBonusLogModel.insertBonusAward(
        userId,
        bonusType,
        awardedAt,
        requiredHabitCount,
        tx,
      );
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        continue;
      }
      throw err;
    }

    const result = await xpService.awardBonusXp(userId, bonusType, tx);
    results.push({ bonusType, ...result });
  }

  return results;
}

async function reconcileBonusesFromDate(userId, fromDate, tx) {
  const awards = await xpBonusLogModel.findAwardsFromDate(userId, fromDate, tx);

  for (const award of awards) {
    const streakAtDate = await streakService.getStreakAsOfDate(
      userId,
      award.awarded_at,
      tx,
      award.required_habit_count,
    );
    const eligibility = checkBonusEligibility(streakAtDate);

    if (!eligibility[award.bonus_type]) {
      const deleted = await xpBonusLogModel.deleteAward(
        userId,
        award.bonus_type,
        award.awarded_at,
        tx,
      );
      if (deleted > 0) {
        await xpService.reverseBonusXp(userId, award.bonus_type, tx);
      }
    }
  }

  const fullCompletionDates = await dailyAuraStatsModel.getFullCompletionDates(
    userId,
    tx,
  );

  const datesFromDate = fullCompletionDates
    .map((row) => row.stat_date)
    .filter((date) => date >= fromDate)
    .sort();

  for (const date of datesFromDate) {
    const streakAtDate = await streakService.getStreakAsOfDate(
      userId,
      date,
      tx,
    );
    const stats = await dailyAuraStatsModel.getByDate(userId, date, tx);
    await checkAndAwardConsistencyBonus(
      userId,
      streakAtDate,
      date,
      tx,
      stats.total_habits,
    );
  }
}

module.exports = { checkAndAwardConsistencyBonus, reconcileBonusesFromDate };
