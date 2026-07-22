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

Level is derived from:

- lifetime fully completed days;
- lifetime consistency ratio;
- current global streak (capped at 30 contributing days).

Levels never decrease. Once unlocked, they are permanent achievements rather
than live scores.

Higher levels also increase the active-habit limit
(`utils/habitLimitRules.js`).

## Aura Energy

- Daily aura energy is the sum of difficulty-based energy from
  `completed` and `recovered` habits, capped at **100/day**.
- `shielded` days preserve streaks but grant no aura energy.

## Daily Aura Stats

One row is maintained per user per day and fully recalculated whenever
relevant data changes:

- `total_habits`
- `completed_habits`
- `full_completion`
- `aura_energy`

`full_completion` is always evaluated against the user's **current**
active habit set. Adding a habit immediately affects that day's completion
requirement, but previously awarded Bonus XP is never revoked.

## Bonus XP (Consistency Bonus)

- Awarded from the **global streak**, not individual habit streaks:
  - every **7 days** → `150 XP`
  - every **30 days** → `750 XP`
- Multiple bonuses may stack on the same day (e.g. day 210).
- Stored per `(user, bonus_type, awarded_date)`, allowing the same
  milestone to be earned again after a future streak rebuild.
- Any retroactive change (such as recovering a pending review or reverting
  a shielded day to `missed`) triggers forward reconciliation, revoking
  invalid bonuses and awarding newly eligible ones.
