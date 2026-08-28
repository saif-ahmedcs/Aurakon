# Streak Calculation Rules

These rules define the contract for `utils/streak.js`. Tests are written
against this specification, not the implementation.

## Function

```text
calculateHabitStreaks(logs, asOfDate)
→ {
     currentStreak,
     longestStreak,
     currentStreakStartDate
   }
```

- `logs`: array of habit log entries containing:
  - `date` (`"YYYY-MM-DD"`)
  - `status`
- `asOfDate`: caller-supplied `"YYYY-MM-DD"` reference date.

The function never determines "today" itself and never calls
`Date.now()` or `new Date()` without arguments.

## UTC Rule

Dates are parsed into UTC day values using the shared UTC utilities.

No date is parsed via `new Date(string)`, and no local-time getters
(`getDate()`, `getMonth()`, etc.) are used.

## Present Statuses

The following statuses are considered **present** for streak purposes:

- `completed`
- `recovered`
- `shielded`

`pending_review` is **not** a present day. Instead, it may temporarily
bridge two present days as described below.

## Algorithm

### 1. Normalize

- Parse every log date into a UTC day value.
- Ignore logs after `asOfDate`.
- Build a date → status lookup.

### 2. Present Days

Extract all dates whose status is one of the present statuses.

Sort them in ascending order.

### 3. Compute Runs

Two consecutive present days belong to the same run when either:

- they are exactly one day apart; or
- every day between them has status `pending_review`.

Otherwise, a new run begins.

Each run is represented as:

```text
{ length, endDay }
```

### 4. Longest Streak

`longestStreak` is the maximum run length.

If no present days exist:

```text
longestStreak = 0
```

### 5. Current Streak

If no present days exist:

```text
currentStreak = 0
currentStreakStartDate = null
```

Otherwise, let the final run end at `lastPresentDay`.

If `lastPresentDay` can reach `asOfDate` using the same adjacency /
pending-review bridging rules, then:

```text
currentStreak = finalRun.length
currentStreakStartDate = first day of the final run
```

Otherwise:

```text
currentStreak = 0
currentStreakStartDate = null
```

## Edge Cases

- Empty input →
  `{ currentStreak: 0, longestStreak: 0, currentStreakStartDate: null }`
- Duplicate log dates use the latest stored status.
- Logs after `asOfDate` are ignored.
- `pending_review` never counts as a present day.
- Consecutive `pending_review` days may temporarily bridge two present days.
- Once a bridge collapses (for example, a review becomes `missed`), the
  streak is recalculated from the updated statuses.

## GET /:id

`calculateHabitStreaks()` always receives `asOfDate` from its caller.

Until the frontend supplies the client's local date,
`GET /:id` uses:

```js
new Date().toISOString().slice(0, 10);
```

This remains UTC-safe because `toISOString()` always returns UTC.

## Guardian Shield

Guardian Shield uses the same `calculateHabitStreaks()` utility.

While unresolved `pending_review` entries exist, they temporarily bridge
present days.

Once all pending reviews for a habit have been resolved, no bridging
remains possible, so the calculation naturally becomes equivalent to a
strict non-bridging streak calculation.

---

# Pending Review System

## Overview

Missing a day is not immediately treated as `missed`.

Instead, Aurakon creates a temporary pending_review, allowing the user
to confirm what actually happened before progression is affected.

> _Design note:_ This only applies when the habit has an active streak
> to protect. A missed day is checked against the habit's streak as of
> the day before the gap; if that streak is already 0, there is nothing
> at risk, so the day is finalized as missed immediately without ever
> becoming a pending_review. This is intentional — it avoids generating
> review prompts for habits the user has already stopped being consistent
> with. Once a review session is already open for a habit, subsequent
> missed days are always added to it regardless of streak.

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

> _Design note:_ "Consecutive" is measured as the gap between missed
> days, not strict back-to-back calendar days. If a habit misses a day,
> is completed for a few days, then misses again within the grace
> period, those missed days can still be grouped into the same session
> even though a completed day sits between them. This is intentional —
> sessions are just a UI/organizational grouping and never affect any
> individual review's own expiration or any progression math.

## Streak Display Policy

To provide a seamless user experience, the habit streak displayed to the
user (`currentStreak` in `GET /habits/:id`) treats `pending_review` days
as temporary bridges.

- **While Review is Unresolved:** The streak is preserved ("optimistic streak").
- **If Review is Recovered/Shielded:** The streak remains unbroken.
- **If Review Expires / Finalized as Missed:** The bridge collapses, and
  the streak is recalculated without that day.

## Archived Habits

Archiving a habit permanently removes it from the pending review system.
Once a habit is archived, it is no longer eligible to generate new
`pending_review` entries, including during lazy synchronization or
backfilling. Any unresolved reviews that already exist for the habit are
automatically finalized as `missed`, since archived habits are no longer
reviewable.

---

# Expiration Strategy

## No Cron Jobs for Review Expiry

Aurakon intentionally avoids cron jobs and background workers for
pending-review expiration. This keeps review synchronization compatible with
serverless and traditional hosting environments.

Instead, pending-review synchronization happens lazily during normal
authenticated requests.

## Expiration Timeline

Review windows are anchored to the missed day, **not** to the row's
`created_at` timestamp.

```text
Review opens   = start of the user's local day after log_date
Review expires = start of the user's local day three days after log_date
```

A `pending_review` row may be inserted after its logical creation time
because synchronization is lazy.

If synchronization occurs after the review window has already expired,
the row is still created, then immediately finalized as `missed`. This
prevents users from gaining extra review time simply because they were
inactive.
