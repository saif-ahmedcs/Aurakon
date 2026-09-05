# Review Sync & Finalization Engine

How Aurakon keeps streaks, XP, aura stats, and levels correct for users who
don't open the app every day, without a scheduler. This document covers
`services/reviewSyncService.js`, `models/finalizationCheckpointModel.js`,
`middleware/finalizeReviews.js`, and `scripts/backfillFinalizationCheckpoint.js`,
plus the collaborators needed to understand the flow
(`pendingReviewSessionService`, `guardianShieldService`,
`dailyAuraStatsService`, `levelService`). The domain rules for streaks,
pending reviews, and shields are already specified in
`02-streaks-and-pending-reviews.md` and `04-guardian-shield.md` — this
document doesn't repeat them, only how the sync engine invokes and sequences
them.

## 1. What problem this solves

Every progression value in Aurakon — streaks, XP, aura energy, level — is a
function of what each habit's status was on each day. But nothing forces a
user to open the app on any given day. A habit can go days or months without
an explicit `completed`, `recovered`, `shielded`, or `missed` outcome for a
given date, and until _something_ decides what that day was, downstream
state is either wrong or undefined: streaks would look unbroken past a gap
that was never recorded, pending-review sessions that logically expired days
ago would still show as open, and aggregates like `daily_aura_stats` and
level would be computed against an incomplete day.

"Lazy finalization" is the process that closes this gap: for every date up
to yesterday that hasn't had an outcome decided for it yet, the engine
decides one (`missed`, or a `pending_review` if a streak is genuinely at
risk) and reconciles everything that depends on that decision — daily aura
stats, streaks, guardian shields, consistency bonuses, and level.

## 2. Why request-driven, not cron-driven

`02-streaks-and-pending-reviews.md` already establishes the project-wide
policy of avoiding cron jobs and background workers for review expiration,
to stay deployable on serverless as well as traditional hosting. The
finalization engine extends the same policy to missed-day detection in
general: there is no scheduled job for it anywhere in `cleanupRunner.js`.
`evaluatePendingReviews` has exactly two callers in the whole codebase —
`finalizeReviews` middleware (request time) and the standalone backfill
script (manual, operational). Nothing calls it on a timer.

This buys two things:

- **No dependency on a long-running process for correctness.** Since the
  only durable state is the checkpoint row and the habit logs themselves
  (both in the database), it doesn't matter if the server restarts between
  a user's visits — the next authenticated request picks up exactly where
  the checkpoint left off.
- **Work is only ever spent on accounts someone is actively using.** A
  cron sweep would pay a cost for every account on every run, active or not.
  Here, an abandoned account never costs anything until (if ever) someone
  logs into it again.

The tradeoff is that a user's progression data can be stale _between_
requests. This is invisible in practice, because `finalizeReviews` runs
before the route handler on every route that reads progression data — by
the time a response is built, the data being read was just brought current
by the same request. The place this tradeoff is actually visible is outside
the request path entirely (e.g. an operator querying the database directly,
or an account that has genuinely never logged back in) — which is exactly
what the backfill script (§10) exists to handle.

## 3. Execution flow

```
Client request
   |
   v
authenticate                 (populates req.user: id, timezone)
   |
   v
authenticatedSurfaceLimiter
   |
   v
finalizeReviews  ---------------------------------------------------+
   |                                                                 |
   v                                                                 |
evaluatePendingReviews(userId, timezone)                             |
   |                                                                 |
   +-- hasPendingWork? --- no -> return immediately (no writes)  <---+
   |
  yes
   |
   v
runCatchUpBatch loop
   (each iteration: one transaction, users row locked FOR UPDATE,
    up to 30 days finalized, checkpoint advanced to the last day done)
   |
   v
final transaction (users row locked FOR UPDATE):
   - expire pending_review logs past the grace-period cutoff
   - reconcile guardian shields from the earliest expired date forward
   - recalculate + persist level, only if any work happened
   |
   v
next()  ->  route handler runs against fully caught-up state
```

