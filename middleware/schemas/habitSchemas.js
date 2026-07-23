const { z } = require("zod");
const { todayInTimezone } = require("../../utils/timezone");

const createHabitSchema = z.object({
  title: z.string().trim().min(1).max(50),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const updateHabitSchema = z.object({
  title: z.string().trim().min(1).max(50),
});

function isValidCalendarDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  const asUTC = new Date(Date.UTC(year, month - 1, day));
  return (
    asUTC.getUTCFullYear() === year &&
    asUTC.getUTCMonth() === month - 1 &&
    asUTC.getUTCDate() === day
  );
}

function createLogSchema(timezone) {
  return z.object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "date must match YYYY-MM-DD")
      .refine(isValidCalendarDate, { message: "invalid date" })
      .refine((value) => value <= todayInTimezone(timezone), {
        message: "date cannot be in the future",
      }),
  });
}

const logDateParamSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must match YYYY-MM-DD")
    .refine(isValidCalendarDate, { message: "invalid date" }),
});

module.exports = {
  createHabitSchema,
  updateHabitSchema,
  createLogSchema,
  logDateParamSchema,
};
