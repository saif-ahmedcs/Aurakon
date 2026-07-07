const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const calculateStreaks = require("../utils/streak");
const pendingReviewService = require("../services/pendingReviewService");
const habitLogModel = require("../models/habitLogModel");
const habitModel = require("../models/habitModel");
const auth = require("../middleware/authenticate");
const ownershipCheck = require("../middleware/ownership");
const validate = require("../middleware/validate");
const {
  createHabitSchema,
  updateHabitSchema,
  logSchema,
} = require("../middleware/schemas/habitSchemas");

const router = express.Router();
router.use(auth);

router.use("/:id", ownershipCheck);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    await pendingReviewService.evaluatePendingReviews(req.user.id);

    const rows = await habitModel.findAllByUser(req.user.id);
    const pendingRows = await habitLogModel.findPendingForUser(req.user.id);
    const pendingByHabitId = new Map(
      pendingRows.map((row) => [row.habit_id, row]),
    );

    const habitsWithPending = rows.map((habit) => {
      const pending = pendingByHabitId.get(habit.id);
      return {
        ...habit,
        pendingReview: pending
          ? { missedDate: pending.missed_date, createdAt: pending.created_at }
          : null,
      };
    });

    res.status(200).json(habitsWithPending);
  }),
);

router.post(
  "/",
  validate(createHabitSchema),
  asyncHandler(async (req, res) => {
    const { title } = req.body;

    const habit = await habitModel.create(title, req.user.id);
    res.status(201).json(habit);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.habit.id;

    const logRows = await habitLogModel.getLogsForHabit(id);
    const logs = logRows.map((row) => ({
      date: row.log_date,
      status: row.status,
    }));

    const asOfDate = new Date().toISOString().slice(0, 10);
    const { currentStreak, longestStreak } = calculateStreaks(logs, asOfDate);

    await pendingReviewService.evaluatePendingReviews(req.user.id);
    const pending = await habitLogModel.findPendingByHabit(id);
    const pendingReview = pending
      ? { missedDate: pending.missed_date, createdAt: pending.created_at }
      : null;

    res.status(200).json({
      ...req.habit,
      currentStreak,
      longestStreak,
      pendingReview,
    });
  }),
);

router.patch(
  "/:id",
  validate(updateHabitSchema),
  asyncHandler(async (req, res) => {
    const habit = req.habit;
    const { title, target_days } = req.body;

    const updatedTitle = title !== undefined ? title : habit.title;
    const updatedTargetDays =
      target_days !== undefined ? target_days : habit.target_days;

    const isNoOp =
      updatedTitle === habit.title && updatedTargetDays === habit.target_days;

    if (isNoOp) {
      return res.status(200).json(habit);
    }

    const updated = await habitModel.update(
      habit.id,
      updatedTitle,
      updatedTargetDays,
    );
    res.status(200).json(updated);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await habitModel.remove(req.habit.id);
    return res.status(200).json({ message: "Habit deleted successfully" });
  }),
);

router.post(
  "/:id/logs",
  validate(logSchema),
  asyncHandler(async (req, res) => {
    const habitId = req.habit.id;
    const { date } = req.body;

    const pending = await habitLogModel.findPendingByHabitAndDate(
      habitId,
      date,
      req.user.id,
    );

    if (pending) {
      await habitLogModel.resolveDecision(pending.id, "recovered");

      const resolvedLog = await habitLogModel.findById(pending.id);
      return res.status(200).json(resolvedLog);
    }

    try {
      const log = await habitLogModel.insertLog(habitId, date);
      res.status(201).json(log);
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res
          .status(409)
          .json({ error: "habit already logged for this date" });
      }
      if (err.code === "ER_NO_REFERENCED_ROW_2") {
        return res.status(404).json({ error: "habit not found" });
      }
      throw err;
    }
  }),
);

router.get(
  "/:id/logs",
  asyncHandler(async (req, res) => {
    const logs = await habitLogModel.findAllByHabit(req.habit.id);
    res.status(200).json(logs);
  }),
);

module.exports = router;
