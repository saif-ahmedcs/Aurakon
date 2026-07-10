const xpBonusLogModel = require("../models/xpBonusLogModel");
const xpService = require("../services/xpService");
const { checkBonusEligibility } = require("../utils/consistencyBonusRules");

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

async function checkAndAwardConsistencyBonus(userId, consecutiveFullDays) {
  const eligibility = checkBonusEligibility(consecutiveFullDays);
  const awardedAt = todayUTC();
  const results = [];

  for (const bonusType of Object.keys(eligibility)) {
    if (!eligibility[bonusType]) continue;

    const alreadyAwarded = await xpBonusLogModel.hasBonusBeenAwarded(
      userId,
      bonusType,
      awardedAt,
    );
    if (alreadyAwarded) continue;

    await xpBonusLogModel.insertBonusAward(userId, bonusType, awardedAt);
    const result = await xpService.awardBonusXp(userId, bonusType);
    results.push({ bonusType, ...result });
  }

  return results;
}

module.exports = { checkAndAwardConsistencyBonus };
