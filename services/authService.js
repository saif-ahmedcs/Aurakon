const bcrypt = require("bcrypt");
const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const confirmationTokenService = require("./confirmationTokenService");
const { hasCooldownElapsed } = require("../utils/cooldown");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const habitModel = require("../models/habitModel");
const accountDeletionConfirmationModel = require("../models/accountDeletionConfirmationModel");
const authEvents = require("../events/authEvents");
const {
  BCRYPT_SALT_ROUNDS,
  VERIFICATION_COOLDOWN_MS,
  MAX_ACTIVE_SESSIONS,
  USERNAME_CHANGE_COOLDOWN_MS,
  EMAIL_CHANGE_MAX_AGE_MS,
  EMAIL_VERIFICATION_MAX_AGE_MS,
  PASSWORD_RESET_MAX_AGE_MS,
  PASSWORD_RESET_COOLDOWN_MS,
  ACCOUNT_DELETION_MAX_AGE_MS,
  CONFIRMATION_IDEMPOTENCY_WINDOW_MS,
} = require("../utils/constants");
const {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
} = require("../utils/AppErrors");
const {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generateEmailChangeToken,
  generatePasswordResetToken,
  generateAccountDeletionToken,
} = require("../utils/tokenUtils");

const CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS = Math.floor(
  CONFIRMATION_IDEMPOTENCY_WINDOW_MS / 1000,
);

// ------------- REGISTER --------------
async function register(email, password, username) {
  const normalizedEmail = email.toLowerCase();
  const trimmedUsername = username;

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const { rawToken, tokenHash, expiresAt } = generateEmailVerificationToken();

  const resultUser = await runInTransaction(async (tx) => {
    const existing = await userModel.findByEmailForRegistration(
      normalizedEmail,
      tx,
    );

    if (existing) {
      throw new ConflictError("email already registered");
    }

    const newUserId = await userModel.createUser(
      normalizedEmail,
      passwordHash,
      trimmedUsername,
      tokenHash,
      expiresAt,
      tx,
    );

    if (newUserId === null) {
      throw new ConflictError("email already registered");
    }

    return await userModel.findById(newUserId, tx);
  });

  authEvents.emit("USER_REGISTERED", { email: normalizedEmail, rawToken });

  return resultUser;
}

// ------------- CHECK EMAIL VERIFICATION TOKEN --------------
async function checkVerificationToken(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  const tokenRow = await userModel.findVerificationTokenState(tokenHash);
  const state = confirmationTokenService.classifyConfirmationToken(tokenRow);

  if (state === "recently_consumed") {
    return { message: "Email already verified.", alreadyCompleted: true };
  }

  if (state === "expired") {
    await userModel.clearExpiredVerificationToken(
      tokenHash,
      CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
    );
    throw new BadRequestError("invalid or expired token");
  }

  return {
    message:
      "Token verified. Submit a final confirmation to verify your email.",
  };
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

const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  message: "If an account exists, a password reset email has been sent.",
};

// ------------- LOGIN --------------
async function login(email, password) {
  const normalizedEmail = email.toLowerCase();
  const user = await userModel.findForLogin(normalizedEmail);

  if (!user) {
    throw new UnauthorizedError("invalid credentials");
  }
  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    throw new UnauthorizedError("invalid credentials");
  }

  if (!user.is_verified) {
    throw new ForbiddenError("please verify your email before logging in");
  }

  const accessToken = generateAccessToken(user);

  const { rawRefreshToken, refreshTokenHash, refreshTokenExpiresAt } =
    generateRefreshToken();

  await runInTransaction(async (tx) => {
    await userModel.clearOwnExpiredResetToken(user.id, tx);
    await refreshTokenModel.deleteExpiredForUser(user.id, tx);
    await refreshTokenModel.lockActiveForUser(user.id, tx);

    let activeCount = await refreshTokenModel.countActiveByUserId(user.id, tx);
    while (activeCount >= MAX_ACTIVE_SESSIONS) {
      await refreshTokenModel.deleteOldestByUserId(user.id, tx);
      activeCount--;
    }

    await refreshTokenModel.insert(
      user.id,
      refreshTokenHash,
      refreshTokenExpiresAt,
      tx,
    );
  });

  return { accessToken, rawRefreshToken };
}

// ------------- SET GENDER --------------
async function setGender(userId, gender) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  const applied = await userModel.setGender(userId, gender);

  if (!applied) {
    throw new BadRequestError(
      "gender has already been set and cannot be changed",
    );
  }

  return { gender };
}

