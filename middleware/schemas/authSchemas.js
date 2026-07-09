const { z } = require("zod");
const { isPasswordValid } = require("../../utils/passwordPolicy");

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).refine(isPasswordValid, {
    message:
      "password must be at least 8 characters and contain at least one letter and one number",
  }),
  username: z.string().trim().min(3).max(20),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).refine(isPasswordValid, {
    message:
      "password must be at least 8 characters and contain at least one letter and one number",
  }),
});

const resendVerificationSchema = z.object({
  email: z.string().trim().email(),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
};
