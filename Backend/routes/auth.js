const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { REFRESH_COOKIE_OPTIONS } = require("../utils/cookieConfig");
const { REFRESH_TOKEN_MAX_AGE_MS } = require("../utils/constants");
const authService = require("../services/authService");
const sessionService = require("../services/sessionService");
const passwordService = require("../services/passwordService");
const emailVerificationService = require("../services/emailVerificationService");
const emailChangeService = require("../services/emailChangeService");
const accountDeletionService = require("../services/accountDeletionService");
const accountProfileService = require("../services/accountProfileService");
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
    const { email, password, username, gender } = req.body;

    const user = await authService.register(email, password, username, gender);

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
    const result = await accountProfileService.setGender(req.user.id, gender);
    res.status(200).json(result);
  }),
);

router.get(
  "/verify-email",
  verifyEmailLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    const result = await emailVerificationService.checkVerificationToken(token);

    res.status(200).json(result);
  }),
);

router.post(
  "/verify-email/confirm",
  verifyEmailLimiter,
  validate(confirmEmailVerificationSchema),
  asyncHandler(async (req, res) => {
    const { token } = req.body;

    const result =
      await emailVerificationService.confirmEmailVerification(token);

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

    const result = await emailVerificationService.resendVerification(email);

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

    const result = await passwordService.forgotPassword(email);

    res.status(200).json(result);
  }),
);

router.get(
  "/reset-password",
  resetPasswordVerifyLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;

    const result = await passwordService.checkResetToken(token);

    res.status(200).json(result);
  }),
);

router.post(
  "/reset-password",
  resetPasswordConfirmLimiter,
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;

    const result = await passwordService.resetPassword(token, newPassword);

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

    const result = await passwordService.changePassword(
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

    const {
      accessToken,
      rawRefreshToken: newRawRefreshToken,
      refreshTokenExpiresAt,
    } = await sessionService.refresh(rawRefreshToken);

    res.cookie("refreshToken", newRawRefreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      expires: new Date(refreshTokenExpiresAt),
    });

    res.status(200).json({ accessToken });
  }),
);

router.post(
  "/logout",
  logoutIpLimiter,
  asyncHandler(async (req, res) => {
    const rawRefreshToken = req.cookies.refreshToken;

    await sessionService.logout(rawRefreshToken);

    res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ message: "logged out successfully" });
  }),
);

router.post(
  "/logout-all",
  auth,
  logoutAllLimiter,
  asyncHandler(async (req, res) => {
    await sessionService.logoutAll(req.user.id);

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
    const result = await accountProfileService.updateTimezone(
      req.user.id,
      timezone,
    );
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
    const result = await accountProfileService.updateUsername(
      req.user.id,
      username,
    );
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
    const result = await emailChangeService.requestEmailChange(
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
    const result = await emailChangeService.resendEmailChangeVerification(
      req.user.id,
    );
    res.status(200).json(result);
  }),
);

router.post(
  "/email/cancel",
  auth,
  accountFieldUpdateLimiter,
  asyncHandler(async (req, res) => {
    const result = await emailChangeService.cancelEmailChange(req.user.id);
    res.status(200).json(result);
  }),
);

router.get(
  "/verify-email-change",
  verifyEmailChangeLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result = await emailChangeService.checkEmailChangeToken(token);
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
    const result = await emailChangeService.confirmEmailChange(
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
    const result = await accountDeletionService.requestAccountDeletion(
      req.user.id,
    );
    res.status(200).json(result);
  }),
);

router.post(
  "/delete-account/cancel",
  auth,
  accountFieldUpdateLimiter,
  asyncHandler(async (req, res) => {
    const result = await accountDeletionService.cancelAccountDeletion(
      req.user.id,
    );
    res.status(200).json(result);
  }),
);

router.get(
  "/delete-account/verify",
  deleteAccountVerifyLimiter,
  validate(tokenQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { token } = req.query;
    const result =
      await accountDeletionService.verifyAccountDeletionToken(token);
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
    const result = await accountDeletionService.confirmAccountDeletion(
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
    const result = await accountProfileService.getCurrentUser(req.user.id);
    res.status(200).json(result);
  }),
);

module.exports = router;
