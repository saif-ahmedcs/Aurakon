const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/tokenService");

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

module.exports = { login };
