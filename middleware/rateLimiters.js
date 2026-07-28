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

module.exports = {
  registerLimiter,
  verifyEmailLimiter,
  resendVerificationLimiter,
  loginLimiter,
  forgotPasswordLimiter,
};
