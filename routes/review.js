const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const pendingReviewService = require("../services/pendingReviewService");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const auth = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  reviewDecisionsSchema,
} = require("../middleware/schemas/reviewSchemas");
const router = express.Router();
router.use(auth);

router.get(
  "/pending",
  asyncHandler(async (req, res) => {
    await pendingReviewService.evaluatePendingReviews(req.user.id);

    const totalHabits = await habitModel.countByUser(req.user.id);
    const pendingRows = await habitLogModel.findPendingForUser(req.user.id);

    const pending = pendingRows.map((row) => ({
      habitId: row.habit_id,
      habitName: row.habit_name,
      missedDate: row.missed_date,
      createdAt: row.created_at,
    }));

    const pendingCount = pending.length;
    const autoPopupThreshold =
      totalHabits < 6 ? 3 : Math.floor(totalHabits / 2);
    const shouldAutoPopup =
      pendingCount > 0 && pendingCount >= autoPopupThreshold;

    res.status(200).json({
      pending,
      totalHabits,
      pendingCount,
      autoPopupThreshold,
      shouldAutoPopup,
    });
  }),
);

router.post(
  "/decisions",
  validate(reviewDecisionsSchema),
  asyncHandler(async (req, res) => {
    const { decisions } = req.body;

    const results = [];

    for (const item of decisions) {
      const { habitId, missedDate, decision } = item;

      const pending = await habitLogModel.findPendingByHabitAndDate(
        habitId,
        missedDate,
        req.user.id,
      );

      if (!pending) {
        results.push({ habitId, missedDate, result: "not_found" });
        continue;
      }

      const newStatus = decision === "completed" ? "recovered" : "missed";
      await habitLogModel.resolveDecision(pending.id, newStatus);

      results.push({ habitId, missedDate, result: newStatus });
    }

    res.status(200).json({ results });
  }),
);

module.exports = router;
