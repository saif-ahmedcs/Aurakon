const BONUS_THRESHOLDS = {
  "7day": 7,
  "30day": 30,
};

function checkBonusEligibility(consecutiveFullDays) {
  return {
    "7day":
      consecutiveFullDays > 0 &&
      consecutiveFullDays % BONUS_THRESHOLDS["7day"] === 0,
    "30day":
      consecutiveFullDays > 0 &&
      consecutiveFullDays % BONUS_THRESHOLDS["30day"] === 0,
  };
}

module.exports = { BONUS_THRESHOLDS, checkBonusEligibility };
