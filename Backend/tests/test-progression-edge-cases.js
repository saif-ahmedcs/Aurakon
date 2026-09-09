const { computeLevel } = require("../utils/levelCalculator");
const { difficultyToXp } = require("../utils/xpCalculator");
const { checkBonusEligibility } = require("../utils/consistencyBonusRules");
const {
  isShieldMilestone,
  isShieldEligibleDifficulty,
} = require("../utils/guardianShieldRules");
const {
  getHabitLimit,
  getDailyHabitCreationLimit,
} = require("../utils/habitLimitRules");
const {
  computeEnergyForDay,
  MAX_ENERGY,
} = require("../services/auraEnergyService");
const { resolveTitleTier } = require("../utils/titleThresholds");
const {
  calculateHabitStreaks,
  isFullDayCompletion,
} = require("../utils/streak");

let pass = 0,
  fail = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    (ok ? "PASS" : "FAIL") +
      " - " +
      name +
      " => " +
      JSON.stringify(actual) +
      " (expected " +
      JSON.stringify(expected) +
      ")",
  );
  if (ok) pass++;
  else fail++;
}

console.log("=== levelCalculator.computeLevel ===");

check("zero everything -> minimum level 1", computeLevel(0, 0, 0, 0), 1);

check(
  "level never decreases below previousLevel",
  computeLevel(0, 0, 0, 12),
  12,
);

check(
  "computeLevel itself has NO internal cap on streakStability -- the 1.0 cap lives in levelService's caller (Math.min(currentStreak/30, 1.0)), so higher raw input keeps increasing level here",
  computeLevel(20, 0.5, 5, 0) > computeLevel(20, 0.5, 1, 0),
  true,
);

check(
  "non-finite inputs treated as 0, does not throw (floored at level 1)",
  computeLevel(NaN, undefined, null, "x"),
  1,
);

check(
  "negative previousLevel does not corrupt result (normal case still wins)",
  computeLevel(10, 0.5, 0.5, -5) > 0,
  true,
);

console.log("=== xpCalculator.difficultyToXp ===");

check("easy = 10", difficultyToXp("easy"), 10);
check("medium = 15", difficultyToXp("medium"), 15);
check("hard = 25", difficultyToXp("hard"), 25);
check(
  "unknown difficulty -> undefined (would corrupt XP if ever reached)",
  difficultyToXp("nonsense"),
  undefined,
);

console.log("=== consistencyBonusRules.checkBonusEligibility ===");

check("0 days -> both false (guarded by >0)", checkBonusEligibility(0), {
  "7day": false,
  "30day": false,
});
check("7 days -> 7day true", checkBonusEligibility(7), {
  "7day": true,
  "30day": false,
});
check("14 days -> 7day true (multiple of 7)", checkBonusEligibility(14), {
  "7day": true,
  "30day": false,
});
check(
  "30 days -> 30day true, 7day false (30%7!=0)",
  checkBonusEligibility(30),
  {
    "7day": false,
    "30day": true,
  },
);
check(
  "210 days -> both true (multiple of 7 and 30)",
  checkBonusEligibility(210),
  { "7day": true, "30day": true },
);
check(
  "negative days -> both false (guarded by >0)",
  checkBonusEligibility(-7),
  { "7day": false, "30day": false },
);

console.log("=== guardianShieldRules ===");

check("easy is not shield-eligible", isShieldEligibleDifficulty("easy"), false);
check("medium is shield-eligible", isShieldEligibleDifficulty("medium"), true);
check("hard is shield-eligible", isShieldEligibleDifficulty("hard"), true);
check(
  "unknown difficulty is not shield-eligible",
  isShieldEligibleDifficulty("nonsense"),
  false,
);

check("medium @ 45 is milestone", isShieldMilestone(45, "medium"), true);
check("medium @ 44 is not milestone", isShieldMilestone(44, "medium"), false);
check(
  "medium @ 90 is milestone (2nd interval)",
  isShieldMilestone(90, "medium"),
  true,
);
check("hard @ 30 is milestone", isShieldMilestone(30, "hard"), true);
check("hard @ 60 is milestone", isShieldMilestone(60, "hard"), true);
check(
  "easy never hits a milestone (no interval defined)",
  isShieldMilestone(45, "easy"),
  false,
);
check("0 days is never a milestone", isShieldMilestone(0, "medium"), false);
check(
  "negative days is never a milestone",
  isShieldMilestone(-45, "medium"),
  false,
);

console.log("=== auraEnergyCalculator.difficultyToEnergy ===");

