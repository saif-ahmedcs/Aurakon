const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const asyncHandler = require("../utils/asyncHandler");
const { isPasswordValid } = require("../utils/passwordPolicy");
const pool = require("../db");
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

    const [existing] = await pool.query(
      "SELECT id, is_verified FROM users WHERE email = ?",
      [normalizedEmail],
    );

    // Password encryption
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate verification token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // if user had an unfinished sign up
    if (existing.length > 0) {
      const user = existing[0];

      if (user.is_verified) {
        return res.status(409).json({ error: "email already registered" });
      }

      await pool.query(
        `UPDATE users
       SET password_hash = ?,
       username = ?,
       email_verification_token_hash = ?,
       email_verification_expires = ?
       WHERE id = ?`,
        [passwordHash, trimmedUsername, tokenHash, expiresAt, user.id],
      );
      // log the verification link
      console.log(`Verify email: GET /api/auth/verify-email?token=${rawToken}`);

      const [rows] = await pool.query(
        "SELECT id, email, username FROM users WHERE id = ?",
        [user.id],
      );
      return res.status(201).json(rows[0]);
    }

    // Fresh registration
    const [result] = await pool.query(
      `INSERT INTO users (email, password_hash, username, is_verified, email_verification_token_hash, email_verification_expires)
       VALUES (?, ?, ?, false, ?, ?)`,
      [normalizedEmail, passwordHash, trimmedUsername, tokenHash, expiresAt],
    );

    console.log(`Verify email: GET /api/auth/verify-email?token=${rawToken}`);

    const [rows] = await pool.query(
      "SELECT id, email, username FROM users WHERE id = ?",
      [result.insertId],
    );

    res.status(201).json(rows[0]);
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

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const [result] = await pool.query(
      `UPDATE users
       SET is_verified = true,
           email_verification_token_hash = NULL,
           email_verification_expires = NULL
       WHERE email_verification_token_hash = ?
         AND email_verification_expires > UTC_TIMESTAMP()`,
      [tokenHash],
    );

    if (result.affectedRows === 0) {
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

    const [rows] = await pool.query(
      "SELECT id, is_verified FROM users WHERE email = ?",
      [normalizedEmail],
    );

    if (rows.length === 0 || rows[0].is_verified) {
      return res.status(200).json(GENERIC_RESPONSE);
    }

    const user = rows[0];

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
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      `UPDATE users
       SET email_verification_token_hash = ?,
           email_verification_expires = ?
       WHERE id = ?`,
      [tokenHash, expiresAt, user.id],
    );

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

    const [rows] = await pool.query(
      "SELECT id, email, username, password_hash, is_verified FROM users WHERE email = ?",
      [normalizedEmail],
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "invalid credentials" });
    }

    const user = rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: "invalid credentials" });
    }

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

    res.status(200).json({ accessToken });
  }),
);

module.exports = router;
