const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const confirmationTokenService = require("./confirmationTokenService");
const { hasCooldownElapsed } = require("../utils/cooldown");
const userModel = require("../models/userModel");
const authEvents = require("../events/authEvents");
const {
  VERIFICATION_COOLDOWN_MS,
  EMAIL_VERIFICATION_MAX_AGE_MS,
} = require("../utils/constants");
const { BadRequestError } = require("../utils/AppErrors");
const { generateEmailVerificationToken } = require("../utils/tokenUtils");
const {
  checkTokenState,
  CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
} = require("../utils/authSharedHelpers");

// ------------- CHECK EMAIL VERIFICATION TOKEN --------------
async function checkVerificationToken(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  return checkTokenState({
    tokenHash,
    findState: userModel.findVerificationTokenState,
    clearExpired: userModel.clearExpiredVerificationToken,
    alreadyCompletedMessage: "Email already verified.",
    activeMessage:
      "Token verified. Submit a final confirmation to verify your email.",
  });
}

// ------------- CONFIRM EMAIL VERIFICATION --------------
async function confirmEmailVerification(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);

  try {
    await runInTransaction(async (tx) => {
      await confirmationTokenService.runIdempotentConfirmation({
        findState: (tx) => userModel.findVerificationTokenState(tokenHash, tx),
        execute: (tokenRow, tx) =>
          userModel.markVerificationConsumed(tokenRow.id, tx),
        tx,
      });
    });
  } catch (err) {
    if (
      err instanceof BadRequestError &&
      err.message === confirmationTokenService.INVALID_TOKEN_MESSAGE
    ) {
      await userModel.clearExpiredVerificationToken(
        tokenHash,
        CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
      );
    }
    throw err;
  }

  return { message: "email verified successfully" };
}

const GENERIC_RESEND_RESPONSE = {
  message: "If an account exists, a verification email has been sent.",
};

// ------------- RESEND VERIFICATION --------------
async function resendVerification(email) {
  const normalizedEmail = email.toLowerCase();
  let emittedToken = null;

  await runInTransaction(async (tx) => {
    const user = await userModel.findForResend(normalizedEmail, tx);
    if (!user || user.is_verified) {
      return;
    }

    if (
      !hasCooldownElapsed(
        user.email_verification_expires,
        EMAIL_VERIFICATION_MAX_AGE_MS,
        VERIFICATION_COOLDOWN_MS,
      )
    ) {
      return;
    }
    const { rawToken, tokenHash, expiresAt } = generateEmailVerificationToken();

    await userModel.setVerificationToken(user.id, tokenHash, expiresAt, tx);

    emittedToken = rawToken;
  });

  if (emittedToken) {
    authEvents.emit("VERIFICATION_RESENT", {
      email: normalizedEmail,
      rawToken: emittedToken,
    });
  }

  return GENERIC_RESEND_RESPONSE;
}

module.exports = {
  checkVerificationToken,
  confirmEmailVerification,
  resendVerification,
};
