const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const { REFRESH_COOKIE_OPTIONS } = require("../utils/cookieConfig");
const { REFRESH_TOKEN_MAX_AGE_MS } = require("../utils/constants");
const demoService = require("../services/demoService");
const { demoStartLimiter } = require("../middleware/rateLimiters");

const router = express.Router();

router.post(
  "/start",
  demoStartLimiter,
  asyncHandler(async (req, res) => {
    const { accessToken, rawRefreshToken } =
      await demoService.startDemoSession();

    res.cookie("refreshToken", rawRefreshToken, {
      ...REFRESH_COOKIE_OPTIONS,
      maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });

    res.status(200).json({ accessToken });
  }),
);

module.exports = router;
