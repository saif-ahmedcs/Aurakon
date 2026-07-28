const bcrypt = require("bcrypt");
const { runInTransaction } = require("../db");
const hashToken = require("../utils/hashToken");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const authEvents = require("../events/authEvents");
const {
  BCRYPT_SALT_ROUNDS,
  VERIFICATION_COOLDOWN_MS,
  MAX_ACTIVE_SESSIONS,
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
  generatePasswordResetToken,
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

// ------------- VERIFY EMAIL --------------
async function verifyEmail(token) {
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

  const applied = await userModel.updatePasswordAndClearResetToken(
    user.id,
    tokenHash,
    passwordHash,
  );

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
  await userModel.updatePasswordAndClearResetToken(userId, passwordHash);

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

module.exports = {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  refresh,
  logout,
  logoutAll,
  updateTimezone,
};
