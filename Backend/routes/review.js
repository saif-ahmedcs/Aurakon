const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const reviewService = require("../services/reviewService");
const auth = require("../middleware/authenticate");
const requireGender = require("../middleware/requireGender");
const finalizeReviews = require("../middleware/finalizeReviews");
const validate = require("../middleware/validate");
const {
  reviewDecisionsSchema,
} = require("../middleware/schemas/reviewSchemas");
const {
  authenticatedSurfaceLimiter,
  reviewDecisionsLimiter,
} = require("../middleware/rateLimiters");

const router = express.Router();
router.use(auth);
router.use(authenticatedSurfaceLimiter);
router.use(requireGender);
router.use(finalizeReviews);

router.get(
  "/pending",
  asyncHandler(async (req, res) => {
    const result = await reviewService.getPendingReviews(req.user.id);
    res
      .status(200)
      .json({
        ...result,
        affectedHabitIds: req.reconciledHabitIds,
        reversedBonuses: req.reconciledReversedBonuses || [],
        reversedShields: req.reconciledReversedShields || [],
        earnedBonuses: req.reconciledEarnedBonuses || [],
        earnedShields: req.reconciledEarnedShields || [],
      });
  }),
);

router.post(
  "/decisions",
  reviewDecisionsLimiter,
  validate(reviewDecisionsSchema),
  asyncHandler(async (req, res) => {
    const { decisions } = req.body;
    const {
      results,
      consistencyBonuses,
      affectedHabitIds,
      reversedBonuses,
      reversedShields,
      earnedBonuses,
      earnedShields,
      shieldBalance,
      shieldEarned,
      level,
    } = await reviewService.applyDecisions(
      decisions,
      req.user.id,
      req.user.timezone,
    );
    const merged = [
      ...new Set([...(affectedHabitIds || []), ...req.reconciledHabitIds]),
    ];
    res.status(200).json({
      results,
      consistencyBonuses,
      affectedHabitIds: merged,
      reversedBonuses: [
        ...(reversedBonuses || []),
        ...(req.reconciledReversedBonuses || []),
      ],
      reversedShields: [
        ...(reversedShields || []),
        ...(req.reconciledReversedShields || []),
      ],
      earnedBonuses: [
        ...(earnedBonuses || []),
        ...(req.reconciledEarnedBonuses || []),
      ],
      earnedShields: [
        ...(earnedShields || []),
        ...(req.reconciledEarnedShields || []),
      ],
      shieldBalance,
      shieldEarned,
      level: level || req.reconciledLevel,
    });
  }),
);

module.exports = router;
