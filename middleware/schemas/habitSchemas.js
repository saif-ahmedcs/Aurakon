const { z } = require("zod");

const createHabitSchema = z.object({
  title: z.string().trim().min(1),
  target_days: z.number().int().positive().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const updateHabitSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    target_days: z.number().int().positive().optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.target_days !== undefined,
    {
      message: "at least one of title or target_days must be provided",
    },
  );

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
    ),
});

module.exports = { createHabitSchema, updateHabitSchema, logSchema };