// ------------- FORGOT PASSWORD --------------
async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase();
  let emittedToken = null;

  await runInTransaction(async (tx) => {
    const user = await userModel.findForPasswordReset(normalizedEmail, tx);
    if (!user || !user.is_verified) {
      return;
    }

    if (
      !hasCooldownElapsed(
        user.reset_token_expires,
        PASSWORD_RESET_MAX_AGE_MS,
        PASSWORD_RESET_COOLDOWN_MS,
      )
    ) {
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
  const tokenRow = await userModel.findResetTokenState(tokenHash);
  const state = confirmationTokenService.classifyConfirmationToken(tokenRow);

  if (state === "recently_consumed") {
    return { message: "Password already reset.", alreadyCompleted: true };
  }

  if (state === "expired") {
    await userModel.clearExpiredResetToken(
      tokenHash,
      CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
    );
    throw new BadRequestError("invalid or expired token");
  }

  return {
    message: "Token verified. Submit a new password to complete the reset.",
  };
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

  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.password_hash,
  );

  if (!passwordMatch) {
    throw new UnauthorizedError("invalid current password");
  }

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

// ------------- REFRESH --------------
async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new UnauthorizedError("missing refresh token");
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await refreshTokenModel.findByTokenHash(tokenHash);

  if (!stored) {
    throw new UnauthorizedError("invalid refresh token");
  }

  if (new Date(stored.expires_at) <= new Date()) {
    await refreshTokenModel.deleteByTokenHash(tokenHash);
    throw new UnauthorizedError("refresh token expired");
  }

  const user = await userModel.findById(stored.user_id);

  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  const accessToken = generateAccessToken(user);

  return { accessToken };
}

// ------------- LOGOUT --------------
async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await refreshTokenModel.deleteByTokenHash(tokenHash);
  }
}

// ------------- LOGOUT ALL --------------
async function logoutAll(userId) {
  await refreshTokenModel.deleteAllByUserId(userId);
}

// ------------- UPDATE TIMEZONE --------------
async function updateTimezone(userId, timezone) {
  const user = await userModel.getAccountInfo(userId);
  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  if (user.timezone === timezone) {
    return { timezone };
  }

  await userModel.updateTimezone(userId, timezone);
  return { timezone };
}

// ------------- UPDATE USERNAME --------------
async function updateUsername(userId, username) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  if (user.username === username) {
    return { username };
  }

  const applied = await userModel.updateUsernameIfEligible(
    userId,
    username,
    USERNAME_CHANGE_COOLDOWN_MS,
  );

  if (!applied) {
    const lastChangedAt = await userModel.getUsernameChangedAt(userId);
    const cooldownDays = Math.round(USERNAME_CHANGE_COOLDOWN_MS / 86400000);
    if (!lastChangedAt) {
      throw new TooManyRequestsError(
        `username can only be changed once every ${cooldownDays} days.`,
      );
    }

    const nextEligibleAt = new Date(
      new Date(lastChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_MS,
    );
    throw new TooManyRequestsError(
      `username can only be changed once every ${cooldownDays} days. Try again after ${nextEligibleAt.toISOString()}.`,
    );
  }

  return { username };
}

