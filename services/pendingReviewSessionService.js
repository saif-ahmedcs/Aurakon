const pendingReviewSessionModel = require("../models/pendingReviewSessionModel");
const habitLogModel = require("../models/habitLogModel");
const guardianShieldService = require("./guardianShieldService");
const { isSessionExpired } = require("../utils/pendingReviewSessionRules");
const { parseToUTCDay } = require("../utils/dateUtils");

async function addMissedDay(userId, habitId, missedDate, tx) {
  let session = await pendingReviewSessionModel.findActiveByHabit(habitId, tx);

  if (
    session &&
    isSessionExpired(session.last_missed_date, parseToUTCDay(missedDate))
  ) {
    const expiredLogs = await habitLogModel.expirePendingLogsForSession(
      session.id,
      tx,
    );
    await pendingReviewSessionModel.resolve(session.id, tx);
    session = null;

    if (expiredLogs.length > 0) {
      const earliestDate = expiredLogs.map((row) => row.logDate).sort()[0];
      const rawLogs = await habitLogModel.getLogsForHabit(habitId, tx);
      const logs = rawLogs.map((row) => ({
        date: row.log_date,
        status: row.status,
      }));
      await guardianShieldService.reconcileShieldsFromDate(
        userId,
        habitId,
        logs,
        earliestDate,
        tx,
      );
    }
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
