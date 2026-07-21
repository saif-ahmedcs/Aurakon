# Streak Calculation Rules

These rules define the contract for `utils/streak.js`. Tests are written
against this specification, not the implementation.

## Function

```text
calculateStreaks(dateStrings, asOfDate)
→ { currentStreak, longestStreak }
```

- `dateStrings`: array of `"YYYY-MM-DD"` check-in dates.
- `asOfDate`: caller-supplied `"YYYY-MM-DD"` reference date. The function
  never determines "today" itself and never calls `Date.now()` or
  `new Date()` without arguments.

## UTC Rule

Dates are parsed into year/month/day components and converted using:

```js
Date.UTC(year, month - 1, day);
```

No date is parsed via `new Date(string)`, and no local-time getters
(`getDate()`, `getMonth()`, etc.) are used.

## Algorithm

### 1. Normalize

- Parse every date into a UTC day value.
- Remove duplicates.
- Discard dates later than `asOfDate`.
- Sort ascending into `days`.
- Parse `asOfDate` into `asOfDay`.

### 2. Compute Runs

Adjacent days belong to the same run only if their difference is exactly
1 day. A gap of 2+ days starts a new run.

Each run is represented as:

```text
{ length, endDay }
```

### 3. Longest Streak

`longestStreak` is the maximum run length, or `0` if no dates exist.

### 4. Current Streak

If `days` is empty:

```text
currentStreak = 0
```

Otherwise, let the final run end at `lastLogDay`.

- If `asOfDay - lastLogDay` is `0` or `1`, the streak is alive:
  `currentStreak = finalRun.length`.
- If the gap is `2+`, the streak is broken:
  `currentStreak = 0`.

## Edge Cases

- Empty input → `{ currentStreak: 0, longestStreak: 0 }`
- Single date, gap `0–1` → `{1,1}`
- Single date, gap `2+` → `{0,1}`
- Earlier run longer than the latest → `longestStreak > currentStreak`
- Latest run is also the longest → values are equal (expected)
- Duplicate dates are ignored.
- Dates after `asOfDate` are ignored.

## GET /:id

`calculateStreaks()` always receives `asOfDate` from its caller.

Until the frontend supplies the client's local date,
`GET /:id` uses:

```js
new Date().toISOString().slice(0, 10);
```

This remains UTC-safe because `toISOString()` always returns UTC.

## Guardian Shield

Guardian Shield uses a related but different streak calculation: a
`pending_review` day temporarily bridges two present days so an unresolved
review does not prematurely break a habit streak.

---

# Pending Review System

## Overview

Missing a day is not immediately treated as `missed`.

Instead, Aurakon creates a temporary `pending_review`, allowing the user
to confirm what actually happened before progression is affected.

## Review Window

Each missed day receives a **48-hour** review window.

Possible outcomes:

- **Recovered** — treated as completed, preserving streaks and awarding
  any newly eligible progression rewards.
- **Shielded** — treated as present for streak purposes only; no
  completion XP is awarded.
- **Missed** — finalized as missed, then all affected progression systems
  are reconciled.

Unresolved reviews automatically become `missed` after the review window
expires.

## Review Sessions

Consecutive pending-review days for the same habit are grouped into a
single review session.

A session:

- groups related reviews;
- remains active while at least one review is unresolved;
- closes automatically once all contained reviews are finalized.

Sessions organize the workflow only—they do not affect each day's
independent expiration.

---

# Expiration Strategy

## No Cron Jobs

Aurakon intentionally avoids cron jobs and background workers as a design decision to reduce deployment complexity, minimize infrastructure requirements, and remain compatible with serverless and traditional hosting environments.

Instead, pending-review synchronization happens lazily during normal
authenticated requests.

## Expiration Timeline

Review windows are anchored to the missed day, **not** to the row's
`created_at` timestamp.

```text
Review opens   = log_date + 1 day (00:00 UTC)
Review expires = log_date + 3 days (00:00 UTC)
```

A `pending_review` row may be inserted after its logical creation time
because synchronization is lazy.

If synchronization occurs after the review window has already expired,
the row is still created, then immediately finalized as `missed`. This
prevents users from gaining extra review time simply because they were
inactive.
