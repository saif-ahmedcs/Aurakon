function toValidNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

const MIN_LEVEL = 1;

const CONSISTENCY_VIRTUAL_DAY_CAP = 10;
const CONSISTENCY_PRIOR_WEIGHT = 20;
const CONSISTENCY_PRIOR_RATIO = 0.5;

function smoothedConsistencyRatio(lifetimeCompleted, lifetimeTotal) {
  const safeCompleted = toValidNumber(lifetimeCompleted);
  const safeTotal = toValidNumber(lifetimeTotal);
  return (
    (safeCompleted + CONSISTENCY_PRIOR_RATIO * CONSISTENCY_PRIOR_WEIGHT) /
    (safeTotal + CONSISTENCY_PRIOR_WEIGHT)
  );
}

function computeLevel(
  fullyCompletedDays,
  lifetimeCompleted,
  lifetimeTotal,
  daysTracked,
  streakStability,
  previousLevel = MIN_LEVEL,
) {
  const safeFullyCompletedDays = toValidNumber(fullyCompletedDays);
  const safeDaysTracked = toValidNumber(daysTracked);
  const safeStreakStability = toValidNumber(streakStability);
  const safePreviousLevel = toValidNumber(previousLevel);

  const consistencyRatio = smoothedConsistencyRatio(
    lifetimeCompleted,
    lifetimeTotal,
  );
  const consistencyCredit =
    consistencyRatio * Math.min(safeDaysTracked, CONSISTENCY_VIRTUAL_DAY_CAP);
  const stabilityBonus = 1 + 0.5 * safeStreakStability;
  const effectiveDays =
    (safeFullyCompletedDays + consistencyCredit) * stabilityBonus;
  const computedLevel = Math.floor(Math.sqrt(effectiveDays * 3));

  return Math.max(computedLevel, safePreviousLevel, MIN_LEVEL);
}

module.exports = {
  computeLevel,
  smoothedConsistencyRatio,
  CONSISTENCY_VIRTUAL_DAY_CAP,
  CONSISTENCY_PRIOR_WEIGHT,
  CONSISTENCY_PRIOR_RATIO,
};
