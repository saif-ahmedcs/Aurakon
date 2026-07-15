const pendingReviewSessionModel = require("../models/pendingReviewSessionModel");
const habitLogModel = require("../models/habitLogModel");
const { isSessionExpired } = require("../utils/pendingReviewSessionRules");

async function addMissedDay(habitId, missedDate, tx) {
  let session = await pendingReviewSessionModel.findActiveByHabit(habitId, tx);

  if (session && isSessionExpired(session.last_missed_date, Date.now())) {
    await habitLogModel.expirePendingLogsForSession(session.id, tx);
    await pendingReviewSessionModel.resolve(session.id, tx);
    session = null;
  }

  if (!session) {
    const sessionId = await pendingReviewSessionModel.create(
      habitId,
      missedDate,
      tx,
    );
    await habitLogModel.insertPendingReviewLog(
      habitId,
      missedDate,
      sessionId,
      tx,
    );
    return;
  }

  await pendingReviewSessionModel.updateLastMissedDate(
    session.id,
    missedDate,
    tx,
  );
  await habitLogModel.insertPendingReviewLog(
    habitId,
    missedDate,
    session.id,
    tx,
  );
}

async function resolveSessionIfComplete(habitId, tx) {
  const stillPending = await habitLogModel.findPendingByHabit(habitId, tx);
  if (stillPending) return;

  const session = await pendingReviewSessionModel.findActiveByHabit(
    habitId,
    tx,
  );
  if (session) {
    await pendingReviewSessionModel.resolve(session.id, tx);
  }
}

module.exports = { addMissedDay, resolveSessionIfComplete };
