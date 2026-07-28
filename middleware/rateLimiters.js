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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const email = (req.body?.email ?? "").toLowerCase().trim();
    return `${ipKeyGenerator(req.ip)}:${email}`;
  },
  message: {
    error: "too many requests, please try again later",
  },
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

module.exports = {
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  changeEmailLimiter,
  verifyEmailChangeLimiter,
  deleteAccountLimiter,
  deleteAccountVerifyLimiter,
};
