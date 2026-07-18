const SHIELD_MILESTONE_INTERVAL = 60;
const SHIELD_ELIGIBLE_DIFFICULTIES = ["medium", "hard"];

function isShieldMilestone(consecutiveHabitDays) {
  return (
    consecutiveHabitDays > 0 &&
    consecutiveHabitDays % SHIELD_MILESTONE_INTERVAL === 0
  );
}

function isShieldEligibleDifficulty(difficulty) {
  return SHIELD_ELIGIBLE_DIFFICULTIES.includes(difficulty);
}

module.exports = {
  SHIELD_MILESTONE_INTERVAL,
  SHIELD_ELIGIBLE_DIFFICULTIES,
  isShieldMilestone,
  isShieldEligibleDifficulty,
};
