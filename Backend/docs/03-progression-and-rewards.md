# Progression & Rewards

## XP

- Completion XP is awarded by difficulty:
  - `easy = 10`
  - `medium = 15`
  - `hard = 25`
- Every award is recorded in `xp_completion_log`, keyed by
  `(habit_id, log_date)`, making completion XP idempotent.
- Undo reverses the exact logged amount and removes its ledger entry instead
  of recalculating from the habit's current difficulty.
- `total_xp` is fully rebuildable from `xp_completion_log` and
  `xp_bonus_log` (see Lifecycle & Architecture).

## Titles

Titles are derived from `total_xp` on every read.

|      XP | Title            |
| ------: | ---------------- |
| 90,000+ | Legendary Soul   |
| 55,000+ | Mythic Champion  |
| 30,000+ | Commander        |
| 15,000+ | Aura Master      |
|  7,500+ | Iron Will        |
|  3,500+ | Rising Warrior   |
|  1,500+ | Elite Disciple   |
|    500+ | Disciplined Mind |
|      0+ | New Soul         |

## Levels

Levels are 1-based: every account starts at **level 1** (`computeLevel`
floors its result at 1 and `users.current_level` defaults to 1).

Level is derived from:

- lifetime fully completed days;
- lifetime consistency ratio;
- current global streak (capped at 30 contributing days).

Levels never decrease. Once unlocked, they are permanent achievements rather
than live scores.

Higher levels also increase the active-habit limit
(`utils/habitLimitRules.js`).

## Aura Energy

- Daily aura energy is the day's completion rate: present habits
  (`completed`, `recovered` or `shielded`) divided by the total active
  habits for that date, expressed as a percentage (rounded). Completing
  every existing habit therefore always yields exactly **100%**,
  regardless of habit count or difficulty.
- `shielded` habits count as handled for aura energy (they preserve
  streaks the same way), so a fully shielded day still reaches 100%.

## Daily Aura Stats

One row is maintained per user per day and fully recalculated whenever
relevant data changes:

- `total_habits`
- `completed_habits`
- `full_completion`
- `aura_energy`

full_completion is always based on the user's current active habits. Adding or archiving a habit immediately updates the day's completion requirement. If archiving removes an incomplete habit and all remaining active habits are completed, the day becomes a normal full-completion day, with streaks, levels, and bonus eligibility recalculated automatically.

Bonus XP is intentionally independent of this live value. Each award permanently stores the required habit count at the time it was granted (xp_bonus_log.required_habit_count) and is revalidated against that day's immutable habit_logs, not the live completed_habits value. As a result, adding or archiving habits can never revoke a bonus; only genuine completion reversals (e.g. an undo, a pending review expiring to missed, or a shielded day reverting to missed) can invalidate it.

## Bonus XP (Consistency Bonus)

- Awarded from the **global streak**, not individual habit streaks:
  - every **7 days** → `150 XP`
  - every **30 days** → `750 XP`
- Multiple bonuses may stack on the same day (e.g. day 210).
- Stored per `(user, bonus_type, awarded_date)`, allowing the same
  milestone to be earned again after a future streak rebuild.
- Any retroactive change (e.g. recovering a pending review or reverting a shielded day to `missed`) triggers forward reconciliation, which revokes invalid bonuses and awards newly eligible ones.
- Reconciliation validates each bonus against the habit count frozen at award time, so bonuses can only be revoked by a reduction in that day's completions—not by later adding habits that raise the day's requirement.
