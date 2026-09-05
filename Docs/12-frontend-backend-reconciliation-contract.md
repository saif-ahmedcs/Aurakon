# Frontend ↔ Backend Reconciliation Contract

How the dashboard is required to react to the outcome of any mutation it
sends to the backend. This document covers `hooks/useHabits.js`,
`hooks/useReviewSession.js`, `services/dashboardApi.js`, and the wiring
between them in `components/dashboard/DashboardApp.jsx`. It is the
client-side counterpart to `09-review-sync-and-finalization.md`: that
document is how the *server* catches progression state up when nobody's
watching; this one is how the *frontend* stays honest about what it does
and doesn't actually know after a request it just made.

The rule, stated once up front: **no response to a mutation is treated as
final by itself.** Streaks, pending reviews, XP, level, shields, and aura
are all computed server-side. Every mutation — whether it succeeds, fails
with a known reason, or fails ambiguously — is followed by an authoritative
re-sync of whatever it could have changed.

## 1. The core rule

Local state is optimistic for responsiveness; it is never the source of
truth. The comment at the top of `useHabits.js` states this directly: local
state is "re-synced from `GET /api/habits/:id` after every mutation."
"Optimistic" describes the *display*, not the *data* — the instant flip
exists so the UI feels immediate, not because it's trusted to be correct.

## 2. Classifying the outcome of a request

