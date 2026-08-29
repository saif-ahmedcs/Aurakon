const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const auth = require("../middleware/authenticate");
const finalizeReviews = require("../middleware/finalizeReviews");
const titleService = require("../services/titleService");
const streakService = require("../services/streakService");
const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");
const { todayInTimezone } = require("../utils/timezone");
const { authenticatedSurfaceLimiter } = require("../middleware/rateLimiters");

const router = express.Router();
router.use(auth);
router.use(authenticatedSurfaceLimiter);
router.use(finalizeReviews);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const today = todayInTimezone(req.user.timezone);

    const [progressRow, todayStats] = await Promise.all([
      userProgressModel.getProgress(userId),
      dailyAuraStatsModel.getByDate(userId, today),
    ]);

    const progress = progressRow ?? {
      current_level: 1,
      total_xp: 0,
      shield_balance: 0,
      global_daily_streak: 0,
      last_full_completion_date: null,
    };

    const reconciledStreak = await streakService.reconcileStaleStreak(
      userId,
      today,
      progress,
    );
    const totalXp = Number(progress.total_xp);
    const title = titleService.resolveCurrentTitle(totalXp);
    const { titles, nextRank } = titleService.getTitleProgress(totalXp);

    res.status(200).json({
      totalXp,
      title,
      titles,
      nextRank,
      level: progress.current_level,
      auraEnergyToday: todayStats ? todayStats.aura_energy : 0,
      globalDailyStreak: reconciledStreak,
      shieldBalance: progress.shield_balance,
      affectedHabitIds: req.reconciledHabitIds,
    });
  }),
);

module.exports = router;
