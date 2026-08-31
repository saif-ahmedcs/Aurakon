const xpBonusLogModel = require("../models/xpBonusLogModel");
const xpService = require("../services/xpService");
const streakService = require("./streakService");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const { checkBonusEligibility } = require("../utils/consistencyBonusRules");

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

async function reconcileBonusesFromDate(userId, fromDate, tx, cache) {
  const awards = await xpBonusLogModel.findAwardsFromDate(userId, fromDate, tx);
  const reversedBonuses = [];
  const earnedBonuses = [];

  for (const award of awards) {
    const streakAtDate = await streakService.getStreakAsOfDate(
      userId,
      award.awarded_at,
      tx,
      award.required_habit_count,
      cache,
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
        const result = await xpService.reverseBonusXp(
          userId,
          award.bonus_type,
          tx,
        );
        reversedBonuses.push({
          bonusType: award.bonus_type,
          awardedAt: award.awarded_at,
          ...result,
        });
      }
    }
  }

  let dateStrings;
  if (cache) {
    if (!cache.dates) {
      const rows = await dailyAuraStatsModel.getFullCompletionDates(userId, tx);
      cache.dates = new Set(rows.map((row) => row.stat_date));
    }
    dateStrings = [...cache.dates];
  } else {
    dateStrings = (
      await dailyAuraStatsModel.getFullCompletionDates(userId, tx)
    ).map((row) => row.stat_date);
  }

  const datesFromDate = dateStrings.filter((date) => date >= fromDate).sort();

  for (const date of datesFromDate) {
    const streakAtDate = await streakService.getStreakAsOfDate(
      userId,
      date,
      tx,
      null,
      cache,
    );
    const stats = await dailyAuraStatsModel.getByDate(userId, date, tx);
    const newBonuses = await checkAndAwardConsistencyBonus(
      userId,
      streakAtDate,
      date,
      tx,
      stats.total_habits,
    );
    if (newBonuses.length > 0) {
      earnedBonuses.push(...newBonuses);
    }
  }

  return { reversedBonuses, earnedBonuses };
}

module.exports = { checkAndAwardConsistencyBonus, reconcileBonusesFromDate };
