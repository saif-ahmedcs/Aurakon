const { CONFIRMATION_IDEMPOTENCY_WINDOW_MS } = require("../utils/constants");
const { BadRequestError } = require("../utils/AppErrors");

const INVALID_TOKEN_MESSAGE = "invalid or expired token";

function classifyConfirmationToken(tokenRow, now = Date.now()) {
  if (!tokenRow) {
    return "expired";
  }

  if (tokenRow.consumedAt) {
    const elapsedMs = now - new Date(tokenRow.consumedAt).getTime();
    return elapsedMs <= CONFIRMATION_IDEMPOTENCY_WINDOW_MS
      ? "recently_consumed"
      : "expired";
  }

  if (!tokenRow.expiresAt || new Date(tokenRow.expiresAt).getTime() <= now) {
    return "expired";
  }

  return "active";
}

async function runIdempotentConfirmation({ findState, execute, tx }) {
  const tokenRow = await findState(tx);
  const state = classifyConfirmationToken(tokenRow);

  if (state === "expired") {
    throw new BadRequestError(INVALID_TOKEN_MESSAGE);
  }

  if (state === "active") {
    await execute(tokenRow, tx);
    return { replay: false, tokenRow };
  }

  return { replay: true, tokenRow };
}

module.exports = {
  classifyConfirmationToken,
  runIdempotentConfirmation,
  INVALID_TOKEN_MESSAGE,
};