`finalizeReviews` is mounted with `router.use(finalizeReviews)` at the top
of exactly four routers — `habits`, `review`, `profile`, `progress` —
always after `authenticate` (it needs `req.user.id`/`req.user.timezone`) and
before any route-specific handler. It runs on every request to any endpoint
under those four routers, not a subset. It is deliberately not mounted on
`auth.js` or `demo.js`: login, password/email change, logout, and account
deletion don't read or depend on progression state, so there's nothing for
it to reconcile there.

**Fresh user (no habits yet):** `hasPendingWork` finds no
`earliestCreatedAt` and returns `false` immediately — two lightweight reads,
no transaction, no writes.

**Already-synchronized user (opens the app daily):** the checkpoint is
already at yesterday and there are no stale reviews — same fast path as
above, functionally free.

**User returning after missed days:** `hasPendingWork` returns `true` and
the full catch-up path in §7 runs before the request completes.

## 4. The finalization checkpoint

`user_finalization_checkpoint` is a single row per user (`user_id` is the
primary key) holding one column, `last_finalized_date`. It's a watermark,
not a log: it means "every date up to and including this one has had its
own finalization decision made, for every habit this user has." It says
nothing about _what_ was decided — that lives in `habit_logs`, the actual
source of truth.

**Why it exists:** without it, every evaluation would need to work out
where to resume by inspecting `habit_logs` for gaps, which is ambiguous —
a missing log row can mean either "not yet processed" or "doesn't need a
row" depending on context. The checkpoint turns "where do I resume?" into a
single indexed lookup: start at `checkpoint + 1`.

**How it stays trustworthy:**

- It's written only inside the same transaction as the day-processing work
  it certifies — `setLastFinalizedDate` is the last call in
  `runCatchUpBatch`, using the last date actually processed in that batch,
  before that transaction commits. It can never claim a day is done unless
  that day's writes actually committed.
- The write itself is monotonic: `INSERT ... ON DUPLICATE KEY UPDATE
last_finalized_date = GREATEST(last_finalized_date, VALUES(...))`. No call,
  correct or buggy, can move it backward.

**What it does _not_ track:** whether an already-opened `pending_review`
has since expired. A day that resolves to `pending_review` has had its own
finalization decision made (open a review) — the checkpoint correctly
advances past it. But that review's grace-period expiry is a _separate_
event that can happen on a later date, independent of when the underlying
day was processed. That's why `hasPendingWork` checks two independent
conditions — `checkpoint` behind yesterday, _or_ a stale unresolved review
exists — and why review expiry (§7) is re-evaluated on every call rather
than being folded into the checkpoint.

## 5. Idempotency

The requirement: running finalization for a user twice, back-to-back or
overlapping, must land on the same logical end state as running it once.
This holds, but it's not one mechanism — it's several independent
guarantees stacked at different layers:

| Layer                                      | Guarantee                                                                                            | Enforced by                                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `habit_logs` rows                          | A second attempt to create a log for an already-decided day is a silent no-op                        | `UNIQUE(habit_id, log_date)` + `INSERT IGNORE`                                                              |
| Day candidate selection                    | An already-finalized date produces zero candidate habits on re-entry                                 | `getHabitsMissingLogForDate`'s `NOT EXISTS` filter                                                          |
| `daily_aura_stats`                         | Re-running the recalculation for a date overwrites with the same derived values, never double-counts | Upsert keyed on `UNIQUE(user_id, stat_date)`, values always re-derived from `habit_logs`, never incremented |
| `user_finalization_checkpoint`             | Can't regress or double-advance                                                                      | `GREATEST()`-guarded upsert                                                                                 |
| `pending_review_sessions.last_missed_date` | Can't regress                                                                                        | `GREATEST()`-guarded update                                                                                 |
| Level                                      | Re-running produces the same level, since it's not incremented                                       | Fully re-derived from `daily_aura_stats` lifetime aggregates + reconciled streak                            |

The `habit_logs` unique constraint is the strongest guarantee in the list —
it holds at the database layer even if the application-level "does a log
already exist" check were somehow bypassed.

