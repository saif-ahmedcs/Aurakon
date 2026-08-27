const userModel = require("../models/userModel");
const { USERNAME_CHANGE_COOLDOWN_MS } = require("../utils/constants");
const {
  UnauthorizedError,
  ConflictError,
  TooManyRequestsError,
} = require("../utils/AppErrors");
const { toIsoTimestamp } = require("../utils/timezone");

// ------------- SET GENDER --------------
async function setGender(userId, gender) {
  const user = await userModel.findById(userId);
  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  const applied = await userModel.setGender(userId, gender);

  if (!applied) {
    throw new ConflictError(
      "gender has already been set and cannot be changed",
    );
  }

  return { gender };
}

// ------------- UPDATE TIMEZONE --------------
async function updateTimezone(userId, timezone) {
  const user = await userModel.getAccountInfo(userId);
  if (!user) {
    throw new UnauthorizedError("user not found");
  }

  if (user.timezone === timezone && user.timezone_source === "manual") {
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
    const current = await userModel.findById(userId);
    if (!current) {
      throw new UnauthorizedError("user not found");
    }
    if (current.username === username) {
      return { username };
    }

    const lastChangedAt = await userModel.getUsernameChangedAt(userId);
    const cooldownDays = Math.round(USERNAME_CHANGE_COOLDOWN_MS / 86400000);
    if (!lastChangedAt) {
      throw new TooManyRequestsError(
        `username can only be changed once every ${cooldownDays} days.`,
        Math.floor(USERNAME_CHANGE_COOLDOWN_MS / 1000),
      );
    }

    const nextEligibleAt = new Date(
      new Date(lastChangedAt).getTime() + USERNAME_CHANGE_COOLDOWN_MS,
    );
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((nextEligibleAt.getTime() - Date.now()) / 1000),
    );
    throw new TooManyRequestsError(
      `username can only be changed once every ${cooldownDays} days. Try again after ${nextEligibleAt.toISOString()}.`,
      retryAfterSeconds,
    );
  }

  return { username };
}

// ------------- GET CURRENT USER (MY ACCOUNT) --------------
async function getCurrentUser(userId) {
  const account = await userModel.getAccountInfo(userId);
  if (!account) {
    throw new UnauthorizedError("user not found");
  }

  return {
    email: account.email,
    createdAt: toIsoTimestamp(account.created_at),
    gender: account.gender,
    timezone: account.timezone,
    timezoneSource: account.timezone_source,
  };
}

module.exports = {
  setGender,
  updateTimezone,
  updateUsername,
  getCurrentUser,
};
