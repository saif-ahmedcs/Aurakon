const { calculateHabitStreaks } = require("../utils/streak");
let pass = 0,
  fail = 0;

function check(name, actual, expected) {
  const ok =
    actual.currentStreak === expected.currentStreak &&
    actual.longestStreak === expected.longestStreak;
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

// Helper: turns a flat array of date strings into all-'completed' logs,
// matching the pre-Step-15 test inputs below.
function completed(dates) {
  return dates.map((date) => ({ date, status: "completed" }));
}

check("empty logs", calculateHabitStreaks([], "2026-06-23"), {
  currentStreak: 0,
  longestStreak: 0,
});

check(
  "single date, gap 0",
  calculateHabitStreaks(completed(["2026-06-23"]), "2026-06-23"),
  { currentStreak: 1, longestStreak: 1 },
);

check(
  "single date, gap 1",
  calculateHabitStreaks(completed(["2026-06-22"]), "2026-06-23"),
  { currentStreak: 1, longestStreak: 1 },
);

check(
  "single date, gap 3 (broken)",
  calculateHabitStreaks(completed(["2026-06-20"]), "2026-06-23"),
  { currentStreak: 0, longestStreak: 1 },
);

check(
  "earlier run longer than broken recent run",
  calculateHabitStreaks(
    completed([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-04",
      "2026-06-05",
      "2026-06-10",
      "2026-06-11",
    ]),
    "2026-06-20",
  ),
  { currentStreak: 0, longestStreak: 5 },
);

check(
  "most recent run is also longest",
  calculateHabitStreaks(
    completed([
      "2026-06-01",
      "2026-06-20",
      "2026-06-21",
      "2026-06-22",
      "2026-06-23",
    ]),
    "2026-06-23",
  ),
  { currentStreak: 4, longestStreak: 4 },
);

check(
  "duplicate dates de-duplicated",
  calculateHabitStreaks(
    completed(["2026-06-23", "2026-06-23", "2026-06-22"]),
    "2026-06-23",
  ),
  { currentStreak: 2, longestStreak: 2 },
);

check(
  "future-dated log discarded",
  calculateHabitStreaks(completed(["2026-06-23", "2026-06-30"]), "2026-06-23"),
  { currentStreak: 1, longestStreak: 1 },
);

check(
  "streak crossing year boundary",
  calculateHabitStreaks(
    completed(["2025-12-30", "2025-12-31", "2026-01-01"]),
    "2026-01-01",
  ),
  { currentStreak: 3, longestStreak: 3 },
);

check(
  "current beats previous longest streak",
  calculateHabitStreaks(
    completed([
      "2026-06-01",
      "2026-06-02",
      "2026-06-03",
      "2026-06-05",
      "2026-06-06",
      "2026-06-07",
      "2026-06-08",
      "2026-06-09",
      "2026-06-10",
      "2026-06-11",
    ]),
    "2026-06-11",
  ),
  { currentStreak: 7, longestStreak: 7 },
);

// --- Step 15: status-aware cases ---

check(
  "'recovered' row bridges the gap it fills",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "recovered" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 3, longestStreak: 3 },
);

check(
  "'shielded' row bridges the gap it fills",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "shielded" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 3, longestStreak: 3 },
);

check(
  "'missed' row breaks the streak, identically to no row at all",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "missed" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 1, longestStreak: 1 },
);

check(
  "unresolved 'pending_review' counts as neither — streak stays open, not incremented or broken",
  calculateHabitStreaks(
    [
      { date: "2026-06-20", status: "completed" },
      { date: "2026-06-21", status: "pending_review" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 1, longestStreak: 1 },
);

check(
  "two consecutive pending_review days bridge the present days around them (docs/02: 'Consecutive pending_review days may temporarily bridge two present days')",
  calculateHabitStreaks(
    [
      { date: "2026-06-19", status: "completed" },
      { date: "2026-06-20", status: "pending_review" },
      { date: "2026-06-21", status: "pending_review" },
      { date: "2026-06-22", status: "completed" },
    ],
    "2026-06-22",
  ),
  { currentStreak: 2, longestStreak: 2 },
);

console.log("---");
console.log(pass + " passed, " + fail + " failed");