**Honest limitation:** the multi-step reconciliation _within_ a single new
day (deciding pending-review vs. missed, then awarding/reversing bonuses and
shields) is sequenced application code, not one atomic statement. Its safety
doesn't come from each intermediate step being independently idempotent —
it comes from the fact that a day only ever enters that logic once, because
once it has a log row, `getHabitsMissingLogForDate` never selects it again.
Combined with the locking in §6, this is never actually exercised
concurrently in practice, but it's worth naming as the design's actual
mechanism rather than overclaiming step-level atomicity that isn't there.

## 6. Concurrency & race-condition protection

Consider two concurrent authenticated requests for the same user — e.g. two
browser tabs, one hitting `/habits` and the other `/progress` at roughly the
same time. Two layers protect against this:

**In-process de-duplication** (`inFlightByUser` map in
`reviewSyncService.js`): if `evaluatePendingReviews(userId, ...)` is already
running for that user in the current Node process, a second concurrent call
for the same user id is handed the same in-flight promise instead of
starting independent work. This is a real optimization, but it's
process-local — it does nothing across multiple server instances behind a
load balancer.

**Row-level locking** (`SELECT id FROM users WHERE id = ? FOR UPDATE`, at
the top of both `runCatchUpBatch` and the final expiry/level transaction):
this is what actually guarantees correctness across processes. Two
concurrent finalizations for the same user — from two processes, or a
request racing the backfill script — serialize on this lock. The second
transaction blocks until the first commits, then re-reads the checkpoint
and sees the first transaction's committed result. Combined with the
idempotency guarantees in §5, the second transaction either finds nothing
left to do (fast exit, no candidate days/reviews) or resumes exactly where
the first stopped — never redoing or double-applying work.

**Can duplicate finalization actually happen?** Not in a way that corrupts
state. The row lock rules out truly concurrent writes for the same user;
the unique constraints and `INSERT IGNORE` rule out duplicate log rows even
in a scenario the lock somehow missed; the checkpoint's monotonic write
rules out double-counting via a regressed watermark. The one real,
observable effect of concurrent requests for the same user is wasted
latency, not wasted correctness: if the in-process map doesn't catch the
race (different processes), one request does real work while the other
blocks on the row lock and then finds nothing to do.

There is no per-habit or per-day locking, and none is needed — all of a
day's candidate habits, and all of a batch's days, are processed
sequentially inside the one transaction that already holds the user-level
lock, so there's no parallelism within a single evaluation to race against.

## 7. Catch-up behavior

A user returning after N missed days resumes from `checkpoint + 1` (or the
earliest habit's creation date, for a user who's never been finalized).
`runCatchUpBatch` processes up to `CATCH_UP_BATCH_DAYS` (30) calendar days,
one at a time, in order, inside a single transaction, sharing one
completion cache across the batch so repeated per-habit log lookups within
it don't re-hit the database once per day. If more than 30 days are owed,
`runEvaluatePendingReviews` loops, calling `runCatchUpBatch` again — a new
transaction, a fresh lock acquisition, a fresh checkpoint advance — until
the checkpoint reaches yesterday.

For each day, per habit: if the habit has a streak at risk as of the day
before the gap, or already has an open review session, the missed day opens
or extends a `pending_review` (grouping rules are in
`02-streaks-and-pending-reviews.md`). Otherwise it's finalized straight to
`missed`. Archived habits always go straight to `missed`, matching the
documented rule that archived habits are excluded from the review system.

Once every batch is done, a **separate final transaction** handles review
_expiry_, independent of how many days the batches processed: any
`pending_review` log past the grace-period cutoff flips to `missed`
(`expireStaleReviewsForUser`), its session closes if nothing else is
pending on it, and — because collapsing a bridging `pending_review` into
`missed` can retroactively break a streak that was holding across it —
guardian shields are re-reconciled from the earliest such date forward
(`guardianShieldService.reconcileShieldsFromDate`), which can itself reverse
previously-earned shields or bonuses, or grant ones that weren't eligible
before (see `03-progression-and-rewards.md` and `04-guardian-shield.md` for
the reward rules themselves). Finally, if this evaluation did any real work
at all — catch-up days, review expiry, or both — `levelService
.recalculateAndPersistLevel` runs once, at the end.

