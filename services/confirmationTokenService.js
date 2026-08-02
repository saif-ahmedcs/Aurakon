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

async function runIdempotentConfirmation({ findState, execute, onReplay, tx }) {
  if (!tx || typeof tx.query !== "function") {
    throw new Error(
      "transaction connection is required for idempotent confirmation",
    );
  }
  if (typeof findState !== "function") {
    throw new Error("findState callback is required");
  }
  if (typeof execute !== "function") {
    throw new Error("execute callback is required");
  }

  const tokenRow = await findState(tx);
  if (tokenRow === undefined) {
    throw new Error("findState must return a token state object or null");
  }

  const state = classifyConfirmationToken(tokenRow);

  if (state === "expired") {
    throw new BadRequestError(INVALID_TOKEN_MESSAGE);
  }

  if (state === "active") {
    await execute(tokenRow, tx);
    return { replay: false, tokenRow };
  }

  if (onReplay) {
    await onReplay(tokenRow, tx);
  }

  return { replay: true, tokenRow };
}

module.exports = {
  classifyConfirmationToken,
  runIdempotentConfirmation,
  INVALID_TOKEN_MESSAGE,
};
