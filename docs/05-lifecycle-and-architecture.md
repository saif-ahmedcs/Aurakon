# Lifecycle & Architecture

## Undo & Archive Behavior

- Only **today's** direct completion can be undone. Anything resolved
  through the pending review system (recovered, shielded, or missed) is
  final once decided.
- Deleting a habit soft-archives it (`archived_at`), auto-resolves any of
  its open pending reviews as `missed`, and keeps all historical logs and
  shield records intact for progression accuracy.

## Derived State Philosophy

Every progression value that can be rebuilt from a source-of-truth log is
rebuilt, not incrementally trusted forever: shield balance from
`guardian_shield_log`, level from `daily_aura_stats`, global streak from
`daily_aura_stats`, and total XP from the XP ledgers. This keeps the system
self-healing against partial failures, retries, or out-of-order sync,
instead of depending on every write path getting every delta exactly right,
forever.
