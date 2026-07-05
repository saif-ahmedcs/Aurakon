const express = require("express");
const asyncHandler = require("../utils/asyncHandler");
const pool = require("../db");
const calculateStreaks = require("../utils/streak");
const pendingReviewService = require("../services/pendingReviewService");
const habitLogModel = require("../models/habitLogModel");
const auth = require("../middleware/authenticate");

const router = express.Router();
router.use(auth);

async function ownershipCheck(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "invalid id" });
  }
  const [rows] = await pool.query(
    "SELECT * FROM habits WHERE id = ? AND user_id = ?",
    [id, req.user.id],
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "habit not found" });
  }
  req.habit = rows[0];
  next();
}

router.use("/:id", asyncHandler(ownershipCheck));

router.get(
  "/",
  asyncHandler(async (req, res) => {
    await pendingReviewService.evaluatePendingReviews();

    const [rows] = await pool.query("SELECT * FROM habits WHERE user_id = ?", [
      req.user.id,
    ]);
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
  asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!title || title.trim() === "") {
      return res.status(400).json({ error: "title is required" });
    }

    const [result] = await pool.query(
      "INSERT INTO habits (title, user_id) VALUES (?, ?)",
      [title, req.user.id],
    );
    const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [
      result.insertId,
    ]);

    res.status(201).json(rows[0]);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "habit not found" });
    }

    const [logRows] = await pool.query(
      "SELECT log_date, status FROM habit_logs WHERE habit_id = ?",
      [id],
    );

    const logs = logRows.map((row) => ({
      date: row.log_date,
      status: row.status,
    }));
    const asOfDate = new Date().toISOString().slice(0, 10);
    const { currentStreak, longestStreak } = calculateStreaks(logs, asOfDate);

    await pendingReviewService.evaluatePendingReviews();
    const pending = await habitLogModel.findPendingByHabit(id);
    const pendingReview = pending
      ? { missedDate: pending.missed_date, createdAt: pending.created_at }
      : null;

    res.status(200).json({
      ...rows[0],
      currentStreak,
      longestStreak,
      pendingReview,
    });
  }),
);

router.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const [rows] = await pool.query("SELECT * FROM habits WHERE id = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "habit not found" });
    }

    const habit = rows[0];
    const { title, target_days } = req.body;

    if (title !== undefined && title.trim() === "") {
      return res.status(400).json({ error: "title is required" });
    }

    if (target_days !== undefined && target_days <= 0) {
      return res
        .status(400)
        .json({ error: "target_days must be greater than 0" });
    }

    const updatedTitle = title !== undefined ? title : habit.title;
    const updatedTargetDays =
      target_days !== undefined ? target_days : habit.target_days;

    const isNoOp =
      updatedTitle === habit.title && updatedTargetDays === habit.target_days;

    if (isNoOp) {
      return res.status(200).json(habit);
    }

    await pool.query(
      "UPDATE habits SET title = ?, target_days = ? WHERE id = ?",
      [updatedTitle, updatedTargetDays, id],
    );

    const [updatedRows] = await pool.query(
      "SELECT * FROM habits WHERE id = ?",
      [id],
    );

    res.status(200).json(updatedRows[0]);
  }),
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "invalid id" });
    }

    const [result] = await pool.query("DELETE FROM habits WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "habit not found" });
    }

    return res.status(200).json({
      message: "Habit deleted successfully",
    });
  }),
);

router.post(
  "/:id/logs",
  asyncHandler(async (req, res) => {
    const habitId = Number(req.params.id);

    if (!Number.isInteger(habitId) || habitId <= 0) {
      return res.status(400).json({ error: "invalid id" });
    }

    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const dateFormatMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

    if (!dateFormatMatch) {
      return res.status(400).json({ error: "invalid date format" });
    }

    const [, yearStr, monthStr, dayStr] = dateFormatMatch;
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);

    const asUTC = new Date(Date.UTC(year, month - 1, day));
    const isRealCalendarDate =
      asUTC.getUTCFullYear() === year &&
      asUTC.getUTCMonth() === month - 1 &&
      asUTC.getUTCDate() === day;

    if (!isRealCalendarDate) {
      return res.status(400).json({ error: "invalid date format" });
    }

    const pending = await habitLogModel.findPendingByHabitAndDate(
      habitId,
      date,
    );

    if (pending) {
      await habitLogModel.resolveDecision(pending.id, "recovered");

      const [resolvedRows] = await pool.query(
        "SELECT * FROM habit_logs WHERE id = ?",
        [pending.id],
      );

      return res.status(200).json(resolvedRows[0]);
    }

    try {
      const [result] = await pool.query(
        "INSERT INTO habit_logs (habit_id, log_date) VALUES (?, ?)",
        [habitId, date],
      );

      const [rows] = await pool.query("SELECT * FROM habit_logs WHERE id = ?", [
        result.insertId,
      ]);

      res.status(201).json(rows[0]);
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
    const habitId = Number(req.params.id);

    if (!Number.isInteger(habitId) || habitId <= 0) {
      return res.status(400).json({ error: "invalid id" });
    }

    const [habitRows] = await pool.query("SELECT * FROM habits WHERE id = ?", [
      habitId,
    ]);

    if (habitRows.length === 0) {
      return res.status(404).json({ error: "habit not found" });
    }

    const [logRows] = await pool.query(
      "SELECT * FROM habit_logs WHERE habit_id = ? ORDER BY log_date ASC",
      [habitId],
    );

    res.status(200).json(logRows);
  }),
);

module.exports = router;
