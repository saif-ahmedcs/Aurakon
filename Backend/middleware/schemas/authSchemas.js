const { z } = require("zod");
const { isPasswordValid } = require("../../utils/passwordPolicy");
const { isValidTimezone } = require("../../utils/timezone");

const normalizedEmailSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .pipe(z.email());

const boundedNormalizedEmailSchema = z
  .string()
  .trim()
  .max(255)
  .transform((value) => value.toLowerCase())
  .pipe(z.email());

const registerSchema = z.object({
  email: boundedNormalizedEmailSchema,
  password: z.string().min(8).max(72).refine(isPasswordValid, {
    message:
      "password must be at least 8 characters and contain at least one letter and one number",
  }),
  username: z.string().trim().min(3).max(20),
  gender: z.enum(["male", "female"]),
});

const setGenderSchema = z.object({
  gender: z.enum(["male", "female"]),
});

const loginSchema = z.object({
  email: boundedNormalizedEmailSchema,
  password: z.string().min(1).max(72),
});

const forgotPasswordSchema = z.object({
  email: normalizedEmailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(1).max(255),
  newPassword: z.string().min(8).max(72).refine(isPasswordValid, {
    message:
      "password must be at least 8 characters and contain at least one letter and one number",
  }),
});

const resendVerificationSchema = z.object({
  email: normalizedEmailSchema,
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(72).refine(isPasswordValid, {
    message:
      "password must be at least 8 characters and contain at least one letter and one number",
  }),
});

const updateTimezoneSchema = z.object({
  timezone: z.string().min(1).refine(isValidTimezone, {
    message: "invalid IANA timezone",
  }),
});

const requestEmailChangeSchema = z.object({
  newEmail: boundedNormalizedEmailSchema,
  currentPassword: z.string().min(1).max(128),
});

const updateUsernameSchema = z.object({
  username: z.string().trim().min(3).max(20),
});

const confirmEmailVerificationSchema = z.object({
  token: z.string().min(1).max(255),
});

const confirmEmailChangeSchema = z.object({
  token: z.string().min(1).max(255),
  currentPassword: z.string().min(1).max(128),
});

const confirmDeleteAccountSchema = z.object({
  token: z.string().min(1).max(255),
  currentPassword: z.string().min(1).max(128),
});

const tokenQuerySchema = z.object({
  token: z.string().min(1).max(255),
});

module.exports = {
  registerSchema,
  setGenderSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  resendVerificationSchema,
  changePasswordSchema,
  updateTimezoneSchema,
  requestEmailChangeSchema,
  updateUsernameSchema,
  confirmEmailVerificationSchema,
  confirmEmailChangeSchema,
  confirmDeleteAccountSchema,
  tokenQuerySchema,
};
