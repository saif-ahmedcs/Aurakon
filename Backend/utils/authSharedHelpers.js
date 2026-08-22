const bcrypt = require("bcrypt");
const confirmationTokenService = require("../services/confirmationTokenService");
const {
  UnauthorizedError,
  BadRequestError,
  TooManyRequestsError,
} = require("./AppErrors");
const { hasCooldownElapsed, getCooldownRemainingMs } = require("./cooldown");
const { CONFIRMATION_IDEMPOTENCY_WINDOW_MS } = require("./constants");

const CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS = Math.floor(
  CONFIRMATION_IDEMPOTENCY_WINDOW_MS / 1000,
);

async function assertCurrentPassword(currentPassword, passwordHash) {
  const passwordMatch = await bcrypt.compare(currentPassword, passwordHash);
  if (!passwordMatch) {
    throw new UnauthorizedError("invalid current password");
  }
}

function assertPasswordStillValid(tokenRow, preTokenRow, passwordMatch) {
  const hashUnchanged = tokenRow.passwordHash === preTokenRow?.passwordHash;
  if (!hashUnchanged || !passwordMatch) {
    throw new UnauthorizedError("invalid current password");
  }
}

function assertCooldownElapsed(tokenExpiresAt, maxAgeMs, cooldownMs, message) {
  if (hasCooldownElapsed(tokenExpiresAt, maxAgeMs, cooldownMs)) {
    return;
  }
  const retryAfterSeconds = Math.ceil(
    getCooldownRemainingMs(tokenExpiresAt, maxAgeMs, cooldownMs) / 1000,
  );
  throw new TooManyRequestsError(message, retryAfterSeconds);
}

async function checkTokenState({
  tokenHash,
  findState,
  clearExpired,
  alreadyCompletedMessage,
  activeMessage,
}) {
  const tokenRow = await findState(tokenHash);
  const state = confirmationTokenService.classifyConfirmationToken(tokenRow);

  if (state === "recently_consumed") {
    return { message: alreadyCompletedMessage, alreadyCompleted: true };
  }

  if (state === "expired") {
    await clearExpired(tokenHash, CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS);
    throw new BadRequestError("invalid or expired token");
  }

  return { message: activeMessage };
}

module.exports = {
  assertCurrentPassword,
  assertPasswordStillValid,
  assertCooldownElapsed,
  checkTokenState,
  CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
};
