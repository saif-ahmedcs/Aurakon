const express = require("express");
const bcrypt = require("bcrypt");
const asyncHandler = require("../utils/asyncHandler");
const hashToken = require("../utils/hashToken");
const {
  generateAccessToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
} = require("../utils/tokenUtils");
const { REFRESH_COOKIE_OPTIONS } = require("../utils/cookieConfig");
const refreshTokenModel = require("../models/refreshTokenModel");
const userModel = require("../models/userModel");
const authService = require("../services/authService");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
} = require("../middleware/schemas/authSchemas");
const {
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  loginLimiter,
  forgotPasswordLimiter,
} = require("../middleware/rateLimiters");

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    const user = await authService.register(email, password, username);

    res.status(201).json(user);
  }),
);

router.get(
  "/verify-email",
  verifyEmailLimiter,
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    const result = await authService.verifyEmail(token);

    res.status(200).json(result);
  }),
);

router.post(
  "/resend-verification",
  resendVerificationLimiter,
  validate(resendVerificationSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const GENERIC_RESPONSE = {
      message: "If an account exists, a verification email has been sent.",
    };

    const normalizedEmail = email.toLowerCase();
    const user = await userModel.findForResend(normalizedEmail);
    if (!user || user.is_verified) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    // cooldown (block if < 2 min ago)
    if (user.email_verification_expires) {
      const issuedAt =
        new Date(user.email_verification_expires).getTime() -
        24 * 60 * 60 * 1000;
      const cooldownMs = 2 * 60 * 1000;
      if (Date.now() - issuedAt < cooldownMs) {
        return res.status(429).json({
          error: "Please wait before requesting another verification email.",
        });
      }
    }

    const { rawToken, tokenHash, expiresAt } = generateEmailVerificationToken();

    await userModel.setVerificationToken(user.id, tokenHash, expiresAt);
    console.log(`Verify email: GET /api/auth/verify-email?token=${rawToken}`);

    return res.status(200).json(GENERIC_RESPONSE);
  }),
);

router.post(
  "/login",
  loginLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { accessToken, rawRefreshToken } = await authService.login(
      email,
      password,
    );

    res.cookie("refreshToken", rawRefreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: 50 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({ accessToken });
  }),
);

router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const GENERIC_RESPONSE = {
      message: "If an account exists, a password reset email has been sent.",
    };

    const { email } = req.body;

    const normalizedEmail = email.toLowerCase();
    const user = await userModel.findForPasswordReset(normalizedEmail);

    if (!user || !user.is_verified) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const { rawToken, tokenHash, expiresAt } = generatePasswordResetToken();

    await userModel.setResetToken(user.id, tokenHash, expiresAt);
    console.log(
      `Reset password: POST /api/auth/reset-password with token=${rawToken}`,
    );

    return res.status(200).json(GENERIC_RESPONSE);
  }),
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const tokenHash = hashToken(token);
    const user = await userModel.findByValidResetToken(tokenHash);

    if (!user) {
      await userModel.clearExpiredResetToken(tokenHash);
      return res.status(400).json({ error: "invalid or expired token" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await userModel.updatePasswordAndClearResetToken(user.id, passwordHash);
    res.status(200).json({ message: "password reset successfully" });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({ error: "missing refresh token" });
    }

    const tokenHash = hashToken(rawRefreshToken);
    const stored = await refreshTokenModel.findByTokenHash(tokenHash);

    if (!stored) {
      return res.status(401).json({ error: "invalid refresh token" });
    }

    if (new Date(stored.expires_at) <= new Date()) {
      return res.status(401).json({ error: "refresh token expired" });
    }

    const user = await userModel.findById(stored.user_id);

    if (!user) {
      return res.status(401).json({ error: "user not found" });
    }

    const accessToken = generateAccessToken(user);

    res.status(200).json({ accessToken });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    if (rawRefreshToken) {
      const tokenHash = hashToken(rawRefreshToken);
      await refreshTokenModel.deleteByTokenHash(tokenHash);
    }

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "logged out successfully" });
  }),
);

router.post(
  "/logout-all",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    if (!rawRefreshToken) {
      return res.status(401).json({ error: "missing refresh token" });
    }
    const tokenHash = hashToken(rawRefreshToken);
    const stored = await refreshTokenModel.findByTokenHash(tokenHash);

    if (!stored || new Date(stored.expires_at) <= new Date()) {
      return res
        .status(401)
        .json({ error: "invalid or expired refresh token" });
    }

    await refreshTokenModel.deleteAllByUserId(stored.user_id);

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "logged out from all devices" });
  }),
);

module.exports = router;
