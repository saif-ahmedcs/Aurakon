const bcrypt = require("bcrypt");
const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const habitModel = require("../models/habitModel");
const authEvents = require("../events/authEvents");
const {
  BCRYPT_SALT_ROUNDS,
  VERIFICATION_COOLDOWN_MS,
  MAX_ACTIVE_SESSIONS,
  USERNAME_CHANGE_COOLDOWN_MS,
  PASSWORD_CHANGE_COOLDOWN_MS,
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
      if (existing.is_verified) {
        throw new ConflictError("email already registered");
      }

      await userModel.reclaimUnverified(
        existing.id,
        passwordHash,
        trimmedUsername,
        tokenHash,
        expiresAt,
        tx,
      );

      return await userModel.findById(existing.id, tx);
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
  const user = await userModel.findByValidVerificationToken(tokenHash);

  if (!user) {
    await userModel.clearExpiredVerificationToken(tokenHash);
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
  const affectedRows = await userModel.verifyEmail(tokenHash);

  if (affectedRows === 0) {
    await userModel.clearExpiredVerificationToken(tokenHash);
    throw new BadRequestError("invalid or expired token");
  }

  return { message: "email verified successfully" };
}

const GENERIC_RESEND_RESPONSE = {
  message: "If an account exists, a verification email has been sent.",
};

// ------------- RESEND VERIFICATION --------------
async function resendVerification(email) {
  const normalizedEmail = email.toLowerCase();

  await runInTransaction(async (tx) => {
    const user = await userModel.findForResend(normalizedEmail, tx);
    if (!user || user.is_verified) {
      return;
    }

    if (user.email_verification_expires) {
      const issuedAt =
        new Date(user.email_verification_expires).getTime() -
        24 * 60 * 60 * 1000;
      if (Date.now() - issuedAt < VERIFICATION_COOLDOWN_MS) {
        throw new TooManyRequestsError(
          "Please wait before requesting another verification email.",
        );
      }
    }

    const { rawToken, tokenHash, expiresAt } = generateEmailVerificationToken();

    await userModel.setVerificationToken(user.id, tokenHash, expiresAt, tx);

    authEvents.emit("VERIFICATION_RESENT", {
      email: normalizedEmail,
      rawToken,
    });
  });

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

  await userModel.clearOwnExpiredResetToken(user.id);

  const accessToken = generateAccessToken(user);

  const { rawRefreshToken, refreshTokenHash, refreshTokenExpiresAt } =
    generateRefreshToken();

  await runInTransaction(async (tx) => {
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
  await userModel.setGender(userId, gender);
  return { gender };
}

// ------------- FORGOT PASSWORD --------------
async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase();

  await runInTransaction(async (tx) => {
    const user = await userModel.findForPasswordReset(normalizedEmail, tx);
    if (!user || !user.is_verified) {
      return;
    }

    const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();

    await userModel.setResetToken(user.id, tokenHash, expiresAt, tx);
    authEvents.emit("PASSWORD_RESET_REQUESTED", {
      email: normalizedEmail,
      rawToken,
    });
  });

  return GENERIC_FORGOT_PASSWORD_RESPONSE;
}

// ------------- RESET PASSWORD --------------
async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  const user = await userModel.findByValidResetToken(tokenHash);

  if (!user) {
    await userModel.clearExpiredResetToken(tokenHash);
    throw new BadRequestError("invalid or expired token");
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  const applied = await runInTransaction(async (tx) => {
    const updated = await userModel.updatePasswordAndClearResetToken(
      user.id,
      tokenHash,
      passwordHash,
      tx,
    );
    if (updated) {
      await refreshTokenModel.deleteAllByUserId(user.id, tx);
    }
    return updated;
  });

  if (!applied) {
    throw new BadRequestError("invalid or expired token");
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

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  const applied = await runInTransaction(async (tx) => {
    const updated = await userModel.updatePasswordIfEligible(
      userId,
      passwordHash,
      PASSWORD_CHANGE_COOLDOWN_MS,
      tx,
    );
    if (updated) {
      await refreshTokenModel.deleteAllByUserId(userId, tx);
    }
    return updated;
  });

  if (!applied) {
    const lastChangedAt = await userModel.getPasswordChangedAt(userId);
    const nextEligibleAt = new Date(
      new Date(lastChangedAt).getTime() + PASSWORD_CHANGE_COOLDOWN_MS,
    );
    throw new TooManyRequestsError(
      `password can only be changed once every 30 days. Try again after ${nextEligibleAt.toISOString()}.`,
    );
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
async function logoutAll(rawRefreshToken) {
  if (!rawRefreshToken) {
    throw new UnauthorizedError("missing refresh token");
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await refreshTokenModel.findByTokenHash(tokenHash);

  if (!stored || new Date(stored.expires_at) <= new Date()) {
    throw new UnauthorizedError("invalid or expired refresh token");
  }
  await refreshTokenModel.deleteAllByUserId(stored.user_id);
}

// ------------- UPDATE TIMEZONE --------------
async function updateTimezone(userId, timezone) {
  await userModel.updateTimezone(userId, timezone);
  return { timezone };
}

// ------------- UPDATE USERNAME --------------
async function updateUsername(userId, username) {
  const applied = await userModel.updateUsernameIfEligible(
    userId,
    username,
    USERNAME_CHANGE_COOLDOWN_MS,
  );

  if (!applied) {
    const lastChangedAt = await userModel.getUsernameChangedAt(userId);
    const nextEligibleAt = new Date(
      new Date(lastChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_MS,
    );
    throw new TooManyRequestsError(
      `username can only be changed once every 15 days. Try again after ${nextEligibleAt.toISOString()}.`,
    );
  }

  return { username };
}

// ------------- REQUEST EMAIL CHANGE --------------
async function requestEmailChange(userId, newEmail, currentPassword) {
  const normalizedEmail = newEmail.toLowerCase();

  const user = await userModel.findForEmailChange(userId);
  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  const passwordMatch = await bcrypt.compare(
    currentPassword,
    user.password_hash,
  );
  if (!passwordMatch) {
    throw new UnauthorizedError("invalid current password");
  }

  if (normalizedEmail === user.email) {
    throw new BadRequestError("new email must be different from current email");
  }

  const { rawToken, tokenHash, expiresAt } = generateEmailChangeToken();

  await runInTransaction(async (tx) => {
    const existing = await userModel.findByEmailForRegistration(
      normalizedEmail,
      tx,
    );
    if (existing) {
      throw new ConflictError("email already in use");
    }

    await userModel.setPendingEmailChange(
      userId,
      normalizedEmail,
      tokenHash,
      expiresAt,
      tx,
    );
  });

  authEvents.emit("EMAIL_CHANGE_REQUESTED", {
    email: normalizedEmail,
    rawToken,
  });

  return {
    message: "A verification email has been sent to your new email address.",
  };
}

// ------------- CONFIRM EMAIL CHANGE --------------
async function confirmEmailChange(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  const affectedRows = await userModel.applyEmailChange(tokenHash);

  if (affectedRows === 0) {
    await userModel.clearExpiredEmailChangeToken(tokenHash);
    throw new BadRequestError("invalid or expired token");
  }

  return { message: "email changed successfully" };
}

// ------------- REQUEST ACCOUNT DELETION --------------
async function requestAccountDeletion(userId) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  const { rawToken, tokenHash, expiresAt } = generateAccountDeletionToken();
  await userModel.setDeleteToken(userId, tokenHash, expiresAt);

  authEvents.emit("ACCOUNT_DELETION_REQUESTED", {
    email: user.email,
    rawToken,
  });

  return {
    message:
      "A confirmation email has been sent to your registered email address.",
  };
}

// ------------- VERIFY ACCOUNT DELETION TOKEN --------------
async function verifyAccountDeletionToken(token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);
  const user = await userModel.findByValidDeleteToken(tokenHash);

  if (!user) {
    await userModel.clearExpiredDeleteToken(tokenHash);
    throw new BadRequestError("invalid or expired token");
  }

  return {
    message:
      "Token verified. Submit a final confirmation to permanently delete your account.",
  };
}

// ------------- CONFIRM ACCOUNT DELETION --------------
async function confirmAccountDeletion(userId, token) {
  if (!token) {
    throw new BadRequestError("token is required");
  }

  const tokenHash = hashToken(token);

  await runInTransaction(async (tx) => {
    const validToken = await userModel.findValidDeleteTokenForUser(
      userId,
      tokenHash,
      tx,
    );

    if (!validToken) {
      throw new BadRequestError("invalid or expired token");
    }

    await habitModel.deleteAllByUser(userId, tx);
    await userModel.deleteById(userId, tx);
  });

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
  resetPassword,
  refresh,
  logout,
  logoutAll,
  updateTimezone,
  updateUsername,
  requestEmailChange,
  confirmEmailChange,
  requestAccountDeletion,
  verifyAccountDeletionToken,
  confirmAccountDeletion,
  getCurrentUser,
};
