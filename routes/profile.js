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

    const title = titleService.resolveCurrentTitle(progress.total_xp);

    res.status(200).json({
      username: user.username,
      level: progress.current_level,
      totalXp: progress.total_xp,
      title,
      shieldBalance: progress.shield_balance,
    });
  }),
);

module.exports = router;
