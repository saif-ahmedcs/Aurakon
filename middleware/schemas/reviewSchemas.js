const { z } = require("zod");

const reviewDecisionsSchema = z.object({
  decisions: z
    .array(
      z
        .object({
          habitId: z.number().int().positive(),
          missedDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "missedDate must match YYYY-MM-DD"),
          decision: z.enum(["completed", "missed"]),
          useShield: z.boolean().optional(),
        })
        .refine(
          (data) => !(data.useShield === true && data.decision !== "missed"),
          {
            message: "useShield can only be used when decision is 'missed'",
          },
        ),
    )
    .min(1)
    .max(50, "decisions array cannot exceed 50 items"),
});

module.exports = { reviewDecisionsSchema };