Every mutation call resolves to exactly one of four outcomes
(`dashboardApi.js`'s `handleResponse` / `handleNetworkError`), and each has
a different reconciliation rule:

| Outcome | Signal | Rule |
|---|---|---|
| Confirmed success | `res.ok` | Apply the response, but still refresh — the server may compute more than the optimistic guess did (streak bump, bonuses, shields) |
| Confirmed conflict | HTTP `409` | Treat as a **real mutation**, not a failure — bump the mutation epoch and refresh; never silently revert |
| Ambiguous / unconfirmed failure | network error (`status: 0`) or other `4xx`/`5xx` | Revert to the last snapshot **and** re-fetch from the server — the revert alone is never trusted, since the request may have partially landed before the error reached the client |
| Rate limited | HTTP `429` | Touch nothing; surface `retryAfter` and let the user retry — the one outcome where nothing is known to have happened |

The error shape itself (`{status, error, fields, retryAfter}` for HTTP
failures, `{status: 0, error}` for network failures) is constructed once in
`dashboardApi.js` so every hook branches on it the same way instead of each
inventing its own failure handling.

## 3. The optimistic-update pattern

Illustrated by `toggleHabitCompletion` in `useHabits.js`:

1. Flip local state immediately (for responsiveness only).
2. Fire the request.
3. On *every* settlement — success or failure — call the per-habit
   authoritative refresh (`refreshHabit`). The optimistic number is never
   left standing as the final one.

The same shape repeats in `undoCheckIn`, `deleteHabit`, `updateHabit`,
`addHabit`, and `resolveCurrentReviewItem`. A new mutation added to the
dashboard should follow this shape rather than invent a new failure path.

## 4. Never let a stale read win a race

A full reload (`load()` in `useHabits.js`) can overlap with a mutation
in flight elsewhere. Applying whatever `load()` fetched unconditionally
could clobber a more recent mutation's result. Three primitives close this:

- `mutationEpoch` — a counter bumped once any tracked mutation settles.
- `pendingMutations` — the live set of in-flight mutation promises.
- `refreshSeq` (per habit id) — so a slower, older refresh for the same
  habit can never overwrite a newer one that already resolved.

`load()`'s rule: snapshot the epoch and the in-flight set before fetching.
If either has moved by the time the fetch resolves, that snapshot cannot be
trusted — refetch instead of applying it (bounded to 5 attempts).

## 5. Fan-out: one mutation can change a different entity

Guardian Shields are a shared wallet and streak bridging can cascade, so a
single mutation's response can name other habits the server silently
rewrote (`affectedHabitIds`). Any caller reading a mutation response must:

- Re-sync the habit(s) it directly mutated.
- Re-sync every id in `affectedHabitIds` too (`refreshHabits`).
- Refresh `/api/progress` whenever XP, level, shields, or aura could
  plausibly have moved — any log or review-decision mutation qualifies.

The same fan-out applies to `refreshProgress()` itself: lazy server-side
finalization (`09-review-sync-and-finalization.md`) can reconcile shields
on habits unrelated to whatever triggered the `GET`, so `refreshProgress`
chases down `affectedHabitIds` from the progress response too.

## 6. Reversed rewards must be announced, not just applied

A reconciliation can silently revoke an already-awarded bonus or shield —
an undo, a missed-review decision, or lazy catch-up on next login. If the
resulting drop in XP or shield balance isn't explained, it reads as
unexplained data loss even though the number is now correct. Rule: any
refresh response carrying `reversedBonuses` / `reversedShields` /
`earnedBonuses` / `earnedShields` must announce them via toast, using the
same wording regardless of which flow triggered the refresh —
`announceReversedRewards` / `announceEarnedRewards` are deliberately
duplicated in `useReviewSession.js` and `DashboardApp.jsx` rather than
routed through one call site.

## 7. Serialize around cross-cutting writes

`POST /api/review/decisions` reads and rewrites shared per-user progression
state before it takes the same row lock a habit check-in/undo takes. If the
review modal could be dismissed while a decision commit was still in
flight, a check-in fired from elsewhere in the dashboard could interleave
with it. Rule: `decisionInFlight` blocks the modal from closing —
`closeReviewSession` no-ops while `resolvingRef` is true — until the commit
settles.

## 8. Never double-submit

Two independent in-flight guards exist purely to reject a second click
while the first request for the *same target* is still outstanding:

- `toggleInFlight` — a `Set` of habit ids, in `useHabits.js`.
- `resolvingRef` — a single flag guarding the current review item, in
  `useReviewSession.js`.

Any new mutation entry point needs an equivalent per-target guard — reuse
an existing one where the target overlaps, add a new one where it doesn't.

## 9. What "unconditional refresh" does not mean

- **Not** a full-list refetch after every action — refresh is scoped to
  the habit(s) or progress actually implicated by the mutation.
- **Not** a blocking UI — the optimistic value stays on screen until the
  refresh resolves; only a confirmed or ambiguous failure reverts early.
- **Not** applied to `429` — nothing is known to have happened, so there
  is nothing to reconcile.

## Guarantees, tradeoffs, and limitations

| Guaranteed | Intentional tradeoff | Non-blocking limitation |
|---|---|---|
| No optimistic value is ever left as the final state shown to the user | Every mutation costs at least one extra round trip (the refresh) beyond the mutation itself | Reconciliation is per-hook state, not a shared client cache — two components reading the same habit each refresh independently |
| A `409` is always treated as a real, confirmed change, never silently discarded | `load()` can retry up to 5 times against a busy account before applying a possibly-stale snapshot | `refreshHabit` failures are silent by design — optimistic state persists until the next successful sync, so a long outage can leave stale data on screen with no visible error |
| A network or ambiguous failure always triggers both a revert and a re-fetch, never one alone | `decisionInFlight` blocks the review modal from closing rather than allowing a mid-request cancel | |

## Reviewer takeaways

The recurring bug this contract exists to close was always the same shape:
a mutation with an ambiguous outcome — a network error, a `409`, a stale
in-flight race — got treated as "nothing happened" instead of "something
might have happened, go check." Every mechanism in this document that
looks like extra defensiveness — the epoch counter, the `affectedHabitIds`
fan-out, the reversed-reward announcements — is directly answering one
instance of that shape. Any new mutation added to the dashboard should be
checked against §2 first: what are its possible outcomes, and does each
one either apply a known truth or trigger a refresh? If there's a path
where neither happens, that's the same bug returning.
