const asyncHandler = require("../utils/asyncHandler");
const reviewSyncService = require("../services/reviewSyncService");

const finalizeReviews = asyncHandler(async (req, res, next) => {
  await reviewSyncService.evaluatePendingReviews(req.user.id);
  next();
});

module.exports = finalizeReviews;
