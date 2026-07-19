const { difficultyToEnergy } = require("../utils/auraEnergyCalculator");

const MAX_ENERGY = 100;

const ENERGY_ELIGIBLE_STATUSES = new Set(["completed", "recovered"]);

function computeEnergyForDay(statusesWithDifficulty) {
  const rawTotal = statusesWithDifficulty
    .filter((row) => ENERGY_ELIGIBLE_STATUSES.has(row.status))
    .reduce((sum, row) => sum + difficultyToEnergy(row.difficulty), 0);

  return Math.min(rawTotal, MAX_ENERGY);
}

module.exports = { computeEnergyForDay, MAX_ENERGY };
