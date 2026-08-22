const bcrypt = require("bcrypt");
const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const confirmationTokenService = require("./confirmationTokenService");
const userModel = require("../models/userModel");
const habitModel = require("../models/habitModel");
const accountDeletionConfirmationModel = require("../models/accountDeletionConfirmationModel");
const authEvents = require("../events/authEvents");
const {
  VERIFICATION_COOLDOWN_MS,
  ACCOUNT_DELETION_MAX_AGE_MS,
} = require("../utils/constants");
const { BadRequestError, UnauthorizedError } = require("../utils/AppErrors");
const { generateAccountDeletionToken } = require("../utils/tokenUtils");
const {
  assertPasswordStillValid,
  assertCooldownElapsed,
} = require("../utils/authSharedHelpers");

// ------------- REQUEST ACCOUNT DELETION --------------
async function requestAccountDeletion(userId) {
  const { rawToken, tokenHash, expiresAt } = generateAccountDeletionToken();

  const email = await runInTransaction(async (tx) => {
    const user = await userModel.findForAccountDeletion(userId, tx);
    if (!user) {
      throw new UnauthorizedError("user not found");
    }

    assertCooldownElapsed(
      user.delete_token_expires,
      ACCOUNT_DELETION_MAX_AGE_MS,
      VERIFICATION_COOLDOWN_MS,
      "Please wait before requesting another account deletion email.",
    );

    await userModel.setDeleteToken(userId, tokenHash, expiresAt, tx);
    return user.email;
  });

  authEvents.emit("ACCOUNT_DELETION_REQUESTED", { email, rawToken });

  return {
    message:
      "A confirmation email has been sent to your registered email address.",
  };
}

// ------------- CANCEL ACCOUNT DELETION --------------
async function cancelAccountDeletion(userId) {
  const cancelled = await runInTransaction(async (tx) => {
    return userModel.cancelPendingAccountDeletion(userId, tx);
  });

  if (!cancelled) {
    throw new BadRequestError("no pending account deletion request");
  }

  return { message: "pending account deletion cancelled" };
}

// ------------- VERIFY ACCOUNT DELETION TOKEN --------------
async function verifyAccountDeletionToken(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  const tokenRow = await userModel.findDeleteTokenState(tokenHash);
  const state = confirmationTokenService.classifyConfirmationToken(tokenRow);

  if (state === "active") {
    return {
      message:
        "Token verified. Submit a final confirmation to permanently delete your account.",
    };
  }

  const deletionRecord =
    await accountDeletionConfirmationModel.findByHash(tokenHash);
  const deletionState =
    confirmationTokenService.classifyConfirmationToken(deletionRecord);

  if (deletionState === "recently_consumed") {
    return { message: "Account already deleted.", alreadyCompleted: true };
  }

  await userModel.clearExpiredDeleteToken(tokenHash);
  throw new BadRequestError("invalid or expired token");
}

// ------------- CONFIRM ACCOUNT DELETION --------------
async function confirmAccountDeletion(userId, token, currentPassword) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);

  const preTokenRow = await userModel.findDeleteTokenStateForUser(
    userId,
    tokenHash,
  );
  const preState =
    confirmationTokenService.classifyConfirmationToken(preTokenRow);

  let passwordMatch = false;
  if (preState === "active") {
    passwordMatch = await bcrypt.compare(
      currentPassword,
      preTokenRow.passwordHash,
    );
  }

  let outcome;
  try {
    outcome = await runInTransaction(async (tx) => {
      const tokenRow = await userModel.findDeleteTokenStateForUser(
        userId,
        tokenHash,
        tx,
      );

      const state =
        confirmationTokenService.classifyConfirmationToken(tokenRow);

      if (state === "active") {
        assertPasswordStillValid(tokenRow, preTokenRow, passwordMatch);

        await accountDeletionConfirmationModel.recordConsumption(
          tokenHash,
          userId,
          tx,
        );
        await habitModel.deleteAllByUser(userId, tx);
        await userModel.deleteById(userId, tx);

        return { replay: false, email: tokenRow.email };
      }

      const deletionRecord =
        await accountDeletionConfirmationModel.findRecentByUserId(userId, tx);
      const deletionState =
        confirmationTokenService.classifyConfirmationToken(deletionRecord);

      if (
        deletionState === "recently_consumed" &&
        deletionRecord.tokenHash === tokenHash
      ) {
        return { replay: true, email: null };
      }

      throw new BadRequestError("invalid or expired token");
    });
  } catch (err) {
    if (err instanceof BadRequestError) {
      await userModel.clearExpiredDeleteToken(tokenHash);
    }
    throw err;
  }

  if (!outcome.replay) {
    authEvents.emit("ACCOUNT_DELETED", { email: outcome.email });
  }

  return { message: "Account permanently deleted." };
}

module.exports = {
  requestAccountDeletion,
  cancelAccountDeletion,
  verifyAccountDeletionToken,
  confirmAccountDeletion,
};
