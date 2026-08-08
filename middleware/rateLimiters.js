const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

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
    return `${ipKeyGenerator(req.ip)}:${email}`;
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
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
  message: { error: "too many login attempts, please try again later" },
});

const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req.body?.email ?? "").toLowerCase().trim(),
  message: {
    error: "too many login attempts for this account, please try again later",
  },
});

const forgotPasswordCooldownLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1,
  keyGenerator: (req) => {
    const normalizedEmail = (req.body?.email ?? "").toLowerCase().trim();
    const clientIp = ipKeyGenerator(req.ip);
    return normalizedEmail ? `${normalizedEmail}:${clientIp}` : clientIp;
  },
  message: {
    error: "please wait 15 minutes before requesting another reset email",
  },
});

const forgotPasswordDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) => {
    const normalizedEmail = (req.body?.email ?? "").toLowerCase().trim();
    const clientIp = ipKeyGenerator(req.ip);
    return normalizedEmail ? `${normalizedEmail}:${clientIp}` : clientIp;
  },
  message: { error: "maximum of 3 password reset emails per 24 hours reached" },
});

const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) =>
    req.user?.id ? req.user.id.toString() : ipKeyGenerator(req.ip),
  message: {
    error: "too many password change attempts, please try again later",
  },
});

const changePasswordDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: (req) =>
    req.user?.id ? req.user.id.toString() : ipKeyGenerator(req.ip),
  message: { error: "maximum of 3 password changes per 24 hours reached" },
});

const changeEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) =>
    req.user?.id ? req.user.id.toString() : ipKeyGenerator(req.ip),
  message: {
    error: "too many email change requests, please try again later",
  },
});

const verifyEmailChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      "too many email change verification attempts, please try again later",
  },
});

const confirmEmailChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      "too many email change confirmation attempts, please try again later",
  },
});

const resetPasswordVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      "too many password reset verification attempts, please try again later",
  },
});

const resetPasswordConfirmLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      "too many password reset confirmation attempts, please try again later",
  },
});

const deleteAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) =>
    req.user?.id ? req.user.id.toString() : ipKeyGenerator(req.ip),
  message: {
    error: "too many account deletion requests, please try again later",
  },
});

const deleteAccountVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      "too many account deletion verification attempts, please try again later",
  },
});

const confirmDeleteAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error:
      "too many account deletion confirmation attempts, please try again later",
  },
});

const authenticatedSurfaceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user.id.toString(),
  message: {
    error: "too many requests, please slow down",
  },
});

const reviewDecisionsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 6,
  keyGenerator: (req) => req.user.id.toString(),
  message: {
    error: "too many review submissions, please slow down",
  },
});

module.exports = {
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  loginLimiter,
  loginAccountLimiter,
  forgotPasswordCooldownLimiter,
  forgotPasswordDailyLimiter,
  changePasswordLimiter,
  changePasswordDailyLimiter,
  changeEmailLimiter,
  verifyEmailChangeLimiter,
  confirmEmailChangeLimiter,
  deleteAccountLimiter,
  deleteAccountVerifyLimiter,
  confirmDeleteAccountLimiter,
  resetPasswordVerifyLimiter,
  resetPasswordConfirmLimiter,
  authenticatedSurfaceLimiter,
  reviewDecisionsLimiter,
};
