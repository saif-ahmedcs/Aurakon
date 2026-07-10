const DIFFICULTY_ENERGY = {
  easy: 5,
  medium: 10,
  hard: 20,
};

function difficultyToEnergy(difficulty) {
  return DIFFICULTY_ENERGY[difficulty];
}

function capEnergy(current, delta, max = 100) {
  return Math.min(current + delta, max);
}

module.exports = { difficultyToEnergy, capEnergy };
