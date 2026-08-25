const HABIT_LIMIT_TIERS = [
  { minLevel: 30, limit: 12 },
  { minLevel: 20, limit: 10 },
  { minLevel: 15, limit: 9 },
  { minLevel: 8, limit: 7 },
  { minLevel: 1, limit: 5 },
];

function getHabitLimit(level) {
  const safeLevel = Number.isFinite(level) ? Math.max(level, 1) : 1;
  const tier = HABIT_LIMIT_TIERS.find((t) => safeLevel >= t.minLevel);
  return tier
    ? tier.limit
    : HABIT_LIMIT_TIERS[HABIT_LIMIT_TIERS.length - 1].limit;
}

module.exports = { HABIT_LIMIT_TIERS, getHabitLimit };
