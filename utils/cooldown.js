function hasCooldownElapsed(tokenExpiresAt, maxAgeMs, cooldownMs) {
  if (!tokenExpiresAt) return true;
  const issuedAt = new Date(tokenExpiresAt).getTime() - maxAgeMs;
  return Date.now() - issuedAt >= cooldownMs;
}

module.exports = { hasCooldownElapsed };
