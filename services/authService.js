const bcrypt = require("bcrypt");
const hashToken = require("../utils/hashToken");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
} = require("../utils/tokenUtils");

async function login(email, password) {
  const normalizedEmail = email.toLowerCase();
  const user = await userModel.findForLogin(normalizedEmail);

  if (!user) {
    const err = new Error("invalid credentials");
    err.status = 401;
    throw err;
  }

  const passwordMatch = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatch) {
    const err = new Error("invalid credentials");
    err.status = 401;
    throw err;
  }

  await userModel.clearOwnExpiredResetToken(user.id);

  if (!user.is_verified) {
    const err = new Error("please verify your email before logging in");
    err.status = 403;
    throw err;
  }

  const accessToken = generateAccessToken(user);

  const { rawRefreshToken, refreshTokenHash, refreshTokenExpiresAt } =
    generateRefreshToken();

  await refreshTokenModel.insert(
    user.id,
    refreshTokenHash,
    refreshTokenExpiresAt,
  );

  await refreshTokenModel.deleteExpiredForUser(user.id);

  return { accessToken, rawRefreshToken };
}

async function register(email, password, username) {
  const normalizedEmail = email.toLowerCase();
  const trimmedUsername = username;

  const existing = await userModel.findByEmailForRegistration(normalizedEmail);

  // Password encryption
  const passwordHash = await bcrypt.hash(password, 12);

  // Generate verification token
  const { rawToken, tokenHash, expiresAt } = generateEmailVerificationToken();

  // if user had an unfinished sign up
  if (existing) {
    if (existing.is_verified) {
      const err = new Error("email already registered");
      err.status = 409;
      throw err;
    }

    await userModel.reclaimUnverified(
      existing.id,
      passwordHash,
      trimmedUsername,
      tokenHash,
      expiresAt,
    );
    // log the verification link
    console.log(`Verify email: GET /api/auth/verify-email?token=${rawToken}`);

    return await userModel.findById(existing.id);
  }

  // Fresh registration
  const newUserId = await userModel.createUser(
    normalizedEmail,
    passwordHash,
    trimmedUsername,
    tokenHash,
    expiresAt,
  );

  console.log(`Verify email: GET /api/auth/verify-email?token=${rawToken}`);

  return await userModel.findById(newUserId);
}

async function verifyEmail(token) {
  if (!token) {
    const err = new Error("token is required");
    err.status = 400;
    throw err;
  }

  const tokenHash = hashToken(token);
  const affectedRows = await userModel.verifyEmail(tokenHash);

  if (affectedRows === 0) {
    await userModel.clearExpiredVerificationToken(tokenHash);
    const err = new Error("invalid or expired token");
    err.status = 400;
    throw err;
  }

  return { message: "email verified successfully" };
}

const GENERIC_RESEND_RESPONSE = {
  message: "If an account exists, a verification email has been sent.",
};

async function resendVerification(email) {
  const normalizedEmail = email.toLowerCase();
  const user = await userModel.findForResend(normalizedEmail);
  if (!user || user.is_verified) {
    return GENERIC_RESEND_RESPONSE;
  }

  // cooldown (block if < 2 min ago)
  if (user.email_verification_expires) {
    const issuedAt =
      new Date(user.email_verification_expires).getTime() - 24 * 60 * 60 * 1000;
    const cooldownMs = 2 * 60 * 1000;
    if (Date.now() - issuedAt < cooldownMs) {
      const err = new Error(
        "Please wait before requesting another verification email.",
      );
      err.status = 429;
      throw err;
    }
  }

  const { rawToken, tokenHash, expiresAt } = generateEmailVerificationToken();

  await userModel.setVerificationToken(user.id, tokenHash, expiresAt);

  console.log(`Verify email: GET /api/auth/verify-email?token=${rawToken}`);

  return GENERIC_RESEND_RESPONSE;
}

const GENERIC_FORGOT_PASSWORD_RESPONSE = {
  message: "If an account exists, a password reset email has been sent.",
};

async function forgotPassword(email) {
  const normalizedEmail = email.toLowerCase();
  const user = await userModel.findForPasswordReset(normalizedEmail);

  if (!user || !user.is_verified) {
    return GENERIC_FORGOT_PASSWORD_RESPONSE;
  }

  const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();

  await userModel.setResetToken(user.id, tokenHash, expiresAt);
  console.log(
    `Reset password: POST /api/auth/reset-password with token=${rawToken}`,
  );

  return GENERIC_FORGOT_PASSWORD_RESPONSE;
}

async function resetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  const user = await userModel.findByValidResetToken(tokenHash);

  if (!user) {
    await userModel.clearExpiredResetToken(tokenHash);
    const err = new Error("invalid or expired token");
    err.status = 400;
    throw err;
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await userModel.updatePasswordAndClearResetToken(user.id, passwordHash);

  return { message: "password reset successfully" };
}

async function refresh(rawRefreshToken) {
  if (!rawRefreshToken) {
    const err = new Error("missing refresh token");
    err.status = 401;
    throw err;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const stored = await refreshTokenModel.findByTokenHash(tokenHash);

  if (!stored) {
    const err = new Error("invalid refresh token");
    err.status = 401;
    throw err;
  }

  if (new Date(stored.expires_at) <= new Date()) {
    const err = new Error("refresh token expired");
    err.status = 401;
    throw err;
  }

  const user = await userModel.findById(stored.user_id);

  if (!user) {
    const err = new Error("user not found");
    err.status = 401;
    throw err;
  }

  const accessToken = generateAccessToken(user);

  return { accessToken };
}

async function logout(rawRefreshToken) {
  if (rawRefreshToken) {
    const tokenHash = hashToken(rawRefreshToken);
    await refreshTokenModel.deleteByTokenHash(tokenHash);
  }
}

module.exports = {
  login,
  register,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
};
