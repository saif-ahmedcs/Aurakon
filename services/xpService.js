const xpModel = require("../models/xpModel");
const levelService = require("../services/levelService");
const titleService = require("../services/titleService");
const { difficultyToXp } = require("../utils/xpCalculator");

const BONUS_XP = {
  "7day": 150,
  "30day": 750,
};

async function applyXpDelta(userId, delta) {
  await xpModel.incrementTotalXp(userId, delta);
  await levelService.recalculateAndPersistLevel(userId);

  const totalXp = await xpModel.getTotalXp(userId);
  const title = titleService.resolveCurrentTitle(totalXp);

  return { delta, totalXp, title };
}

async function awardCompletionXp(userId, difficulty) {
  const delta = difficultyToXp(difficulty);
  return applyXpDelta(userId, delta);
}

async function awardBonusXp(userId, bonusType) {
  const delta = BONUS_XP[bonusType];
  return applyXpDelta(userId, delta);
}

module.exports = { awardCompletionXp, awardBonusXp };
