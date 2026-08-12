const { toIsoTimestamp } = require("./timezone");

function serializePendingReviewGroup(rows) {
  if (!rows || rows.length === 0) {
    return null;
  }
  return {
    sessionId: rows[0].review_session_id,
    missedDates: rows.map((row) => row.missed_date),
    createdAt: toIsoTimestamp(rows[0].created_at),
  };
}

function serializeHabit(row, pendingReview = null) {
  return {
    id: row.id,
    title: row.title,
    difficulty: row.difficulty,
    userId: row.user_id,
    createdAt: toIsoTimestamp(row.created_at),
    archivedAt: toIsoTimestamp(row.archived_at),
    shieldDeferredSince: row.shield_deferred_since,
    currentStreak: row.current_streak,
    longestStreak: row.longest_streak,
    pendingReview,
  };
}

function serializeHabitLog(row) {
  return {
    id: row.id,
    habitId: row.habit_id,
    date: row.log_date,
    status: row.status,
    reviewSessionId: row.review_session_id,
    createdAt: toIsoTimestamp(row.created_at),
  };
}

module.exports = {
  serializeHabit,
  serializePendingReviewGroup,
  serializeHabitLog,
};
