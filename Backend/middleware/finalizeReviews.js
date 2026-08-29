const asyncHandler = require("../utils/asyncHandler");
const reviewSyncService = require("../services/reviewSyncService");

const finalizeReviews = asyncHandler(async (req, res, next) => {
  const result = await reviewSyncService.evaluatePendingReviews(
    req.user.id,
    req.user.timezone,
  );
  req.reconciledHabitIds = (result && result.affectedHabitIds) || [];
  next();
});

module.exports = finalizeReviews;
