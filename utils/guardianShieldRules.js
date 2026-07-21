const SHIELD_MILESTONE_INTERVALS = {
  medium: 45,
  hard: 30,
};

function isShieldEligibleDifficulty(difficulty) {
  return Object.prototype.hasOwnProperty.call(
    SHIELD_MILESTONE_INTERVALS,
    difficulty,
  );
}

function isShieldMilestone(consecutiveHabitDays, difficulty) {
  const interval = SHIELD_MILESTONE_INTERVALS[difficulty];
  if (!interval) return false;
  return consecutiveHabitDays > 0 && consecutiveHabitDays % interval === 0;
}

module.exports = {
  SHIELD_MILESTONE_INTERVALS,
  isShieldMilestone,
  isShieldEligibleDifficulty,
};
