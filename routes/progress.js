const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const auth = require("../middleware/authenticate");
const requireGender = require("../middleware/requireGender");
const finalizeReviews = require("../middleware/finalizeReviews");
const titleService = require("../services/titleService");
const streakService = require("../services/streakService");
const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const { todayInTimezone } = require("../utils/timezone");

const router = express.Router();
router.use(auth);
router.use(requireGender);
router.use(finalizeReviews);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const today = todayInTimezone(req.user.timezone);

    const [progress, todayStats] = await Promise.all([
      userProgressModel.getProgress(userId),
      dailyAuraStatsModel.getByDate(userId, today),
    ]);

    const reconciledStreak = await streakService.reconcileStaleStreak(
      userId,
      today,
      progress,
    );
    const title = titleService.resolveCurrentTitle(progress.total_xp);
    const { titles, nextRank } = titleService.getTitleProgress(
      progress.total_xp,
    );

    res.status(200).json({
      totalXp: progress.total_xp,
      title,
      titles,
      nextRank,
      level: progress.current_level,
      auraEnergyToday: todayStats ? todayStats.aura_energy : 0,
      globalDailyStreak: reconciledStreak,
      shieldBalance: progress.shield_balance,
    });
  }),
);

module.exports = router;
