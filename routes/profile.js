const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const auth = require("../middleware/authenticate");
const titleService = require("../services/titleService");
const userModel = require("../models/userModel");
const userProgressModel = require("../models/userProgressModel");

const router = express.Router();
router.use(auth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const [user, progress] = await Promise.all([
      userModel.findById(req.user.id),
      userProgressModel.getProgress(req.user.id),
    ]);

    const safeProgress = progress ?? {
      current_level: 0,
      total_xp: 0,
      shield_balance: 0,
    };
    const title = titleService.resolveCurrentTitle(safeProgress.total_xp);

    res.status(200).json({
      username: user.username,
      level: safeProgress.current_level,
      totalXp: safeProgress.total_xp,
      title,
      shieldBalance: safeProgress.shield_balance,
    });
  }),
);

module.exports = router;
