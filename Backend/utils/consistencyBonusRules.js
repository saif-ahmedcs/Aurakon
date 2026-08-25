const BONUS_THRESHOLDS = {
  "7day": 7,
  "30day": 30,
};

function checkBonusEligibility(consecutiveFullDays) {
  const eligibility = {};
  for (const [bonusType, threshold] of Object.entries(BONUS_THRESHOLDS)) {
    eligibility[bonusType] =
      consecutiveFullDays > 0 && consecutiveFullDays % threshold === 0;
  }
  return eligibility;
}

module.exports = { BONUS_THRESHOLDS, checkBonusEligibility };
