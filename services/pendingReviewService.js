const habitLogModel = require("../models/habitLogModel");
const { getPreviousUtcDate } = require("../utils/reviewWindow");
const calculateStreaks = require("../utils/streak");

async function evaluatePendingReviews(userId) {
  // (a) Expire first — scoped to this user
  await habitLogModel.expireStaleReviewsForUser(userId);

  // (b) Detect second — only habits owned by this user
  const yesterday = getPreviousUtcDate();
  const candidates = await habitLogModel.getHabitsMissingLogForDate(
    userId,
    yesterday,
  );

  for (const habit of candidates) {
    const rawLogs = await habitLogModel.getLogsForHabit(habit.id);
    const logs = rawLogs.map((log) => ({
      date: log.log_date,
      status: log.status,
    }));

    const dayBeforeGap = getPreviousUtcDate(new Date(`${yesterday}T00:00:00Z`));
    const { currentStreak } = calculateStreaks(logs, dayBeforeGap);

    if (currentStreak > 0) {
      await habitLogModel.insertPendingReview(habit.id, yesterday);
    }
  }
}

module.exports = { evaluatePendingReviews };
