const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const habitService = require("../services/habitService");
const auth = require("../middleware/authenticate");
const finalizeReviews = require("../middleware/finalizeReviews");
const ownershipCheck = require("../middleware/ownership");
const validate = require("../middleware/validate");
const {
  createHabitSchema,
  updateHabitSchema,
  createLogSchema,
  logDateParamSchema,
} = require("../middleware/schemas/habitSchemas");

const { authenticatedSurfaceLimiter } = require("../middleware/rateLimiters");

const router = express.Router();
router.use(auth);
router.use(authenticatedSurfaceLimiter);
router.use(finalizeReviews);
router.use("/:id", ownershipCheck);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const habits = await habitService.listHabitsWithPending(
      req.user.id,
      req.user.timezone,
    );
    res.status(200).json(habits);
  }),
);

router.post(
  "/",
  validate(createHabitSchema),
  asyncHandler(async (req, res) => {
    const { title, difficulty } = req.body;
    const habit = await habitService.createHabit(
      title,
      req.user.id,
      difficulty,
      req.user.timezone,
    );
    res
      .status(201)
      .json({
        ...habit,
        affectedHabitIds: req.reconciledHabitIds,
        reversedBonuses: req.reconciledReversedBonuses || [],
        reversedShields: req.reconciledReversedShields || [],
        earnedBonuses: req.reconciledEarnedBonuses || [],
        earnedShields: req.reconciledEarnedShields || [],
        level: habit.level || req.reconciledLevel,
      });
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const habit = await habitService.getHabitDetail(
      req.habit,
      req.user.id,
      req.user.timezone,
    );
    res
      .status(200)
      .json({
        ...habit,
        affectedHabitIds: req.reconciledHabitIds,
        reversedBonuses: req.reconciledReversedBonuses || [],
        reversedShields: req.reconciledReversedShields || [],
        earnedBonuses: req.reconciledEarnedBonuses || [],
        earnedShields: req.reconciledEarnedShields || [],
      });
  }),
);

router.patch(
  "/:id",
  validate(updateHabitSchema),
  asyncHandler(async (req, res) => {
    const { title } = req.body;
    const updated = await habitService.updateHabit(
      req.habit,
      req.user.id,
      title,
    );
    res
      .status(200)
      .json({
        ...updated,
        affectedHabitIds: req.reconciledHabitIds,
        reversedBonuses: req.reconciledReversedBonuses || [],
        reversedShields: req.reconciledReversedShields || [],
        earnedBonuses: req.reconciledEarnedBonuses || [],
        earnedShields: req.reconciledEarnedShields || [],
        level: req.reconciledLevel,
      });
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { consistencyBonuses, level } = await habitService.deleteHabit(
      req.habitId,
      req.user.id,
      req.user.timezone,
    );
    return res.status(200).json({
      message: "Habit deleted successfully",
      affectedHabitIds: req.reconciledHabitIds,
      consistencyBonuses: consistencyBonuses || [],
      reversedBonuses: req.reconciledReversedBonuses || [],
      reversedShields: req.reconciledReversedShields || [],
      earnedBonuses: req.reconciledEarnedBonuses || [],
      earnedShields: req.reconciledEarnedShields || [],
      level: level || req.reconciledLevel,
    });
  }),
);

router.post(
  "/:id/logs",
  validate((req) => createLogSchema(req.user.timezone)),
  asyncHandler(async (req, res) => {
    const { date } = req.body;
    const {
      log,
      created,
      shieldEarned,
      shieldBalance,
      currentStreak,
      longestStreak,
      affectedHabitIds,
      consistencyBonuses,
      reversedBonuses,
      reversedShields,
      earnedBonuses,
      earnedShields,
      level,
    } = await habitService.logHabit(
      req.habitId,
      date,
      req.user.id,
      req.user.timezone,
    );
    const merged = [
      ...new Set([...(affectedHabitIds || []), ...req.reconciledHabitIds]),
    ];
    res.status(created ? 201 : 200).json({
      log,
      created,
      shieldEarned,
      shieldBalance,
      currentStreak,
      longestStreak,
      affectedHabitIds: merged,
      consistencyBonuses,
      reversedBonuses: [
        ...(reversedBonuses || []),
        ...(req.reconciledReversedBonuses || []),
      ],
      reversedShields: [
        ...(reversedShields || []),
        ...(req.reconciledReversedShields || []),
      ],
      earnedBonuses: [
        ...(earnedBonuses || []),
        ...(req.reconciledEarnedBonuses || []),
      ],
      earnedShields: [
        ...(earnedShields || []),
        ...(req.reconciledEarnedShields || []),
      ],
      level: level || req.reconciledLevel,
    });
  }),
);

router.get(
  "/:id/logs",
  asyncHandler(async (req, res) => {
    const logs = await habitService.listLogs(req.habitId, req.user.id);
    res.status(200).json(logs);
  }),
);

router.delete(
  "/:id/logs/:date",
  validate(logDateParamSchema, "params"),
  asyncHandler(async (req, res) => {
    const { date } = req.params;
    const {
      currentStreak,
      longestStreak,
      affectedHabitIds,
      reversedBonuses,
      reversedShields,
      earnedBonuses,
      earnedShields,
      level,
    } = await habitService.undoLog(
      req.habitId,
      date,
      req.user.id,
      req.user.timezone,
    );
    const merged = [
      ...new Set([...(affectedHabitIds || []), ...req.reconciledHabitIds]),
    ];
    res.status(200).json({
      message: "Log undone successfully",
      currentStreak,
      longestStreak,
      affectedHabitIds: merged,
      reversedBonuses: [
        ...(reversedBonuses || []),
        ...(req.reconciledReversedBonuses || []),
      ],
      reversedShields: [
        ...(reversedShields || []),
        ...(req.reconciledReversedShields || []),
      ],
      earnedBonuses: [
        ...(earnedBonuses || []),
        ...(req.reconciledEarnedBonuses || []),
      ],
      earnedShields: [
        ...(earnedShields || []),
        ...(req.reconciledEarnedShields || []),
      ],
      level: level || req.reconciledLevel,
    });
  }),
);

module.exports = router;
