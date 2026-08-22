function getElapsedSinceIssue(tokenExpiresAt, maxAgeMs) {
  if (!tokenExpiresAt) return null;

  const issuedAt = new Date(tokenExpiresAt).getTime();
  if (Number.isNaN(issuedAt)) return null;

  return Date.now() - (issuedAt - maxAgeMs);
}

function hasCooldownElapsed(tokenExpiresAt, maxAgeMs, cooldownMs) {
  const elapsed = getElapsedSinceIssue(tokenExpiresAt, maxAgeMs);
  if (elapsed === null) return true;

  return elapsed >= cooldownMs;
}

function getCooldownRemainingMs(tokenExpiresAt, maxAgeMs, cooldownMs) {
  const elapsed = getElapsedSinceIssue(tokenExpiresAt, maxAgeMs);
  if (elapsed === null) return 0;

  return Math.max(0, cooldownMs - elapsed);
}

module.exports = { hasCooldownElapsed, getCooldownRemainingMs };
