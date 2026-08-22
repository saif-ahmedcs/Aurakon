const bcrypt = require("bcrypt");
const { runInTransaction } = require("../db");
const userModel = require("../models/userModel");
const refreshTokenModel = require("../models/refreshTokenModel");
const authEvents = require("../events/authEvents");
const {
  BCRYPT_SALT_ROUNDS,
  MAX_ACTIVE_SESSIONS,
  MAX_FAILED_LOGIN_ATTEMPTS,
  LOGIN_LOCKOUT_MS,
} = require("../utils/constants");
const {
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  TooManyRequestsError,
} = require("../utils/AppErrors");
const {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
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

// ------------- LOGIN --------------
async function login(email, password) {
  const normalizedEmail = email.toLowerCase();

  const { user, locked, passwordMatch } = await runInTransaction(async (tx) => {
    const user = await userModel.findForLoginForUpdate(normalizedEmail, tx);

    if (!user) {
      return { user: null, locked: false, passwordMatch: false };
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return { user, locked: true, passwordMatch: false };
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      await userModel.registerFailedLogin(
        user.id,
        MAX_FAILED_LOGIN_ATTEMPTS,
        LOGIN_LOCKOUT_MS,
        tx,
      );
    } else {
      await userModel.clearFailedLogins(user.id, tx);
    }

    return { user, locked: false, passwordMatch };
  });

  if (!user) {
    throw new UnauthorizedError("invalid credentials");
  }

  if (locked) {
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 1000),
    );
    throw new TooManyRequestsError(
      "account temporarily locked due to too many failed login attempts",
      retryAfterSeconds,
    );
  }

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

module.exports = {
  register,
  login,
};
