process.env.TZ = "UTC";
const mysql2 = require("mysql2");
const { getPreviousLocalDate, addUtcDays } = require("../utils/reviewWindow");

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

const fixedInstant = new Date("2026-07-23T00:30:00Z");
check(
  "pinned process TZ - getHours() matches UTC hour",
  fixedInstant.getHours(),
  fixedInstant.getUTCHours(),
);
check(
  "pinned process TZ - getDate() matches UTC date",
  fixedInstant.getDate(),
  fixedInstant.getUTCDate(),
);

check(
  "mysql2 escape() with timezone:'Z' is host-TZ invariant",
  mysql2.escape(fixedInstant, false, "Z"),
  "'2026-07-23 00:30:00.000'",
);

check(
  "getPreviousLocalDate('UTC') is UTC-day-correct",
  getPreviousLocalDate("UTC", new Date("2026-07-23T02:00:00Z")),
  "2026-07-22",
);
check(
  "addUtcDays is UTC-day-correct across a month boundary",
  addUtcDays("2026-07-31", 1),
  "2026-08-01",
);

console.log("---");
console.log(pass + " passed, " + fail + " failed");
