const DIFFICULTY_XP = {
  easy: 10,
  medium: 15,
  hard: 25,
};

function difficultyToXp(difficulty) {
  return DIFFICULTY_XP[difficulty];
}

module.exports = { difficultyToXp };
