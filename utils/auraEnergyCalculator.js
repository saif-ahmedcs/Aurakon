const DIFFICULTY_ENERGY = {
  easy: 10,
  medium: 15,
  hard: 25,
};

function difficultyToEnergy(difficulty) {
  return DIFFICULTY_ENERGY[difficulty];
}

function capEnergy(current, delta, max = 100) {
  return Math.min(current + delta, max);
}

module.exports = { difficultyToEnergy, capEnergy };