## 8. Failure and recovery semantics

- **Mid-batch failure:** any error inside `runCatchUpBatch`'s transaction
  rolls back the whole batch — no log inserts, no aura-stat upserts, and no
  checkpoint advance (the checkpoint write is the last statement in the
  batch's transaction). The next call starts a fresh transaction from the
  same, unmoved checkpoint and reprocesses that batch's days from scratch,
  which is safe because of the idempotency guarantees in §5.
- **Transient lock contention:** `runInTransaction`'s automatic retry
  (documented in `07-security.md`) applies here — `ER_LOCK_DEADLOCK` /
  `ER_LOCK_WAIT_TIMEOUT` are retried up to 3 times before surfacing as a
  real failure.
- **A later batch fails after earlier batches committed:** the earlier
  batches' work and checkpoint advances are already durable and are not
  undone. The user just hasn't reached `yesterday` yet; the next call
  resumes from wherever the last successful batch left the checkpoint.
- **The final expiry/level transaction fails:** the day-by-day habit log
  state from the batches is already correct and durable regardless. Only
  the expiry/level step needs to run again, and it naturally does — it
  isn't checkpointed (§4), so every call re-evaluates it in full.
- **`finalizeReviews` itself throws:** the error propagates via
  `asyncHandler`, the request fails before reaching the route handler, and
  nothing is returned to the client mid-reconciliation. A retry re-enters
  the same logic against whatever was actually committed.

In every case, the next call safely resumes the unfinished work rather than
needing manual intervention, because the checkpoint and the per-day log
rows only ever reflect what was actually committed.

## 9. Performance characteristics

- **Already-synchronized request (the common case):** `hasPendingWork` is
  two lightweight, indexed reads — a checkpoint lookup by primary key and a
  `MIN(created_at)` over the user's habits — with no transaction opened.
  This is the cost paid by the large majority of requests to the four
  routers that mount it.
- **Catch-up path:** cost scales with missed days × habits, bounded per
  transaction to 30 days. A user absent for a year triggers roughly a dozen
  sequential batch transactions on their _next_ request, done synchronously
  before that request responds — not spread across future requests. This
  keeps any single transaction's lock duration and size predictable, at the
  cost of that one request taking noticeably longer.
- **Nobody pays for an account that isn't active.** Since there's no cron
  sweep, a dormant account's catch-up cost is paid exactly once, by whoever
  eventually triggers it (a real login, or the backfill script) — never
  paid speculatively on their behalf.

## 10. Backfill script

`scripts/backfillFinalizationCheckpoint.js` implements no finalization logic
of its own — it calls the exact same `reviewSyncService.evaluatePendingReviews`
used by `finalizeReviews`, once per user, for every row in `users`,
sequentially. Because it's the identical, checkpoint-driven, idempotent code
path:

- **It's safe to re-run.** A user who's already caught up costs it one
  fast-path check and moves on.
- **It's safe to run alongside live traffic.** It goes through the same
  row-level locking as any request-triggered call, so it can only queue
  behind a concurrent evaluation for the same user, never race it into a
  corrupted state.

Its purpose is proactive rather than corrective: it lets an operator catch
every account up to the present without waiting for each user's own next
login — useful right after this system was first deployed (existing
accounts had no checkpoint row until their first evaluation), before
relying on `daily_aura_stats` for any cross-account reporting, or simply to
avoid a long first-request latency spike for a user returning after a long
absence. Per-user work is wrapped in `try`/`catch` so one bad record doesn't
abort the run, and it reports a succeeded/failed count at the end. It is
**not** wired into `cleanupRunner.js` and is not run on any schedule by the
application — it's a manual, operational script, the same category as
`resetDemoAccount.js`.

## 11. Design decisions & tradeoffs

**Lazy reconciliation instead of scheduled sweeps**
_Decision:_ finalization only happens as a side effect of an authenticated
request, or the manual backfill script — never on a timer.
_Why:_ extends the project's existing no-cron policy (§2) from review
expiry to missed-day detection generally, keeps the app deployable without
a long-running background process, and never spends work on inactive
accounts.

**A durable, monotonic checkpoint instead of scanning for gaps**
_Decision:_ one watermark date per user, advanced only forward, written in
the same transaction as the work it certifies.
_Why:_ turns "where do I resume?" into an O(1) lookup and makes the
watermark trustworthy in both directions — it can't lag committed work and
can't regress past it.

**Idempotent writes as the primary correctness tool, not locking alone**
_Decision:_ every write in the pipeline is either uniquely-keyed with
`INSERT IGNORE`/upsert semantics, or fully re-derived from source data
rather than incremented.
_Why:_ locking prevents concurrent writers from interleaving, but doesn't
by itself make a _retried_ write safe. Idempotency is what makes "just
retry the transaction" a sufficient recovery strategy after any failure,
without bespoke rollback logic per failure mode.

**Chunked catch-up instead of one unbounded transaction**
_Decision:_ at most 30 days finalized per transaction, looping across
multiple transactions for longer gaps.
_Why:_ bounds the per-user lock hold time and transaction size even for a
dormant account with years of history, trading a few extra round-trips for
predictability.

**User-level locking, not per-habit or per-day**
_Decision:_ both the catch-up and expiry/level transactions lock the
`users` row for the acting user, not individual `habit_logs` or
`daily_aura_stats` rows.
_Why:_ level and aura stats aggregate across all of a user's habits
together, so per-habit locking wouldn't enable any real parallelism within
one evaluation anyway. User-level locking is simpler and matches the same
pattern used for login/refresh/password-change (`07-security.md`).

**Review expiry kept independent of checkpoint progress**
_Decision:_ the checkpoint tracks which dates have had a finalization
decision made; whether an already-decided `pending_review` has since
expired is re-checked every call, never folded into the checkpoint.
_Why:_ a day's finalization and a later review's expiry are genuinely
different events on different dates. Merging them would make the checkpoint
either hide still-open reviews or never advance cleanly.

**Level recomputed once per evaluation, not once per day**
_Decision:_ `recalculateAndPersistLevel` runs a single time at the end,
only if something actually changed.
_Why:_ level is a cheap aggregate derivation and no intermediate per-day
value is ever externally visible, so recomputing it N times inside the day
loop would have no observable benefit over computing it once.

## Guarantees, tradeoffs, and limitations

| Guaranteed                                                                                 | Intentional tradeoff                                                                      | Non-blocking limitation                                                                              |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A day's `habit_logs` outcome is written at most once (unique constraint + `INSERT IGNORE`) | Catch-up work runs synchronously on the triggering request, not spread across future ones | In-process de-dup (`inFlightByUser`) doesn't cover multiple server instances — only the DB lock does |
| The checkpoint can only move forward, never regress                                        | 30-day batching trades extra round-trips for bounded lock duration                        | The review-expiry pass fully re-scans for stale reviews on every call rather than being checkpointed |
| `daily_aura_stats` and level are always fully re-derived, never incremented                | No cron/background worker — catch-up cost is paid once, by whoever triggers it            | Backfill script processes users sequentially, one at a time                                          |
| Concurrent finalization for the same user serializes via `FOR UPDATE` on the `users` row   | Level is recomputed once per evaluation, not once per day                                 |                                                                                                      |

## 12. Reviewer takeaways

This is eventual consistency without a scheduler: the classic "catch up on
missed cron runs" problem is pushed into the request path itself, made safe
by stacking several independent, layered guarantees — unique constraints,
`NOT EXISTS` candidate filtering, a monotonic checkpoint, and user-level row
locking — any one of which would already prevent the main failure modes on
its own. Nothing here depends on a single clever trick holding up the whole
system.

Two things worth a reviewer's attention specifically: the one real
limitation (in-process-only request de-duplication) is a performance
nicety, not a correctness gap — the database lock is the actual safety net,
and the in-memory map only avoids some redundant work within a single
process. And the backfill script isn't a separate implementation that could
drift from request-time behavior over time — it's the identical function,
called in a loop, which is a small but meaningful property for anyone
evaluating whether an operational tool actually matches production
behavior.
