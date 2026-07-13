const { difficultyToEnergy } = require("../utils/auraEnergyCalculator");
const { PRESENT_STATUSES } = require("../utils/streak");

const MAX_ENERGY = 100;

function computeEnergyForDay(statusesWithDifficulty) {
  const rawTotal = statusesWithDifficulty
    .filter((row) => PRESENT_STATUSES.has(row.status))
    .reduce((sum, row) => sum + difficultyToEnergy(row.difficulty), 0);

  return Math.min(rawTotal, MAX_ENERGY);
}

module.exports = { computeEnergyForDay, MAX_ENERGY };
