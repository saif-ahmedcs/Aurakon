const xpModel = require("../models/xpModel");
const xpCompletionLogModel = require("../models/xpCompletionLogModel");
const xpBonusLogModel = require("../models/xpBonusLogModel");
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

async function noopXpResult(userId, tx) {
  const totalXp = await xpModel.getTotalXp(userId, tx);
  const title = titleService.resolveCurrentTitle(totalXp);
  return { delta: 0, totalXp, title };
}

async function awardCompletionXp(userId, habitId, date, difficulty, tx) {
  const alreadyAwarded = await xpCompletionLogModel.findAward(
    habitId,
    date,
    tx,
  );
  if (alreadyAwarded) {
    return noopXpResult(userId, tx);
  }

  const delta = difficultyToXp(difficulty);

  try {
    await xpCompletionLogModel.insertAward(userId, habitId, date, delta, tx);
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return noopXpResult(userId, tx);
    }
    throw err;
  }

  return applyXpDelta(userId, delta, tx);
}

async function reverseCompletionXp(userId, habitId, date, tx) {
  const award = await xpCompletionLogModel.findAward(habitId, date, tx);
  if (!award) {
    return noopXpResult(userId, tx);
  }

  await xpCompletionLogModel.deleteAward(habitId, date, tx);
  return applyXpDelta(userId, -award.xp_amount, tx);
}

async function awardBonusXp(userId, bonusType, tx) {
  const delta = BONUS_XP[bonusType];
  return applyXpDelta(userId, delta, tx);
}

async function reverseBonusXp(userId, bonusType, tx) {
  const delta = -BONUS_XP[bonusType];
  return applyXpDelta(userId, delta, tx);
}

async function rebuildTotalXp(userId, tx) {
  const completionTotal = await xpCompletionLogModel.sumByUser(
    userId,
    tx,
    true,
  );

  let bonusTotal = 0;
  for (const bonusType of Object.keys(BONUS_XP)) {
    const count = await xpBonusLogModel.countByUserAndType(
      userId,
      bonusType,
      tx,
      true,
    );
    bonusTotal += count * BONUS_XP[bonusType];
  }

  const total = completionTotal + bonusTotal;
  await xpModel.setTotalXp(userId, total, tx);

  const title = titleService.resolveCurrentTitle(total);
  return { totalXp: total, title };
}

module.exports = {
  awardCompletionXp,
  reverseCompletionXp,
  awardBonusXp,
  reverseBonusXp,
  rebuildTotalXp,
};