// ------------- REQUEST EMAIL CHANGE --------------
async function requestEmailChange(userId, newEmail, currentPassword) {
  const normalizedEmail = newEmail.toLowerCase();

  const user = await userModel.findForEmailChange(userId);
  if (!user) {
    throw new UnauthorizedError("invalid current password");
  }

  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.password_hash,
  );
  if (!passwordMatch) {
    throw new UnauthorizedError("invalid current password");
  }

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

    if (
      !hasCooldownElapsed(
        lockedUser.email_change_token_expires,
        EMAIL_CHANGE_MAX_AGE_MS,
        VERIFICATION_COOLDOWN_MS,
      )
    ) {
      throw new TooManyRequestsError(
        "Please wait before requesting another verification email.",
      );
    }

    const existing = await userModel.findByEmailForRegistration(
      normalizedEmail,
      tx,
    );
    if (existing) {
      throw new ConflictError("email already registered");
    }

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
  try {
    result = await runInTransaction(async (tx) => {
      const user = await userModel.findPendingEmailChange(userId, tx);

      if (!user || !user.pending_email) {
        throw new BadRequestError("no pending email change request");
      }

      const existing = await userModel.findByEmailForRegistration(
        user.pending_email,
        tx,
      );
      if (existing) {
        throw new ConflictError("email already registered");
      }

      if (
        !hasCooldownElapsed(
          user.email_change_token_expires,
          EMAIL_CHANGE_MAX_AGE_MS,
          VERIFICATION_COOLDOWN_MS,
        )
      ) {
        throw new TooManyRequestsError(
          "Please wait before requesting another verification email.",
        );
      }

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
      await userModel.cancelPendingEmailChange(userId);
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
  const tokenRow = await userModel.findEmailChangeTokenState(tokenHash);
  const state = confirmationTokenService.classifyConfirmationToken(tokenRow);

  if (state === "recently_consumed") {
    return { message: "Email already changed.", alreadyCompleted: true };
  }

  if (state === "expired") {
    await userModel.clearExpiredEmailChangeToken(
      tokenHash,
      CONFIRMATION_IDEMPOTENCY_WINDOW_SECONDS,
    );
    throw new BadRequestError("invalid or expired token");
  }

  return {
    message:
      "Token verified. Submit a final confirmation to change your email.",
  };
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
          const hashUnchanged =
            tokenRow.passwordHash === preTokenRow?.passwordHash;
          if (!hashUnchanged || !passwordMatch) {
            throw new UnauthorizedError("invalid current password");
          }
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
        },
        onReplay: async (tokenRow) => {
          const hashUnchanged =
            tokenRow.passwordHash === preTokenRow?.passwordHash;
          if (!hashUnchanged || !passwordMatch) {
            throw new UnauthorizedError("invalid current password");
          }
        },
        tx,
      }),
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      await userModel.cancelPendingEmailChange(userId);
      throw new ConflictError(
        "This email address is no longer available. Please request a new email change.",
      );
    }
    if (err instanceof ConflictError) {
      await userModel.cancelPendingEmailChange(userId);
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

// ------------- REQUEST ACCOUNT DELETION --------------
async function requestAccountDeletion(userId) {
  const { rawToken, tokenHash, expiresAt } = generateAccountDeletionToken();

  const email = await runInTransaction(async (tx) => {
    const user = await userModel.findForAccountDeletion(userId, tx);
    if (!user) {
      throw new UnauthorizedError("user not found");
    }

    if (
      !hasCooldownElapsed(
        user.delete_token_expires,
        ACCOUNT_DELETION_MAX_AGE_MS,
        VERIFICATION_COOLDOWN_MS,
      )
    ) {
      throw new TooManyRequestsError(
        "Please wait before requesting another account deletion email.",
      );
    }

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
        const hashUnchanged =
          tokenRow.passwordHash === preTokenRow?.passwordHash;
        if (!hashUnchanged || !passwordMatch) {
          throw new UnauthorizedError("invalid current password");
        }

        await accountDeletionConfirmationModel.recordConsumption(
          tokenHash,
          userId,
          tx,
        );
        await habitModel.deleteAllByUser(userId, tx);
        await userModel.deleteById(userId, tx);

        return { replay: false, email: tokenRow.email };
      }

      const deletionRecord = await accountDeletionConfirmationModel.findByHash(
        tokenHash,
        tx,
      );
      const deletionState =
        confirmationTokenService.classifyConfirmationToken(deletionRecord);

      if (deletionState === "recently_consumed") {
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

// ------------- GET CURRENT USER (MY ACCOUNT) --------------
async function getCurrentUser(userId) {
  const account = await userModel.getAccountInfo(userId);
  if (!account) {
    throw new UnauthorizedError("user not found");
  }

  return {
    email: account.email,
    createdAt: account.created_at,
    gender: account.gender,
    timezone: account.timezone,
  };
}

module.exports = {
  login,
  setGender,
  register,
  checkVerificationToken,
  confirmEmailVerification,
  resendVerification,
  forgotPassword,
  changePassword,
  checkResetToken,
  resetPassword,
  refresh,
  logout,
  logoutAll,
  updateTimezone,
  updateUsername,
  requestEmailChange,
  resendEmailChangeVerification,
  checkEmailChangeToken,
  cancelEmailChange,
  confirmEmailChange,
  requestAccountDeletion,
  cancelAccountDeletion,
  verifyAccountDeletionToken,
  confirmAccountDeletion,
  getCurrentUser,
};
