const { CONFIRMATION_IDEMPOTENCY_WINDOW_MS } = require("../utils/constants");
const { BadRequestError } = require("../utils/AppErrors");

const INVALID_TOKEN_MESSAGE = "invalid or expired token";

function classifyConfirmationToken(tokenRow, now = Date.now()) {
  if (!tokenRow) {
    return "expired";
  }

  if (tokenRow.consumedAt) {
    const consumedAtMs = new Date(tokenRow.consumedAt).getTime();

    if (Number.isNaN(consumedAtMs)) {
      return "expired";
    }

    return now - consumedAtMs <= CONFIRMATION_IDEMPOTENCY_WINDOW_MS
      ? "recently_consumed"
      : "expired";
  }

  const expiresAtMs = tokenRow.expiresAt
    ? new Date(tokenRow.expiresAt).getTime()
    : Number.NaN;

  if (Number.isNaN(expiresAtMs) || expiresAtMs <= now) {
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
