# Project Standing Rules

## 1. Same-origin rule

All backend requests must assume same-origin unless explicitly configured otherwise. No cross-origin logic unless required later in the project.

## 2. asyncHandler rule

All async route handlers must use a wrapper (asyncHandler) to avoid repeating try/catch blocks.

## 3. UTC dates rule

All dates stored in the database must be in UTC format. No local timezone storage.

## Streak Calculation Rules

These rules are written before any streak code exists. utils/streak.js must
implement exactly this, and the hand-written test cases are checked against
this text, not against the code.

**Function shape**
calculateStreaks(dateStrings, asOfDate) -> { currentStreak, longestStreak }

- dateStrings: array of check-in dates, each as a "YYYY-MM-DD" string.
- asOfDate: a single "YYYY-MM-DD" string — an arbitrary reference point
  the streak is calculated relative to. It is NOT "today" in any special
  sense; it is just a date supplied by the caller. The function never
  calls Date.now() or new Date() with no arguments, and asOfDate is never
  optional or defaulted internally.

**UTC-only rule**
Every date string is parsed directly into integer year, month, and day
components (the exact parsing method — splitting, regex, slicing — is an
implementation detail; the only hard requirement is never parsing via
new Date(string)). Each parsed date is converted to a UTC day value via
Date.UTC(year, month - 1, day). The difference between two such values is
measured in whole UTC calendar days. No local-time getters (getDate,
getMonth, etc.) are used anywhere.

**1) Normalize**

- Parse every entry in dateStrings into a UTC day value (per the rule above).
- Remove duplicates.
- Discard any value greater than asOfDate's UTC day value (a logged date
  after the reference point is not a valid input in this app — check-in
  routes are responsible for preventing future-dated logs; this function
  simply ignores any that slip through rather than producing undefined
  arithmetic).
- Sort the remaining values ascending. Call this list `days`.
- Parse asOfDate the same way; call it `asOfDay`.

**2) Compute runs**
Walk `days` in order. Two adjacent values are part of the same run if their
difference is exactly 1. A difference of 2 or more ends the current run and
starts a new one. The result is a list of runs, where each run is
represented as { length, endDay }.

**3) Longest streak**
longestStreak = the length of the longest run found above (0 if `days`
is empty). This considers every run in the data, not just the most recent.

**4) Current streak**
If `days` is empty, currentStreak = 0.
Otherwise, let finalRun = the run whose endDay equals max(days), and let
lastLogDay = finalRun.endDay.

- If (asOfDay - lastLogDay) is 0 or 1, the streak is still alive:
  currentStreak = finalRun.length.
- If (asOfDay - lastLogDay) is 2 or more, the streak is broken:
  currentStreak = 0.

**Edge cases**

- Empty dateStrings -> { currentStreak: 0, longestStreak: 0 }.
- Single date, gap to asOfDate is 0 or 1 -> { currentStreak: 1, longestStreak: 1 }.
- Single date, gap to asOfDate is 2+ -> { currentStreak: 0, longestStreak: 1 }.
  (This is the gap case the habit detail endpoint needs to handle correctly.)
- An earlier run longer than the most recent run -> longestStreak > currentStreak,
  including the case where the most recent run is broken entirely
  (currentStreak: 0, longestStreak > 0).
- If the most recent run is also the longest run, currentStreak and
  longestStreak will be equal — this is expected, not a bug.
- Duplicate dates in the input are de-duplicated before any computation —
  defensive only, since the DB's UNIQUE constraint on (habit_id, log_date)
  should prevent duplicates from reaching here in practice.
- Any date later than asOfDate is discarded during normalization above —
  defensive only, since check-in routes should never allow future-dated logs.

**asOfDate source for GET /:id**
`calculateStreaks` never determines "today" itself — asOfDate must come
from the caller. There is no frontend yet, so for now GET /:id derives
asOfDate from the server's current UTC date:
`new Date().toISOString().slice(0, 10)`. This is allowed under the UTC-only
rule because `toISOString()` always renders UTC regardless of server
timezone — no local-time getter (getDate, getMonth, etc.) is involved.
Once the frontend exists and supplies the client's local-date string, this
server-clock fallback stays display-only; it is not used for check-in
dates, which are already caller-supplied input.

---

# Pending Review System

## Overview

Immediately marking a missed habit as `missed` would permanently break streaks, revoke rewards, and apply progression penalties the moment a single day is skipped. In practice, users may miss a check-in for legitimate reasons (travel, illness, internet issues, simply forgetting to open the app, etc.).

To make the system more resilient while preserving progression integrity, Aurakon introduces a **Pending Review** stage.

Instead of immediately recording a missed day as `missed`, the system temporarily records it as `pending_review`, giving the user a limited opportunity to review what actually happened before the miss becomes final.

---

## Review Window

Each missed day receives a **48-hour review window**.

During this period, the user can explicitly decide whether the habit was actually completed or genuinely missed.

Possible outcomes:

**Recovered** → the pending review is resolved as recovered. The missed day is treated as completed, preserving streaks and triggering the appropriate progression updates, including completion rewards and any newly eligible progression systems.

**Shielded** → the pending review is resolved as shielded. The day is treated as present for streak progression, but no completion XP is awarded because the habit was not actually completed.

**Missed** → the pending review is finalized as missed. Any progression systems affected by that state transition are then reconciled by the corresponding application workflow.

After the review window expires, unresolved pending reviews are automatically finalized as `missed`.

---

## Pending Review Sessions

Pending reviews are grouped into **review sessions**.

A session represents a continuous review period for a habit and groups consecutive pending-review days together instead of treating every missed day as an isolated workflow.

The session is responsible for:

- grouping related pending reviews;
- tracking whether unresolved reviews still exist;
- remaining active while at least one pending review is still open;
- resolving automatically once every pending review inside the session has been finalized.

This allows the review workflow to remain organized without affecting the independent expiration rules of each missed day.

---

# Expiration Strategy

## Why no Cron Jobs?

This project intentionally avoids cron jobs and background schedulers.

The goal is to keep deployment simple across different environments without requiring additional worker processes or scheduled infrastructure.

Instead, all synchronization is performed lazily during normal authenticated requests.

---

## Logical Timeline

Although pending-review rows are created lazily, the review window is **not** based on the database insertion time.

Using `created_at` would incorrectly grant users a fresh 48-hour review window simply because they opened the application late.

Instead, the review window is anchored to the missed day itself.

```
Missed Day
      │
      ▼
00:00 UTC of the following day
      │
Review window begins      │
      ▼
48-hour review window
      │
      ▼
Automatically finalized as missed
```

This results in the following rule:

```
Review opens   = log_date + 1 day (00:00 UTC)
Review expires = log_date + 3 days (00:00 UTC)
```

Because synchronization is lazy, the corresponding `pending_review` row may be inserted after its logical creation time.

If the user returns after the review window has already expired, the row is still created during synchronization but is immediately finalized as `missed`, ensuring users never receive additional review time simply because they were absent from the application.

This approach preserves the intended behavior while avoiding the operational complexity of cron jobs or background workers.
