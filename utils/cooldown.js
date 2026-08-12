function hasCooldownElapsed(tokenExpiresAt, maxAgeMs, cooldownMs) {
  if (!tokenExpiresAt) return true;

  const issuedAt = new Date(tokenExpiresAt).getTime();
  if (Number.isNaN(issuedAt)) return true;

  return Date.now() - (issuedAt - maxAgeMs) >= cooldownMs;
}

function getCooldownRemainingMs(tokenExpiresAt, maxAgeMs, cooldownMs) {
  if (!tokenExpiresAt) return 0;

  const issuedAt = new Date(tokenExpiresAt).getTime();
  if (Number.isNaN(issuedAt)) return 0;

  const elapsed = Date.now() - (issuedAt - maxAgeMs);
  return Math.max(0, cooldownMs - elapsed);
}

module.exports = { hasCooldownElapsed, getCooldownRemainingMs };
