const { getPreviousLocalDate } = require("../utils/reviewWindow");
let pass = 0,
  fail = 0;

function check(name, actual, expected) {
  const ok = actual === expected;
  console.log(
    (ok ? "PASS" : "FAIL") +
      " - " +
      name +
      " => " +
      actual +
      " (expected " +
      expected +
      ")",
  );
  if (ok) pass++;
  else fail++;
}

// getPreviousLocalDate - pinned to UTC so the day math is deterministic

check(
  "previous date, mid-day UTC",
  getPreviousLocalDate("UTC", new Date("2026-06-23T15:00:00Z")),
  "2026-06-22",
);

check(
  "previous date, just after UTC midnight (day + year boundary)",
  getPreviousLocalDate("UTC", new Date("2026-01-01T00:30:00Z")),
  "2025-12-31",
);

check(
  "previous date, just before UTC midnight",
  getPreviousLocalDate("UTC", new Date("2026-06-23T23:59:00Z")),
  "2026-06-22",
);
console.log("---");
console.log(pass + " passed, " + fail + " failed");
