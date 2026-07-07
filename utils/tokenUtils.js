const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const hashToken = require("./hashToken");

const REFRESH_TOKEN_TTL_MS = 50 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "15m", algorithm: "HS256" },
  );
}

function generateRefreshToken() {
  const rawRefreshToken = crypto.randomBytes(40).toString("hex");
  const refreshTokenHash = hashToken(rawRefreshToken);
  const refreshTokenExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

  return { rawRefreshToken, refreshTokenHash, refreshTokenExpiresAt };
}

function generateEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  return { rawToken, tokenHash, expiresAt };
}

function generatePasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  return { rawToken, tokenHash, expiresAt };
}

module.exports = {
  REFRESH_TOKEN_TTL_MS,
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
};
