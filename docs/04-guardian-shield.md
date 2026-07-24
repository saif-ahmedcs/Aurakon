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
- A shield can only be earned while the habit has _zero_ open pending
  reviews, to avoid awarding on unconfirmed data.

> _Design note:_ "Zero open pending reviews" means for the _whole
> habit_, not just the specific day that reached the milestone. If day
> 30 hits the milestone but an earlier day for the same habit is still
> pending_review, the shield is _not_ granted yet — even after day
> 30 itself is resolved. It stays deferred until every pending review
> for that habit has been resolved (recovered or completed, or finally
> missed), at which point the habit is rescanned and the milestone is
> caught retroactively. This is the same "don't award on unconfirmed
> data" rule applied to the whole habit, not just the triggering day.

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
  `shielded` back to `missed`, cascading the re-check from there. **Deleting
  an entire habit is an exception:** any Guardian Shields legitimately earned
  from that habit before deletion remain permanently unlocked and are not
  revoked.
- Resolving a pending review re-evaluates the habit's **current** full
  streak, not just the state as of the reviewed day, so a milestone reached
  on a day completed while the review was still open is correctly caught
  instead of silently skipped.

### Habit Archiving

Archiving a habit takes effect immediately.

Once a habit is archived, it is removed from the active habit set for the current local day and all future days. As a result, it no longer contributes to `total_habits`, `completed_habits`, `full_completion`, or any other active-habit calculations. This may affect future global streak and consistency bonus eligibility.

However, archiving a habit does **not** trigger Guardian Shield reconciliation for shields that were already earned from that habit. Previously awarded Guardian Shields are immutable and are never revoked as a result of archiving or deleting the habit.

This is an intentional exception to the normal reconciliation process.
