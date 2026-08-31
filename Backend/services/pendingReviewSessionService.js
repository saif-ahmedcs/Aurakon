const pendingReviewSessionModel = require("../models/pendingReviewSessionModel");
const habitLogModel = require("../models/habitLogModel");
const guardianShieldService = require("./guardianShieldService");
const streakService = require("./streakService");
const { isSessionExpired } = require("../utils/pendingReviewSessionRules");
const { parseToUTCDay } = require("../utils/dateUtils");

async function attachMissedDayToSession(habitId, missedDate, sessionId, tx) {
  await pendingReviewSessionModel.updateLastMissedDate(
    sessionId,
    missedDate,
    tx,
  );
  await habitLogModel.insertPendingReviewLog(
    habitId,
    missedDate,
    sessionId,
    tx,
  );
}

async function addMissedDay(userId, habitId, missedDate, tx, timezone, cache) {
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
      const fullCompletionCache =
        cache || streakService.createFullCompletionCache();
      for (const row of expiredLogs) {
        streakService.updateHabitLogCache(
          fullCompletionCache,
          row.habitId,
          row.logDate,
          "missed",
        );
      }
      const earliestDate = expiredLogs.map((row) => row.logDate).sort()[0];
      const logs = await streakService.getLogsForHabitCached(
        habitId,
        tx,
        fullCompletionCache,
      );
      const {
        affectedHabitIds: crossHabitIds,
        reversedBonuses,
        reversedShields,
        earnedBonuses,
        earnedShields,
      } =
        await guardianShieldService.reconcileShieldsFromDate(
          userId,
          habitId,
          logs,
          earliestDate,
          tx,
          timezone,
          fullCompletionCache,
        );
      return {
        affectedHabitIds: [...new Set([habitId, ...crossHabitIds])],
        reversedBonuses: reversedBonuses || [],
        reversedShields: reversedShields || [],
        earnedBonuses: earnedBonuses || [],
        earnedShields: earnedShields || [],
      };
    }
  }

  if (!session) {
    const sessionId = await pendingReviewSessionModel.create(
      habitId,
      missedDate,
      tx,
    );

    if (sessionId === null) {
      const concurrentSession =
        await pendingReviewSessionModel.findActiveByHabit(habitId, tx);
      await attachMissedDayToSession(
        habitId,
        missedDate,
        concurrentSession.id,
        tx,
      );
      return {
        affectedHabitIds: [],
        reversedBonuses: [],
        reversedShields: [],
        earnedBonuses: [],
        earnedShields: [],
      };
    }

    await habitLogModel.insertPendingReviewLog(
      habitId,
      missedDate,
      sessionId,
      tx,
    );
    return {
      affectedHabitIds: [],
      reversedBonuses: [],
      reversedShields: [],
      earnedBonuses: [],
      earnedShields: [],
    };
  }

  await attachMissedDayToSession(habitId, missedDate, session.id, tx);
  return {
    affectedHabitIds: [],
    reversedBonuses: [],
    reversedShields: [],
    earnedBonuses: [],
    earnedShields: [],
  };
}

async function resolveSessionIfComplete(habitId, tx) {
  await pendingReviewSessionModel.resolveIfNoPending(habitId, tx);
}

module.exports = { addMissedDay, resolveSessionIfComplete };
