const bcrypt = require("bcrypt");
const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const confirmationTokenService = require("./confirmationTokenService");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const authEvents = require("../events/authEvents");
const {
  VERIFICATION_COOLDOWN_MS,
  EMAIL_CHANGE_MAX_AGE_MS,
} = require("../utils/constants");
const {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} = require("../utils/AppErrors");
const { generateEmailChangeToken } = require("../utils/tokenUtils");
const {
  assertCurrentPassword,
  assertPasswordStillValid,
  assertCooldownElapsed,
  checkTokenState,
  isDemoEmail,
  CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
} = require("../utils/authSharedHelpers");

// ------------- REQUEST EMAIL CHANGE --------------
async function requestEmailChange(userId, newEmail, currentPassword) {
  const normalizedEmail = newEmail.toLowerCase();

  if (isDemoEmail(normalizedEmail)) {
    throw new ConflictError("email already registered");
  }

  const user = await userModel.findForEmailChange(userId);
  if (!user) {
    throw new UnauthorizedError("invalid current password");
  }

  await assertCurrentPassword(currentPassword, user.password_hash);

  const NOOP_RESPONSE = {
    message: "This is already your current email address.",
  };

  if (normalizedEmail === user.email) {
    return NOOP_RESPONSE;
  }

  const result = await runInTransaction(async (tx) => {
    const lockedUser = await userModel.findForEmailChange(userId, tx);
    if (!lockedUser) {
      throw new UnauthorizedError("invalid current password");
    }

    if (lockedUser.password_hash !== user.password_hash) {
      throw new ConflictError(
        "password was changed concurrently, please retry",
      );
    }

    if (normalizedEmail === lockedUser.email) {
      return { rawToken: null };
    }

    const existing = await userModel.findByEmailOrPendingEmailForUpdate(
      normalizedEmail,
      userId,
      tx,
    );
    if (existing) {
      throw new ConflictError("email already registered");
    }

    assertCooldownElapsed(
      lockedUser.email_change_token_expires,
      EMAIL_CHANGE_MAX_AGE_MS,
      VERIFICATION_COOLDOWN_MS,
      "Please wait before requesting another verification email.",
    );

    const { rawToken, tokenHash, expiresAt } = generateEmailChangeToken();

    await userModel.setPendingEmailChange(
      userId,
      normalizedEmail,
      tokenHash,
      expiresAt,
      tx,
    );

    return { rawToken };
  });

  if (!result.rawToken) {
    return NOOP_RESPONSE;
  }

  authEvents.emit("EMAIL_CHANGE_REQUESTED", {
    email: normalizedEmail,
    rawToken: result.rawToken,
  });

  return {
    message: "A verification email has been sent to your new email address.",
  };
}

// ------------- RESEND EMAIL CHANGE VERIFICATION --------------
async function resendEmailChangeVerification(userId) {
  let result;
  let conflictedTokenHash = null;
  try {
    result = await runInTransaction(async (tx) => {
      const user = await userModel.findPendingEmailChange(userId, tx);

      if (!user || !user.pending_email) {
        throw new BadRequestError("no pending email change request");
      }

      const existing = await userModel.findByEmailOrPendingEmailForUpdate(
        user.pending_email,
        userId,
        tx,
      );
      if (existing) {
        conflictedTokenHash = user.email_change_token_hash;
        throw new ConflictError("email already registered");
      }

      assertCooldownElapsed(
        user.email_change_token_expires,
        EMAIL_CHANGE_MAX_AGE_MS,
        VERIFICATION_COOLDOWN_MS,
        "Please wait before requesting another verification email.",
      );

      const { rawToken, tokenHash, expiresAt } = generateEmailChangeToken();

      await userModel.setPendingEmailChange(
        userId,
        user.pending_email,
        tokenHash,
        expiresAt,
        tx,
      );

      return { rawToken, pendingEmail: user.pending_email };
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      await userModel.cancelPendingEmailChange(
        userId,
        undefined,
        conflictedTokenHash,
      );
    }
    throw err;
  }

  authEvents.emit("EMAIL_CHANGE_REQUESTED", {
    email: result.pendingEmail,
    rawToken: result.rawToken,
  });

  return {
    message: "A verification email has been sent to your new email address.",
  };
}

// ------------- CANCEL EMAIL CHANGE --------------
async function cancelEmailChange(userId) {
  const cancelled = await runInTransaction(async (tx) => {
    return userModel.cancelPendingEmailChange(userId, tx);
  });

  if (!cancelled) {
    throw new BadRequestError("no pending email change request");
  }

  return { message: "pending email change cancelled" };
}

// ------------- CHECK EMAIL CHANGE TOKEN --------------
async function checkEmailChangeToken(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  return checkTokenState({
    tokenHash,
    findState: userModel.findEmailChangeTokenState,
    clearExpired: userModel.clearExpiredEmailChangeToken,
    alreadyCompletedMessage: "Email already changed.",
    activeMessage:
      "Token verified. Submit a final confirmation to change your email.",
  });
}

// ------------- CONFIRM EMAIL CHANGE --------------
async function confirmEmailChange(userId, token, currentPassword) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);

  const preTokenRow = await userModel.findEmailChangeTokenStateForUser(
    userId,
    tokenHash,
  );
  const preState =
    confirmationTokenService.classifyConfirmationToken(preTokenRow);

  let passwordMatch = false;
  if (preState === "active" || preState === "recently_consumed") {
    passwordMatch = await bcrypt.compare(
      currentPassword,
      preTokenRow.passwordHash,
    );
  }

  let matchedRow = null;

  let outcome;
  try {
    outcome = await runInTransaction((tx) =>
      confirmationTokenService.runIdempotentConfirmation({
        findState: async (tx) => {
          matchedRow = await userModel.findEmailChangeTokenStateForUser(
            userId,
            tokenHash,
            tx,
          );
          return matchedRow;
        },
        execute: async (tokenRow, tx) => {
          assertPasswordStillValid(tokenRow, preTokenRow, passwordMatch);
          const result = await userModel.markEmailChangeConsumed(
            tokenRow.id,
            tx,
          );
          if (result.affectedRows === 0) {
            if (result.reason === "duplicate_address") {
              throw new ConflictError(
                "This email address is no longer available. Please request a new email change.",
              );
            }
            throw new BadRequestError("invalid or expired token");
          }
          await refreshTokenModel.deleteAllByUserId(userId, tx);
        },
        onReplay: async (tokenRow) => {
          assertPasswordStillValid(tokenRow, preTokenRow, passwordMatch);
        },
        tx,
      }),
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      await userModel.cancelPendingEmailChange(userId, undefined, tokenHash);
      throw new ConflictError(
        "This email address is no longer available. Please request a new email change.",
      );
    }
    if (err instanceof ConflictError) {
      await userModel.cancelPendingEmailChange(userId, undefined, tokenHash);
      throw err;
    }
    if (
      err instanceof BadRequestError &&
      err.message === confirmationTokenService.INVALID_TOKEN_MESSAGE
    ) {
      await userModel.clearExpiredEmailChangeToken(
        tokenHash,
        CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
      );
    }
    throw err;
  }

  if (!outcome.replay) {
    authEvents.emit("EMAIL_CHANGED", { email: outcome.tokenRow.email });
  }

  return { message: "email changed successfully" };
}

module.exports = {
  requestEmailChange,
  resendEmailChangeVerification,
  cancelEmailChange,
  checkEmailChangeToken,
  confirmEmailChange,
};
