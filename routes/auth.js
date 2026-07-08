const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { REFRESH_COOKIE_OPTIONS } = require("../utils/cookieConfig");
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

    const result = await authService.resendVerification(email);

    res.status(200).json(result);
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
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json(result);
  }),
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res.status(200).json(result);
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    const result = await authService.refresh(rawRefreshToken);

    res.status(200).json(result);
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    await authService.logout(rawRefreshToken);

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "logged out successfully" });
  }),
);

router.post(
  "/logout-all",
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    await authService.logoutAll(rawRefreshToken);

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "logged out from all devices" });
  }),
);

module.exports = router;
