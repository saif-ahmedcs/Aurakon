const express = require("express");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const asyncHandler = require("../utils/asyncHandler");
const { isPasswordValid } = require("../utils/passwordPolicy");
const pool = require("../db");

const router = express.Router();

router.post(
  "/register",
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

module.exports = router;
