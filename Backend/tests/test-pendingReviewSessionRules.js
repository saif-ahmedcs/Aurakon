const { isSessionExpired } = require("../utils/pendingReviewSessionRules");
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

check(
  "same day, not expired",
  isSessionExpired("2026-06-20", Date.parse("2026-06-20T12:00:00Z")),
  false,
);

// The window is day-anchored (docs/02 Expiration Timeline): it expires at
// the start of the local day three days after the missed date - i.e. a
// strict > comparison against lastMissedDate + GRACE_PERIOD_DAYS.

check(
  "two days later, still inside the window",
  isSessionExpired("2026-06-20", Date.parse("2026-06-22T23:59:59Z")),
  false,
);

check(
  "exactly at the expiry anchor, not expired (strict >)",
  isSessionExpired("2026-06-20", Date.parse("2026-06-23T00:00:00Z")),
  false,
);

check(
  "1 second past the expiry anchor, expired",
  isSessionExpired("2026-06-20", Date.parse("2026-06-23T00:00:01Z")),
  true,
);

// --- multiple consecutive missed days: window extends with each append ---

check(
  "day 2 arrives well within day 1's window -> append allowed",
  isSessionExpired("2026-06-20", Date.parse("2026-06-21T10:00:00Z")),
  false,
);

check(
  "after appending day 2, window is measured from day 2, not day 1",
  isSessionExpired("2026-06-21", Date.parse("2026-06-24T00:00:01Z")),
  true,
);

check(
  "day 3 arrives within day 2's extended window -> append allowed",
  isSessionExpired("2026-06-21", Date.parse("2026-06-22T20:00:00Z")),
  false,
);

console.log("---");
console.log(pass + " passed, " + fail + " failed");
