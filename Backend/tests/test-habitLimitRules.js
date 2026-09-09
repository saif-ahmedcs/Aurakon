const {
  HABIT_LIMIT_TIERS,
  DAILY_HABIT_CREATION_EXTRA_ALLOWANCE,
  getHabitLimit,
  getDailyHabitCreationLimit,
} = require("../utils/habitLimitRules");

let pass = 0;
let fail = 0;

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

console.log("=== habitLimitRules ===");

check("extra allowance constant is 3", DAILY_HABIT_CREATION_EXTRA_ALLOWANCE, 3);

// Level 1-7: limit 5, daily creation limit 8 (5 + 3)
check("level 1 habit limit", getHabitLimit(1), 5);
check("level 1 daily creation limit", getDailyHabitCreationLimit(1), 8);
check("level 5 habit limit", getHabitLimit(5), 5);
check("level 5 daily creation limit", getDailyHabitCreationLimit(5), 8);
check("level 7 habit limit", getHabitLimit(7), 5);
check("level 7 daily creation limit", getDailyHabitCreationLimit(7), 8);

// Level 8-14: limit 7, daily creation limit 10 (7 + 3)
check("level 8 habit limit", getHabitLimit(8), 7);
check("level 8 daily creation limit", getDailyHabitCreationLimit(8), 10);
check("level 14 habit limit", getHabitLimit(14), 7);
check("level 14 daily creation limit", getDailyHabitCreationLimit(14), 10);

// Level 15-19: limit 9, daily creation limit 12 (9 + 3)
check("level 15 habit limit", getHabitLimit(15), 9);
check("level 15 daily creation limit", getDailyHabitCreationLimit(15), 12);
check("level 19 habit limit", getHabitLimit(19), 9);
check("level 19 daily creation limit", getDailyHabitCreationLimit(19), 12);

// Level 20-29: limit 10, daily creation limit 13 (10 + 3)
check("level 20 habit limit", getHabitLimit(20), 10);
check("level 20 daily creation limit", getDailyHabitCreationLimit(20), 13);
check("level 29 habit limit", getHabitLimit(29), 10);
check("level 29 daily creation limit", getDailyHabitCreationLimit(29), 13);

// Level 30+: limit 12, daily creation limit 15 (12 + 3)
check("level 30 habit limit", getHabitLimit(30), 12);
check("level 30 daily creation limit", getDailyHabitCreationLimit(30), 15);
check("level 50 habit limit", getHabitLimit(50), 12);
check("level 50 daily creation limit", getDailyHabitCreationLimit(50), 15);

// Edge cases
check("non-numeric / undefined level defaults to level 1 limit (5)", getHabitLimit(undefined), 5);
check("non-numeric / undefined level daily creation limit (8)", getDailyHabitCreationLimit(undefined), 8);
check("negative level defaults to level 1 limit (5)", getHabitLimit(-5), 5);
check("negative level daily creation limit (8)", getDailyHabitCreationLimit(-5), 8);

console.log("---");
console.log(pass + " passed, " + fail + " failed");
process.exit(fail > 0 ? 1 : 0);
