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
    res.status(200).json(result);
  }),
);

router.post(
  "/decisions",
  reviewDecisionsLimiter,
  validate(reviewDecisionsSchema),
  asyncHandler(async (req, res) => {
    const { decisions } = req.body;
    const results = await reviewService.applyDecisions(
      decisions,
      req.user.id,
      req.user.timezone,
    );
    res.status(200).json({ results });
  }),
);

module.exports = router;
