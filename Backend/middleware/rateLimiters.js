const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const hashToken = require("../utils/hashToken");

const getClientIp = (req) => {
  return ipKeyGenerator(req.ip);
};

const canonicalizeEmail = (email) => {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const canonicalLocal = local.split("+")[0];
  return `${canonicalLocal}@${domain}`;
};

const getEmailOrIpKey = (req) => {
  const rawEmail = req.body?.email;
  const email =
    typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";
  return email.length > 0 ? canonicalizeEmail(email) : getClientIp(req);
};

const getIpAndEmailKey = (req) => {
  const rawEmail = req.body?.email;
  const email =
    typeof rawEmail === "string" ? rawEmail.toLowerCase().trim() : "";
  const clientIp = getClientIp(req);
  return email.length > 0 ? `${clientIp}:${email}` : clientIp;
};

const getUserIdOrIpKey = (req) => {
  return req.user?.id ? req.user.id.toString() : getClientIp(req);
};

const getRefreshTokenOrIpKey = (req) => {
  const rawToken = req.cookies?.refreshToken;
  return typeof rawToken === "string" && rawToken.length > 0
    ? `rt:${hashToken(rawToken)}`
    : getClientIp(req);
};

const createLimiter = (options) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, opts) => {
      const resetTime = req.rateLimit?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(
            0,
            Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000),
          )
        : undefined;
      res.status(opts.statusCode);
      if (retryAfterSeconds !== undefined) {
        res.set("Retry-After", String(retryAfterSeconds));
      }
      res.json({ ...opts.message, retryAfter: retryAfterSeconds });
    },
    ...options,
  });
};

const globalIpLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 300,
  keyGenerator: getClientIp,
  message: { error: "too many requests, please try again later" },
});

// Registration
const registerLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getClientIp,
  message: { error: "too many registration attempts, please try again later" },
});

const registerEmailLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: getEmailOrIpKey,
  message: {
    error:
      "too many registration attempts for this email, please try again later",
  },
});

// Email Verification & Resend
const verifyEmailLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getClientIp,
  message: { error: "too many verification attempts, please try again later" },
});

const resendVerificationLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: getIpAndEmailKey,
  message: { error: "too many resend attempts, please try again later" },
});

const resendVerificationIpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 7,
  keyGenerator: getClientIp,
  message: { error: "too many requests, please try again later" },
});

// Authentication (Login & Logout)
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getIpAndEmailKey,
  message: { error: "too many login attempts, please try again later" },
});

const loginAccountLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getEmailOrIpKey,
  message: {
    error: "too many login attempts for this account, please try again later",
  },
});

const loginIpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 25,
  keyGenerator: getClientIp,
  message: { error: "too many login attempts, please try again later" },
});

const logoutIpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: getClientIp,
  message: { error: "too many requests, please try again later" },
});

const logoutAllLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  keyGenerator: getUserIdOrIpKey,
  message: { error: "too many requests, please try again later" },
});

// Forgot & Reset Password
const forgotPasswordCooldownLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1,
  keyGenerator: getIpAndEmailKey,
  message: {
    error: "please wait 15 minutes before requesting another reset email",
  },
});

const forgotPasswordDailyLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: getIpAndEmailKey,
  message: { error: "maximum of 3 password reset emails per 24 hours reached" },
});

const forgotPasswordIpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getClientIp,
  message: {
    error: "too many password reset requests, please try again later",
  },
});

const resetPasswordVerifyLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getClientIp,
  message: {
    error:
      "too many password reset verification attempts, please try again later",
  },
});

const resetPasswordConfirmLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getClientIp,
  message: {
    error:
      "too many password reset confirmation attempts, please try again later",
  },
});

// User Account Management
const changePasswordLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 3,
  keyGenerator: getUserIdOrIpKey,
  message: {
    error: "too many password change attempts, please try again later",
  },
});

const changePasswordDailyLimiter = createLimiter({
  windowMs: 24 * 60 * 60 * 1000,
  max: 3,
  keyGenerator: getUserIdOrIpKey,
  message: { error: "maximum of 3 password changes per 24 hours reached" },
});

const changeEmailLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: getUserIdOrIpKey,
  message: { error: "too many email change requests, please try again later" },
});

const verifyEmailChangeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getClientIp,
  message: {
    error:
      "too many email change verification attempts, please try again later",
  },
});

const confirmEmailChangeLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getClientIp,
  message: {
    error:
      "too many email change confirmation attempts, please try again later",
  },
});

const deleteAccountLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 2,
  keyGenerator: getUserIdOrIpKey,
  message: {
    error: "too many account deletion requests, please try again later",
  },
});

const deleteAccountVerifyLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getClientIp,
  message: {
    error:
      "too many account deletion verification attempts, please try again later",
  },
});

const confirmDeleteAccountLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getClientIp,
  message: {
    error:
      "too many account deletion confirmation attempts, please try again later",
  },
});

// Authenticated Surface & General Operations
const authenticatedSurfaceLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: getUserIdOrIpKey,
  message: { error: "too many requests, please slow down" },
});

const reviewDecisionsLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 6,
  keyGenerator: getUserIdOrIpKey,
  message: { error: "too many review submissions, please slow down" },
});

const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 40,
  keyGenerator: getRefreshTokenOrIpKey,
  message: { error: "too many refresh attempts, please try again later" },
});

const accountFieldUpdateLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: getUserIdOrIpKey,
  message: { error: "too many requests, please try again later" },
});

// Each demo start fully rebuilds the demo account (deletes and re-seeds
// habits, logs, XP, etc.), so it's kept much stricter than a normal login.
const demoStartLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  keyGenerator: getClientIp,
  message: { error: "too many demo requests, please try again later" },
});

module.exports = {
  globalIpLimiter,
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
  resetPasswordVerifyLimiter,
  resetPasswordConfirmLimiter,
  changePasswordLimiter,
  changePasswordDailyLimiter,
  changeEmailLimiter,
  verifyEmailChangeLimiter,
  confirmEmailChangeLimiter,
  deleteAccountLimiter,
  deleteAccountVerifyLimiter,
  confirmDeleteAccountLimiter,
  authenticatedSurfaceLimiter,
  reviewDecisionsLimiter,
  refreshLimiter,
  logoutIpLimiter,
  logoutAllLimiter,
  accountFieldUpdateLimiter,
  demoStartLimiter,
};
