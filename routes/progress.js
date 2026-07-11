const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const auth = require("../middleware/authenticate");
const titleService = require("../services/titleService");
const userProgressModel = require("../models/userProgressModel");
const dailyAuraStatsModel = require("../models/dailyAuraStatsModel");

const router = express.Router();
router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const [progress, todayStats] = await Promise.all([
      userProgressModel.getProgress(userId),
      dailyAuraStatsModel.getByDate(userId, today),
    ]);
    const title = titleService.resolveCurrentTitle(progress.total_xp);

    res.status(200).json({
      totalXp: progress.total_xp,
      title,
      level: progress.current_level,
      auraEnergyToday: todayStats ? todayStats.aura_energy : 0,
      globalDailyStreak: progress.global_daily_streak,
      shieldBalance: progress.shield_balance,
    });
  }),
);

module.exports = router;
