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
  logSchema,
} = require("../middleware/schemas/habitSchemas");

const router = express.Router();
router.use(auth);
router.use(finalizeReviews);
router.use("/:id", ownershipCheck);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const habits = await habitService.listHabitsWithPending(req.user.id);
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
    );
    res.status(201).json(habit);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const habit = await habitService.getHabitDetail(req.habitId, req.user.id);
    res.status(200).json(habit);
  }),
);

router.patch(
  "/:id",
  validate(updateHabitSchema),
  asyncHandler(async (req, res) => {
    const { title, target_days } = req.body;
    const updated = await habitService.updateHabit(
      req.habitId,
      req.user.id,
      title,
      target_days,
    );
    res.status(200).json(updated);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await habitService.deleteHabit(req.habitId, req.user.id);
    return res.status(200).json({ message: "Habit deleted successfully" });
  }),
);

router.post(
  "/:id/logs",
  validate(logSchema),
  asyncHandler(async (req, res) => {
    const { date } = req.body;
    const { log, created } = await habitService.logHabit(
      req.habitId,
      date,
      req.user.id,
    );
    res.status(created ? 201 : 200).json(log);
  }),
);

router.get(
  "/:id/logs",
  asyncHandler(async (req, res) => {
    const logs = await habitService.listLogs(req.habitId);
    res.status(200).json(logs);
  }),
);

module.exports = router;
