# Guardian Shield

A Guardian Shield lets a genuinely missed day still count as "present" for
streak purposes, without awarding completion XP for it — it protects the
streak, it doesn't fake a completion.

## Earning a Shield

- Milestone interval depends on habit difficulty:
  - **Hard** habits: every **30** consecutive present days.
  - **Medium** habits: every **45** consecutive present days.
  - **Easy** habits are not shield-eligible.
- "Present" days are `completed`, `recovered`, or `shielded` — the same
  per-habit streak used throughout this system (see the Streaks doc),
  including its pending-review bridging behavior.
- A shield can only be earned while the habit has **zero** open pending
  reviews, to avoid awarding on unconfirmed data.

## Spending a Shield

- Shields are a **shared wallet**, not per-habit — the balance is a simple
  count of available awards across all of a user's habits.
- Spending a shield draws the oldest available award, regardless of which
  habit originally earned it. A shield earned on a hard habit can protect a
  missed day on a medium habit or easy habit, and vice versa.

## Reconciliation

- Shields are reconciled, not permanent: if a later correction (an undo, a
  missed-review decision, or a resolved review) shows the streak that earned
  a shield no longer holds, the shield is revoked — and if it had already
  been spent on a different habit's pending day, that day is reverted from
  `shielded` back to `missed`, cascading the re-check from there.
- Resolving a pending review re-evaluates the habit's **current** full
  streak, not just the state as of the reviewed day, so a milestone reached
  on a day completed while the review was still open is correctly caught
  instead of silently skipped.
