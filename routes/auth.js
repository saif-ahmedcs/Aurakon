const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { isPasswordValid } = require("../utils/passwordPolicy");
const hashToken = require("../utils/hashToken");
const { REFRESH_COOKIE_OPTIONS } = require("../utils/cookieConfig");
const refreshTokenModel = require("../models/refreshTokenModel");
const rateLimit = require("express-rate-limit");
const userModel = require("../models/userModel");
const router = express.Router();

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "too many registration attempts, please try again later" },
});

const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "too many verification attempts, please try again later" },
});

const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = (req.body?.email ?? "").toLowerCase().trim();
    return `${req.ip}:${email}`;
  },
  message: {
    error: "too many resend attempts, please try again later",
  },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const email = (req.body?.email ?? "").toLowerCase().trim();
    return `${req.ip}:${email}`;
  },
  message: { error: "too many login attempts, please try again later" },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = (req.body?.email ?? "").toLowerCase().trim();
    return `${req.ip}:${email}`;
  },
  message: {
    error: "too many requests, please try again later",
  },
});

router.post(
  "/register",
  registerLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isPasswordValid(password)) {
      return res.status(400).json({
        error:
          "password must be at least 8 characters and contain at least one letter and one number",
      });
    }

    // username validation
    const trimmedUsername = String(username ?? "").trim();

    if (!trimmedUsername) {
      return res.status(400).json({ error: "username is required" });
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
      return res.status(400).json({
        error: "username must be between 3 and 20 characters",
      });
    }

    const existing =
      await userModel.findByEmailForRegistration(normalizedEmail);

    // Password encryption
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // if user had an unfinished sign up
    if (existing) {
      if (existing.is_verified) {
        return res.status(409).json({ error: "email already registered" });
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

      const user = await userModel.findById(existing.id);
      return res.status(201).json(user);
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

    const user = await userModel.findById(newUserId);

    res.status(201).json(user);
  }),
);

router.get(
  "/verify-email",
  verifyEmailLimiter,
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: "token is required" });
    }

    const tokenHash = hashToken(token);
    const affectedRows = await userModel.verifyEmail(tokenHash);

    if (affectedRows === 0) {
      await userModel.clearExpiredVerificationToken(tokenHash);
      return res.status(400).json({ error: "invalid or expired token" });
    }

    res.status(200).json({ message: "email verified successfully" });
  }),
);

router.post(
  "/resend-verification",
  resendVerificationLimiter,
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const GENERIC_RESPONSE = {
      message: "If an account exists, a verification email has been sent.",
    };

    if (!email) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const normalizedEmail = email.toLowerCase().trim();

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

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await userModel.setVerificationToken(user.id, tokenHash, expiresAt);

    console.log(`Verify email: GET /api/auth/verify-email?token=${rawToken}`);

    return res.status(200).json(GENERIC_RESPONSE);
  }),
);

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await userModel.findForLogin(normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    await userModel.clearOwnExpiredResetToken(user.id);

    if (!user.is_verified) {
      return res
        .status(403)
        .json({ error: "please verify your email before logging in" });
    }

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" },
    );

    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const refreshTokenHash = hashToken(rawRefreshToken);
    const refreshTokenExpiresAt = new Date(
      Date.now() + 50 * 24 * 60 * 60 * 1000,
    );

    await refreshTokenModel.insert(
      user.id,
      refreshTokenHash,
      refreshTokenExpiresAt,
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
  asyncHandler(async (req, res) => {
    const GENERIC_RESPONSE = {
      message: "If an account exists, a password reset email has been sent.",
    };

    const { email } = req.body;

    if (!email) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await userModel.findForPasswordReset(normalizedEmail);

    if (!user || !user.is_verified) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await userModel.setResetToken(user.id, tokenHash, expiresAt);
    console.log(
      `Reset password: POST /api/auth/reset-password with token=${rawToken}`,
    );

    return res.status(200).json(GENERIC_RESPONSE);
  }),
);

router.post(
  "/reset-password",
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "token and newPassword are required" });
    }

    if (!isPasswordValid(newPassword)) {
      return res.status(400).json({
        error:
          "password must be at least 8 characters and contain at least one letter and one number",
      });
    }

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
    if (req.headers["content-type"] !== "application/json") {
      return res
        .status(415)
        .json({ error: "content-type must be application/json" });
    }

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

    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "15m", algorithm: "HS256" },
    );

    res.status(200).json({ accessToken });
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    if (req.headers["content-type"] !== "application/json") {
      return res
        .status(415)
        .json({ error: "content-type must be application/json" });
    }

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
    if (req.headers["content-type"] !== "application/json") {
      return res
        .status(415)
        .json({ error: "content-type must be application/json" });
    }

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
