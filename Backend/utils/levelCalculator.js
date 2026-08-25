function toValidNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

const MIN_LEVEL = 1;

// Consistency credit is capped at this many virtual days, and scaled down
// by the habit-days actually tracked, so a short-but-perfect history can
// never masquerade as ten days of consistency.
const CONSISTENCY_VIRTUAL_DAY_CAP = 10;
const DEFAULT_TRACKED_DAYS = CONSISTENCY_VIRTUAL_DAY_CAP;

function computeLevel(
  fullyCompletedDays,
  consistencyRatio,
  streakStability,
  previousLevel = MIN_LEVEL,
  trackedDays = DEFAULT_TRACKED_DAYS,
) {
  const safeFullyCompletedDays = toValidNumber(fullyCompletedDays);
  const safeConsistencyRatio = toValidNumber(consistencyRatio);
  const safeStreakStability = toValidNumber(streakStability);
  const safePreviousLevel = toValidNumber(previousLevel);

  const consistencyCredit =
    safeConsistencyRatio *
    Math.min(toValidNumber(trackedDays), CONSISTENCY_VIRTUAL_DAY_CAP);
  const stabilityBonus = 1 + 0.5 * safeStreakStability;
  const effectiveDays =
    (safeFullyCompletedDays + consistencyCredit) * stabilityBonus;
  const computedLevel = Math.floor(Math.sqrt(effectiveDays * 3));

  return Math.max(computedLevel, safePreviousLevel, MIN_LEVEL);
}

module.exports = { computeLevel };
