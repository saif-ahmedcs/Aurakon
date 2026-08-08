function hasCooldownElapsed(tokenExpiresAt, maxAgeMs, cooldownMs) {
  if (!tokenExpiresAt) return true;

  const issuedAt = new Date(tokenExpiresAt).getTime();
  if (Number.isNaN(issuedAt)) return true;

  return Date.now() - (issuedAt - maxAgeMs) >= cooldownMs;
}

module.exports = { hasCooldownElapsed };
