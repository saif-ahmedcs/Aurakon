const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { REFRESH_COOKIE_OPTIONS } = require("../utils/cookieConfig");
const { REFRESH_TOKEN_MAX_AGE_MS } = require("../utils/constants");
const authService = require("../services/authService");
const validate = require("../middleware/validate");
const auth = require("../middleware/authenticate");
const authAllowRecentlyDeleted = require("../middleware/authenticateAllowRecentlyDeleted");
const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  resendVerificationSchema,
  updateTimezoneSchema,
  setGenderSchema,
  requestEmailChangeSchema,
  updateUsernameSchema,
  confirmEmailVerificationSchema,
  confirmDeleteAccountSchema,
  confirmEmailChangeSchema,
  tokenQuerySchema,
} = require("../middleware/schemas/authSchemas");
const {
  registerLimiter,
  registerEmailLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  resendVerificationIpLimiter,
  loginLimiter,
  loginAccountLimiter,
  loginIpLimiter,
  forgotPasswordCooldownLimiter,
  forgotPasswordDailyLimiter,
  forgotPasswordIpLimiter,
  changePasswordLimiter,
  changePasswordDailyLimiter,
  changeEmailLimiter,
  verifyEmailChangeLimiter,
  confirmEmailChangeLimiter,
  resetPasswordVerifyLimiter,
  resetPasswordConfirmLimiter,
  deleteAccountLimiter,
  deleteAccountVerifyLimiter,
  confirmDeleteAccountLimiter,
  refreshLimiter,
  logoutIpLimiter,
  logoutAllLimiter,
  accountFieldUpdateLimiter,
  authenticatedSurfaceLimiter,
} = require("../middleware/rateLimiters");

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  registerEmailLimiter,
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    const user = await authService.register(email, password, username);

    res.status(201).json(user);
  }),
);

router.patch(
  "/gender",
  auth,
  accountFieldUpdateLimiter,
  validate(setGenderSchema),
  asyncHandler(async (req, res) => {
    const { gender } = req.body;
    const result = await authService.setGender(req.user.id, gender);
    res.status(200).json(result);
  }),
);

router.get(
  "/verify-email",
  verifyEmailLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    const result = await authService.checkVerificationToken(token);

    res.status(200).json(result);
  }),
);

router.post(
  "/verify-email/confirm",
  verifyEmailLimiter,
  validate(confirmEmailVerificationSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result = await authService.confirmEmailVerification(token);

    res.status(200).json(result);
  }),
);

router.post(
  "/resend-verification",
  resendVerificationLimiter,
  resendVerificationIpLimiter,
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
  loginAccountLimiter,
  loginIpLimiter,
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const { accessToken, rawRefreshToken } = await authService.login(
      email,
      password,
    );

    res.cookie("refreshToken", rawRefreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    res.status(200).json({ accessToken });
  }),
);

router.post(
  "/forgot-password",
  forgotPasswordCooldownLimiter,
  forgotPasswordDailyLimiter,
  forgotPasswordIpLimiter,
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json(result);
  }),
);

router.get(
  "/reset-password",
  resetPasswordVerifyLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    const result = await authService.checkResetToken(token);

    res.status(200).json(result);
  }),
);

router.post(
  "/reset-password",
  resetPasswordConfirmLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const result = await authService.resetPassword(token, newPassword);

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json(result);
  }),
);

router.post(
  "/change-password",
  auth,
  changePasswordLimiter,
  changePasswordDailyLimiter,
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
    );

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json(result);
  }),
);

router.post(
  "/refresh",
  refreshLimiter,
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    const result = await authService.refresh(rawRefreshToken);

    res.status(200).json(result);
  }),
);

router.post(
  "/logout",
  logoutIpLimiter,
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    await authService.logout(rawRefreshToken);

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "logged out successfully" });
  }),
);

router.post(
  "/logout-all",
  auth,
  logoutAllLimiter,
  asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user.id);

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "logged out from all devices" });
  }),
);

router.patch(
  "/timezone",
  auth,
  accountFieldUpdateLimiter,
  validate(updateTimezoneSchema),
  asyncHandler(async (req, res) => {
    const { timezone } = req.body;
    const result = await authService.updateTimezone(req.user.id, timezone);
    res.status(200).json(result);
  }),
);

router.patch(
  "/username",
  auth,
  accountFieldUpdateLimiter,
  validate(updateUsernameSchema),
  asyncHandler(async (req, res) => {
    const { username } = req.body;
    const result = await authService.updateUsername(req.user.id, username);
    res.status(200).json(result);
  }),
);

router.patch(
  "/email",
  auth,
  changeEmailLimiter,
  validate(requestEmailChangeSchema),
  asyncHandler(async (req, res) => {
    const { newEmail, currentPassword } = req.body;
    const result = await authService.requestEmailChange(
      req.user.id,
      newEmail,
      currentPassword,
    );
    res.status(200).json(result);
  }),
);

router.post(
  "/email/resend",
  auth,
  changeEmailLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.resendEmailChangeVerification(req.user.id);
    res.status(200).json(result);
  }),
);

router.post(
  "/email/cancel",
  auth,
  accountFieldUpdateLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.cancelEmailChange(req.user.id);
    res.status(200).json(result);
  }),
);

router.get(
  "/verify-email-change",
  verifyEmailChangeLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await authService.checkEmailChangeToken(token);
    res.status(200).json(result);
  }),
);

router.post(
  "/verify-email-change/confirm",
  auth,
  confirmEmailChangeLimiter,
  validate(confirmEmailChangeSchema),
  asyncHandler(async (req, res) => {
    const { token, currentPassword } = req.body;
    const result = await authService.confirmEmailChange(
      req.user.id,
      token,
      currentPassword,
    );
    res.status(200).json(result);
  }),
);

router.post(
  "/delete-account/request",
  auth,
  deleteAccountLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.requestAccountDeletion(req.user.id);
    res.status(200).json(result);
  }),
);

router.post(
  "/delete-account/cancel",
  auth,
  accountFieldUpdateLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.cancelAccountDeletion(req.user.id);
    res.status(200).json(result);
  }),
);

router.get(
  "/delete-account/verify",
  deleteAccountVerifyLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await authService.verifyAccountDeletionToken(token);
    res.status(200).json(result);
  }),
);

router.post(
  "/delete-account/confirm",
  authAllowRecentlyDeleted,
  confirmDeleteAccountLimiter,
  validate(confirmDeleteAccountSchema),
  asyncHandler(async (req, res) => {
    const { token, currentPassword } = req.body;
    const result = await authService.confirmAccountDeletion(
      req.user.id,
      token,
      currentPassword,
    );
    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json(result);
  }),
);

router.get(
  "/me",
  auth,
  authenticatedSurfaceLimiter,
  asyncHandler(async (req, res) => {
    const result = await authService.getCurrentUser(req.user.id);
    res.status(200).json(result);
  }),
);

module.exports = router;
