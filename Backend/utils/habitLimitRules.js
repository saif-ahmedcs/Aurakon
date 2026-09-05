const HABIT_LIMIT_TIERS = [
  { minLevel: 30, limit: 12 },
  { minLevel: 20, limit: 10 },
  { minLevel: 15, limit: 9 },
  { minLevel: 8, limit: 7 },
  { minLevel: 1, limit: 5 },
];

const DAILY_HABIT_CREATION_EXTRA_ALLOWANCE = 3;

function getHabitLimit(level) {
  const safeLevel = Number.isFinite(level) ? Math.max(level, 1) : 1;
  const tier = HABIT_LIMIT_TIERS.find((t) => safeLevel >= t.minLevel);
  return tier
    ? tier.limit
    : HABIT_LIMIT_TIERS[HABIT_LIMIT_TIERS.length - 1].limit;
}

function getDailyHabitCreationLimit(level) {
  return getHabitLimit(level) + DAILY_HABIT_CREATION_EXTRA_ALLOWANCE;
}

module.exports = {
  HABIT_LIMIT_TIERS,
  DAILY_HABIT_CREATION_EXTRA_ALLOWANCE,
  getHabitLimit,
  getDailyHabitCreationLimit,
};

