const bcrypt = require("bcrypt");
const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const confirmationTokenService = require("./confirmationTokenService");
const { hasCooldownElapsed } = require("../utils/cooldown");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const authEvents = require("../events/authEvents");
const {
  BCRYPT_SALT_ROUNDS,
  PASSWORD_RESET_MAX_AGE_MS,
  PASSWORD_RESET_COOLDOWN_MS,
} = require("../utils/constants");
const {
  BadRequestError,
  UnauthorizedError,
  ConflictError,
} = require("../utils/AppErrors");
const { generatePasswordResetToken } = require("../utils/tokenUtils");
const {
  assertCurrentPassword,
  checkTokenState,
  CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
} = require("../utils/authSharedHelpers");

const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  message: "If an account exists, a password reset email has been sent.",
};

// ------------- FORGOT PASSWORD --------------
async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase();
  let emittedToken = null;

  await runInTransaction(async (tx) => {
    const user = await userModel.findForPasswordReset(normalizedEmail, tx);
    if (!user || !user.is_verified) {
      console.log(
        `[forgotPassword] skipped: no verified account for email=${normalizedEmail}`,
      );
      return;
    }

    if (
      !hasCooldownElapsed(
        user.reset_token_expires,
        PASSWORD_RESET_MAX_AGE_MS,
        PASSWORD_RESET_COOLDOWN_MS,
      )
    ) {
      console.log(
        `[forgotPassword] skipped: reset cooldown active for userId=${user.id}`,
      );
      return;
    }

    const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();

    await userModel.setResetToken(user.id, tokenHash, expiresAt, tx);
    emittedToken = rawToken;
  });

  if (emittedToken) {
    authEvents.emit("PASSWORD_RESET_REQUESTED", {
      email: normalizedEmail,
      rawToken: emittedToken,
    });
  }

  return GENERIC_FORGOT_PASSWORD_RESPONSE;
}

// ------------- CHECK RESET PASSWORD TOKEN --------------
async function checkResetToken(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  return checkTokenState({
    tokenHash,
    findState: userModel.findResetTokenState,
    clearExpired: userModel.clearExpiredResetToken,
    alreadyCompletedMessage: "Password already reset.",
    activeMessage:
      "Token verified. Submit a new password to complete the reset.",
  });
}

// ------------- RESET PASSWORD --------------
async function resetPassword(token, newPassword) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  const preTokenRow = await userModel.findResetTokenState(tokenHash);
  const preState =
    confirmationTokenService.classifyConfirmationToken(preTokenRow);

  let sameAsCurrent = false;
  if (preState === "active") {
    sameAsCurrent = await bcrypt.compare(newPassword, preTokenRow.passwordHash);
  }

  let matchedRow = null;

  let outcome;
  try {
    outcome = await runInTransaction(async (tx) => {
      return await confirmationTokenService.runIdempotentConfirmation({
        findState: async (tx) => {
          matchedRow = await userModel.findResetTokenState(tokenHash, tx);
          return matchedRow;
        },
        execute: async (tokenRow, tx) => {
          const hashUnchanged =
            tokenRow.passwordHash === preTokenRow?.passwordHash;
          if (hashUnchanged && sameAsCurrent) {
            throw new BadRequestError(
              "new password must be different from the current password",
            );
          }

          const applied = await userModel.markResetTokenConsumedIfHashMatches(
            tokenRow.id,
            tokenRow.passwordHash,
            passwordHash,
            tx,
          );
          if (!applied) {
            throw new ConflictError(
              "password was changed concurrently, please retry",
            );
          }
          await refreshTokenModel.deleteAllByUserId(tokenRow.id, tx);
        },
        onReplay: async (tokenRow) => {
          const matchesPersisted = await bcrypt.compare(
            newPassword,
            tokenRow.passwordHash,
          );
          if (!matchesPersisted) {
            throw new ConflictError(
              "this token was already used to reset the password to a different value",
            );
          }
        },
        tx,
      });
    });
  } catch (err) {
    if (
      err instanceof BadRequestError &&
      err.message === confirmationTokenService.INVALID_TOKEN_MESSAGE
    ) {
      await userModel.clearExpiredResetToken(
        tokenHash,
        CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
      );
    }
    throw err;
  }

  if (!outcome.replay) {
    const updatedUser = await userModel.findById(matchedRow.id);
    if (updatedUser) {
      authEvents.emit("PASSWORD_RESET_COMPLETED", { email: updatedUser.email });
    }
  }

  return { message: "password reset successfully" };
}

// ------------- CHANGE PASSWORD --------------
async function changePassword(userId, currentPassword, newPassword) {
  const user = await userModel.findPasswordHashById(userId);

  if (!user) {
    throw new UnauthorizedError("invalid current password");
  }

  await assertCurrentPassword(currentPassword, user.password_hash);

  const sameAsCurrent = await bcrypt.compare(newPassword, user.password_hash);
  if (sameAsCurrent) {
    throw new BadRequestError(
      "new password must be different from the current password",
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  await runInTransaction(async (tx) => {
    const applied = await userModel.updatePasswordIfEligible(
      userId,
      passwordHash,
      user.password_hash,
      tx,
    );
    if (!applied) {
      throw new ConflictError(
        "password was changed concurrently, please retry",
      );
    }
    await refreshTokenModel.deleteAllByUserId(userId, tx);
    await userModel.clearResetToken(userId, tx);
  });

  const updatedUser = await userModel.findById(userId);
  if (updatedUser) {
    authEvents.emit("PASSWORD_CHANGED", { email: updatedUser.email });
  }

  return { message: "password changed successfully" };
}

module.exports = {
  forgotPassword,
  checkResetToken,
  resetPassword,
  changePassword,
};
