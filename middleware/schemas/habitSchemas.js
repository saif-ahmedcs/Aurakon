const { z } = require("zod");

const createHabitSchema = z.object({
  title: z.string().trim().min(1).max(50),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const updateHabitSchema = z.object({
  title: z.string().trim().min(1).max(50),
});

const logSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must match YYYY-MM-DD")
    .refine(
      (value) => {
        const [year, month, day] = value.split("-").map(Number);
        const asUTC = new Date(Date.UTC(year, month - 1, day));
        return (
          asUTC.getUTCFullYear() === year &&
          asUTC.getUTCMonth() === month - 1 &&
          asUTC.getUTCDate() === day
        );
      },
      { message: "invalid date" },
    )
    .refine((value) => value <= new Date().toISOString().slice(0, 10), {
      message: "date cannot be in the future",
    }),
});

const logDateParamSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must match YYYY-MM-DD")
    .refine(
      (value) => {
        const [year, month, day] = value.split("-").map(Number);
        const asUTC = new Date(Date.UTC(year, month - 1, day));
        return (
          asUTC.getUTCFullYear() === year &&
          asUTC.getUTCMonth() === month - 1 &&
          asUTC.getUTCDate() === day
        );
      },
      { message: "invalid date" },
    ),
});

module.exports = {
  createHabitSchema,
  updateHabitSchema,
  logSchema,
  logDateParamSchema,
};
