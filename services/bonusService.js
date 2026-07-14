const xpBonusLogModel = require("../models/xpBonusLogModel");
const xpService = require("../services/xpService");
const streakService = require("./streakService");
const { checkBonusEligibility } = require("../utils/consistencyBonusRules");
const { ConflictError } = require("../utils/AppErrors");

async function checkAndAwardConsistencyBonus(
  userId,
  consecutiveFullDays,
  milestoneDate,
  tx,
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
      await xpBonusLogModel.insertBonusAward(userId, bonusType, awardedAt, tx);
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
    );
    const eligibility = checkBonusEligibility(streakAtDate);

    if (!eligibility[award.bonus_type]) {
      await xpBonusLogModel.deleteAward(
        userId,
        award.bonus_type,
        award.awarded_at,
        tx,
      );
      await xpService.reverseBonusXp(userId, award.bonus_type, tx);
    }
  }
}

module.exports = { checkAndAwardConsistencyBonus, reconcileBonusesFromDate };
