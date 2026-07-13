const DIFFICULTY_ENERGY = {
  easy: 10,
  medium: 15,
  hard: 25,
};

function difficultyToEnergy(difficulty) {
  return DIFFICULTY_ENERGY[difficulty];
}

module.exports = { difficultyToEnergy };
