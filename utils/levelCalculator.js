function toValidNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function computeLevel(
  fullyCompletedDays,
  consistencyRatio,
  streakStability,
  previousLevel = 0,
) {
  const safeFullyCompletedDays = toValidNumber(fullyCompletedDays);
  const safeConsistencyRatio = toValidNumber(consistencyRatio);
  const safeStreakStability = toValidNumber(streakStability);
  const safePreviousLevel = toValidNumber(previousLevel);

  const stabilityBonus = 1 + 0.5 * safeStreakStability;
  const effectiveDays =
    safeFullyCompletedDays * safeConsistencyRatio * stabilityBonus;

  const computedLevel = Math.floor(Math.sqrt(effectiveDays * 3));

  return Math.max(computedLevel, safePreviousLevel);
}

module.exports = { computeLevel };
