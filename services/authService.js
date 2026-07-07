const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
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

module.exports = { login, register };