check("easy = 10 energy", difficultyToEnergy("easy"), 10);
check("medium = 15 energy", difficultyToEnergy("medium"), 15);
check("hard = 25 energy", difficultyToEnergy("hard"), 25);

console.log("=== auraEnergyService.computeEnergyForDay ===");

check("empty day -> 0 energy", computeEnergyForDay([]), 0);

check(
  "shielded habits contribute 0 energy (only completed/recovered count)",
  computeEnergyForDay([
    { status: "shielded", difficulty: "hard" },
    { status: "shielded", difficulty: "hard" },
  ]),
  0,
);

check(
  "missed/pending_review contribute 0 energy",
  computeEnergyForDay([
    { status: "missed", difficulty: "hard" },
    { status: "pending_review", difficulty: "hard" },
  ]),
  0,
);

check(
  "completed + recovered energy sums normally under the cap",
  computeEnergyForDay([
    { status: "completed", difficulty: "easy" },
    { status: "recovered", difficulty: "medium" },
  ]),
  25,
);

check(
  `energy is capped at MAX_ENERGY (${MAX_ENERGY}) even with many hard habits`,
  computeEnergyForDay([
    { status: "completed", difficulty: "hard" },
    { status: "completed", difficulty: "hard" },
    { status: "completed", difficulty: "hard" },
    { status: "completed", difficulty: "hard" },
    { status: "completed", difficulty: "hard" },
  ]),
  MAX_ENERGY,
);

console.log("=== titleThresholds.resolveTitleTier (boundary values) ===");

check("0 xp -> New Soul", resolveTitleTier(0), "New Soul");
check(
  "499 xp -> New Soul (just under threshold)",
  resolveTitleTier(499),
  "New Soul",
);
check(
  "500 xp -> Disciplined Mind (exact threshold)",
  resolveTitleTier(500),
  "Disciplined Mind",
);
check(
  "1499 xp -> Disciplined Mind",
  resolveTitleTier(1499),
  "Disciplined Mind",
);
check("1500 xp -> Elite Disciple", resolveTitleTier(1500), "Elite Disciple");
check("3499 xp -> Elite Disciple", resolveTitleTier(3499), "Elite Disciple");
check("3500 xp -> Rising Warrior", resolveTitleTier(3500), "Rising Warrior");
check("7500 xp -> Iron Will", resolveTitleTier(7500), "Iron Will");
check("15000 xp -> Aura Master", resolveTitleTier(15000), "Aura Master");
check("30000 xp -> Commander", resolveTitleTier(30000), "Commander");
check(
  "55000 xp -> Mythic Champion",
  resolveTitleTier(55000),
  "Mythic Champion",
);
check("90000 xp -> Legendary Soul", resolveTitleTier(90000), "Legendary Soul");
check(
  "999999999 xp -> still Legendary Soul (top tier holds)",
  resolveTitleTier(999999999),
  "Legendary Soul",
);
check(
  "negative xp -> falls back to New Soul",
  resolveTitleTier(-100),
  "New Soul",
);
check(
  "non-finite xp -> falls back to New Soul (safeXp = 0)",
  resolveTitleTier(NaN),
  "New Soul",
);

console.log("=== streak.calculateHabitStreaks ===");

check(
  "empty logs -> all zero, no start date",
  calculateHabitStreaks([], "2026-06-23"),
  {
    currentStreak: 0,
    longestStreak: 0,
    currentStreakStartDate: null,
  },
);

check(
  "all missed -> all zero",
  calculateHabitStreaks(
    [
      { date: "2026-06-21", status: "missed" },
      { date: "2026-06-22", status: "missed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 0, longestStreak: 0, currentStreakStartDate: null },
);

check(
  "future-dated logs beyond asOfDate are ignored entirely",
  calculateHabitStreaks(
    [
      { date: "2026-06-23", status: "completed" },
      { date: "2026-06-30", status: "completed" },
    ],
    "2026-06-23",
  ),
  { currentStreak: 1, longestStreak: 1, currentStreakStartDate: "2026-06-23" },
);

check(
  "shielded day bridges the gap it fills, counts toward streak",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "shielded" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 3, longestStreak: 3, currentStreakStartDate: "2026-06-20" },
);

check(
  "recovered day bridges the gap it fills, counts toward streak",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "recovered" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 3, longestStreak: 3, currentStreakStartDate: "2026-06-20" },
);

check(
  "a single pending_review day bridges the gap but does NOT itself add to run length (only completed/recovered/shielded count)",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "pending_review" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 2, longestStreak: 2, currentStreakStartDate: "2026-06-20" },
);

