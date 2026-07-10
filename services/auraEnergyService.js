const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const {
  difficultyToEnergy,
  capEnergy,
} = require("../utils/auraEnergyCalculator");

const MAX_ENERGY = 100;

async function applyEnergyForCompletion(userId, difficulty, date) {
  const rawDelta = difficultyToEnergy(difficulty);

  const existing = await dailyAuraStatsModel.getByDate(userId, date);
  const current = existing ? existing.aura_energy : 0;

  const cappedNew = capEnergy(current, rawDelta, MAX_ENERGY);
  const appliedDelta = cappedNew - current;

  if (appliedDelta > 0) {
    await dailyAuraStatsModel.upsertEnergy(userId, date, appliedDelta);
  }

  return cappedNew;
}

module.exports = { applyEnergyForCompletion };
