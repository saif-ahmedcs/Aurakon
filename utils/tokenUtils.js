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
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN, algorithm: "HS256" },
  );
}

function generateRefreshToken() {
  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = hashToken(rawRefreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS);

  return { rawRefreshToken, refreshTokenHash, refreshTokenExpiresAt };
}

function generateEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_MAX_AGE_MS);

  return { rawToken, tokenHash, expiresAt };
}

function generateEmailChangeToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_CHANGE_MAX_AGE_MS);

  return { rawToken, tokenHash, expiresAt };
}

function generatePasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_MAX_AGE_MS);

  return { rawToken, tokenHash, expiresAt };
}

function generateAccountDeletionToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + ACCOUNT_DELETION_MAX_AGE_MS);

  return { rawToken, tokenHash, expiresAt };
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generateEmailChangeToken,
  generatePasswordResetToken,
  generateAccountDeletionToken,
};
