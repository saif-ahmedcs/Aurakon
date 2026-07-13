const xpModel = require("../models/xpModel");
const titleService = require("../services/titleService");
const { difficultyToXp } = require("../utils/xpCalculator");

const BONUS_XP = {
  "7day": 150,
  "30day": 750,
};

async function applyXpDelta(userId, delta, tx) {
  await xpModel.incrementTotalXp(userId, delta, tx);

  const totalXp = await xpModel.getTotalXp(userId, tx);
  const title = titleService.resolveCurrentTitle(totalXp);

  return { delta, totalXp, title };
}

async function awardCompletionXp(userId, difficulty, tx) {
  const delta = difficultyToXp(difficulty);
  return applyXpDelta(userId, delta, tx);
}

async function reverseCompletionXp(userId, difficulty, tx) {
  const delta = -difficultyToXp(difficulty);
  return applyXpDelta(userId, delta, tx);
}

async function awardBonusXp(userId, bonusType, tx) {
  const delta = BONUS_XP[bonusType];
  return applyXpDelta(userId, delta, tx);
}

module.exports = { awardCompletionXp, reverseCompletionXp, awardBonusXp };