check(
  "multiple consecutive pending_review days ALSO bridge (supports multi-day review sessions, e.g. a missed weekend) -- confirms this is intentional, not the single-day-only behavior the old test-streak.js comment implied",
  calculateHabitStreaks(
    [
      { date: "2026-06-19", status: "completed" },
      { date: "2026-06-20", status: "pending_review" },
      { date: "2026-06-21", status: "pending_review" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 2, longestStreak: 2, currentStreakStartDate: "2026-06-19" },
);

check(
  "trailing pending_review with no asOfDate log yet keeps current streak open at pre-gap length",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "pending_review" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 1, longestStreak: 1, currentStreakStartDate: "2026-06-20" },
);

check(
  "missed day breaks the streak identically to a missing row",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "missed" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 1, longestStreak: 1, currentStreakStartDate: "2026-06-22" },
);

check(
  "earlier run longer than current run -> longestStreak wins, currentStreak reflects only the live run",
  calculateHabitStreaks(
    [
      { date: "2026-06-01", status: "completed" },
      { date: "2026-06-02", status: "completed" },
      { date: "2026-06-03", status: "completed" },
      { date: "2026-06-04", status: "completed" },
      { date: "2026-06-05", status: "completed" },
      { date: "2026-06-10", status: "completed" },
      { date: "2026-06-11", status: "completed" },
    ],
    "2026-06-20",
  ),
  { currentStreak: 0, longestStreak: 5, currentStreakStartDate: null },
);

check(
  "gap between last present day and asOfDate breaks current streak but preserves longest",
  calculateHabitStreaks(
    [
      { date: "2026-06-18", status: "completed" },
      { date: "2026-06-19", status: "completed" },
      { date: "2026-06-20", status: "completed" },
    ],
    "2026-06-23",
  ),
  { currentStreak: 0, longestStreak: 3, currentStreakStartDate: null },
);

check(
  "streak crossing a year boundary",
  calculateHabitStreaks(
    [
      { date: "2025-12-30", status: "completed" },
      { date: "2025-12-31", status: "completed" },
      { date: "2026-01-01", status: "completed" },
    ],
    "2026-01-01",
  ),
  { currentStreak: 3, longestStreak: 3, currentStreakStartDate: "2025-12-30" },
);

console.log("=== streak.isFullDayCompletion ===");

check(
  "empty array -> false (no habits means no completion)",
  isFullDayCompletion([]),
  false,
);
check("non-array input -> false", isFullDayCompletion(null), false);
check(
  "all completed -> true",
  isFullDayCompletion([{ status: "completed" }, { status: "completed" }]),
  true,
);
check(
  "one missing (missed) out of several -> false",
  isFullDayCompletion([{ status: "completed" }, { status: "missed" }]),
  false,
);
check(
  "shielded counts toward full-day completion",
  isFullDayCompletion([{ status: "completed" }, { status: "shielded" }]),
  true,
);
check(
  "pending_review does NOT count toward full-day completion",
  isFullDayCompletion([{ status: "completed" }, { status: "pending_review" }]),
  false,
);

console.log("=== habitLimitRules.getHabitLimit and getDailyHabitCreationLimit ===");

check("level 1 habit limit is 5", getHabitLimit(1), 5);
check("level 1 daily creation limit is 8 (5 + 3)", getDailyHabitCreationLimit(1), 8);
check("level 7 habit limit is 5", getHabitLimit(7), 5);
check("level 7 daily creation limit is 8 (5 + 3)", getDailyHabitCreationLimit(7), 8);
check("level 8 habit limit is 7", getHabitLimit(8), 7);
check("level 8 daily creation limit is 10 (7 + 3)", getDailyHabitCreationLimit(8), 10);
check("level 15 habit limit is 9", getHabitLimit(15), 9);
check("level 15 daily creation limit is 12 (9 + 3)", getDailyHabitCreationLimit(15), 12);
check("level 20 habit limit is 10", getHabitLimit(20), 10);
check("level 20 daily creation limit is 13 (10 + 3)", getDailyHabitCreationLimit(20), 13);
check("level 30 habit limit is 12", getHabitLimit(30), 12);
check("level 30 daily creation limit is 15 (12 + 3)", getDailyHabitCreationLimit(30), 15);
check("level 50 habit limit is 12", getHabitLimit(50), 12);
check("level 50 daily creation limit is 15 (12 + 3)", getDailyHabitCreationLimit(50), 15);

console.log("---");
console.log(pass + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);

