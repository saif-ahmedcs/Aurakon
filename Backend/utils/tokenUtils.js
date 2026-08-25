const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const hashToken = require("./hashToken");
const {
  REFRESH_TOKEN_MAX_AGE_MS,
  ACCESS_TOKEN_EXPIRES_IN,
  EMAIL_VERIFICATION_MAX_AGE_MS,
  PASSWORD_RESET_MAX_AGE_MS,
  ACCOUNT_DELETION_MAX_AGE_MS,
  EMAIL_CHANGE_MAX_AGE_MS,
} = require("./constants");

function generateAccessToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    algorithm: "HS256",
  });
}

function generateHashedToken(byteLength, maxAgeMs) {
  const rawToken = crypto.randomBytes(byteLength).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + maxAgeMs);

  return { rawToken, tokenHash, expiresAt };
}

function generateRefreshToken() {
  const { rawToken, tokenHash, expiresAt } = generateHashedToken(
    40,
    REFRESH_TOKEN_MAX_AGE_MS,
  );

  return {
    rawRefreshToken: rawToken,
    refreshTokenHash: tokenHash,
    refreshTokenExpiresAt: expiresAt,
  };
}

function generateEmailVerificationToken() {
  return generateHashedToken(32, EMAIL_VERIFICATION_MAX_AGE_MS);
}

function generateEmailChangeToken() {
  return generateHashedToken(32, EMAIL_CHANGE_MAX_AGE_MS);
}

function generatePasswordResetToken() {
  return generateHashedToken(32, PASSWORD_RESET_MAX_AGE_MS);
}

function generateAccountDeletionToken() {
  return generateHashedToken(32, ACCOUNT_DELETION_MAX_AGE_MS);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generateEmailChangeToken,
  generatePasswordResetToken,
  generateAccountDeletionToken,
};
