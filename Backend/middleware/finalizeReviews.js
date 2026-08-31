const asyncHandler = require("../utils/asyncHandler");
const reviewSyncService = require("../services/reviewSyncService");

const finalizeReviews = asyncHandler(async (req, res, next) => {
  const result = await reviewSyncService.evaluatePendingReviews(
    req.user.id,
    req.user.timezone,
  );
  req.reconciledHabitIds = (result && result.affectedHabitIds) || [];
  req.reconciledReversedBonuses = (result && result.reversedBonuses) || [];
  req.reconciledReversedShields = (result && result.reversedShields) || [];
  req.reconciledEarnedBonuses = (result && result.earnedBonuses) || [];
  req.reconciledEarnedShields = (result && result.earnedShields) || [];
  next();
});

module.exports = finalizeReviews;
