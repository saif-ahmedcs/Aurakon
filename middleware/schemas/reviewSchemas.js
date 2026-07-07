const { z } = require("zod");

const reviewDecisionsSchema = z.object({
  decisions: z
    .array(
      z.object({
        habitId: z.number().int().positive(),
        missedDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "missedDate must match YYYY-MM-DD"),
        decision: z.enum(["completed", "missed"]),
      }),
    )
    .min(1),
});

module.exports = { reviewDecisionsSchema };
