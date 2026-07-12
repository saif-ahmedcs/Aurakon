const userProgressModel = require("../models/userProgressModel");
const {
  isShieldMilestone,
  isShieldEligibleDifficulty,
} = require("../utils/guardianShieldRules");

async function earnShieldIfEligible(userId, difficulty, consecutiveDays, tx) {
  if (
    isShieldMilestone(consecutiveDays) &&
    isShieldEligibleDifficulty(difficulty)
  ) {
    await userProgressModel.incrementShieldBalance(userId, tx);
    return true;
  }
  return false;
}

module.exports = { earnShieldIfEligible };
