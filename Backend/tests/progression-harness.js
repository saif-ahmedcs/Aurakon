process.env.TZ = "UTC";
require("dotenv").config();
const { pool, runInTransaction } = require("../db");

const habitLogModel = require("../models/habitLogModel");
const userProgressModel = require("../models/userProgressModel");
const guardianShieldLogModel = require("../models/guardianShieldLogModel");
const xpBonusLogModel = require("../models/xpBonusLogModel");
const pendingReviewSessionModel = require("../models/pendingReviewSessionModel");

const completionRewardService = require("../services/completionRewardService");
const guardianShieldService = require("../services/guardianShieldService");
const dailyAuraStatsService = require("../services/dailyAuraStatsService");
const bonusService = require("../services/bonusService");
const levelService = require("../services/levelService");
const pendingReviewSessionService = require("../services/pendingReviewSessionService");
const xpService = require("../services/xpService");

const { calculateHabitStreaks } = require("../utils/streak");
const { addUtcDays } = require("../utils/reviewWindow");
const { parseToUTCDay } = require("../utils/dateUtils");
const {
  isSessionExpired,
  GRACE_PERIOD_MS,
} = require("../utils/pendingReviewSessionRules");

const TZ = "UTC";
const TEST_EMAIL = "progression-test-harness@local.test";

let pass = 0,
  fail = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(
    (ok ? "PASS" : "FAIL") +
      " - " +
      name +
      " => " +
      JSON.stringify(actual) +
      " (expected " +
      JSON.stringify(expected) +
      ")",
  );
  if (ok) pass++;
  else fail++;
}

// ---------- harness helpers (bypass auth/API layer entirely) ----------

async function resetAndCreateUser() {
  await pool.query(
    `DELETE FROM habits WHERE user_id = (SELECT id FROM users WHERE email = ?)`,
    [TEST_EMAIL],
  );
  await pool.query(`DELETE FROM users WHERE email = ?`, [TEST_EMAIL]);
  const [result] = await pool.query(
    `INSERT INTO users (email, password_hash, username, is_verified, timezone, created_at)
     VALUES (?, 'harness', 'harness', true, 'UTC', UTC_TIMESTAMP())`,
    [TEST_EMAIL],
  );
  return result.insertId;
}

async function createHabit(userId, difficulty, createdAt) {
  const [result] = await pool.query(
    `INSERT INTO habits (title, difficulty, user_id, created_at) VALUES (?, ?, ?, ?)`,
    [`harness-${difficulty}-${Math.random()}`, difficulty, userId, createdAt],
  );
  return result.insertId;
}

async function setLogStatus(habitId, date, status, tx) {
  await tx.query(
    `INSERT INTO habit_logs (habit_id, log_date, status, created_at)
     VALUES (?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE status = VALUES(status)`,
    [habitId, date, status],
  );
}

async function logsFor(habitId, tx) {
  const rows = await habitLogModel.getLogsForHabit(habitId, tx);
  return rows.map((r) => ({ date: r.log_date, status: r.status }));
}

// ---------- Scenario 1: shield earned, then revoked when an earlier day breaks the streak ----------

async function scenarioShieldEarnAndRevoke() {
  console.log("\n=== Scenario 1: shield earn + revoke (single habit) ===");
  const userId = await resetAndCreateUser();
  const startDate = "2026-01-01";
  const habitId = await createHabit(userId, "hard", `${startDate} 00:00:00`);
  const habit = { id: habitId, difficulty: "hard" };

  await runInTransaction(async (tx) => {
    for (let i = 0; i < 30; i++) {
      const date = addUtcDays(startDate, i);
      await setLogStatus(habitId, date, "completed", tx);
      await completionRewardService.awardCompletionRewards(
        userId,
        habit,
        date,
        tx,
        TZ,
      );
      const logs = await logsFor(habitId, tx);
      const { currentStreak, currentStreakStartDate } = calculateHabitStreaks(
        logs,
        date,
      );
      await guardianShieldService.earnShieldIfEligible(
        userId,
        habitId,
        "hard",
        currentStreak,
        currentStreakStartDate,
        date,
        tx,
      );
    }
  });

  check(
    "shield earned after a 30-day hard streak",
    await guardianShieldLogModel.countAvailable(userId),
    1,
  );

  const breakDate = addUtcDays(startDate, 14); // day 15 flips to missed
  await runInTransaction(async (tx) => {
    await setLogStatus(habitId, breakDate, "missed", tx);
    const logs = await logsFor(habitId, tx);
    await guardianShieldService.reconcileShieldsFromDate(
      userId,
      habitId,
      logs,
      breakDate,
      tx,
      TZ,
    );
  });

  check(
    "shield revoked once an earlier day flips to missed, dropping the streak below 30",
    await guardianShieldLogModel.countAvailable(userId),
    0,
  );
}

// ---------- Scenario 2: shield spent on a DIFFERENT habit, then reverted cross-habit ----------

async function scenarioCrossHabitShieldRevert() {
  console.log("\n=== Scenario 2: cross-habit shield spend + revert ===");
  const userId = await resetAndCreateUser();
  const startDate = "2026-01-01";
  const habitAId = await createHabit(userId, "hard", `${startDate} 00:00:00`);
  const habitBId = await createHabit(userId, "easy", `${startDate} 00:00:00`);
  const habitA = { id: habitAId, difficulty: "hard" };
  const habitB = { id: habitBId, difficulty: "easy" };

  await runInTransaction(async (tx) => {
    for (let i = 0; i < 30; i++) {
      const date = addUtcDays(startDate, i);
      for (const habit of [habitA, habitB]) {
        await setLogStatus(habit.id, date, "completed", tx);
        await completionRewardService.awardCompletionRewards(
          userId,
          habit,
          date,
          tx,
          TZ,
        );
      }
      const logsA = await logsFor(habitAId, tx);
      const { currentStreak, currentStreakStartDate } = calculateHabitStreaks(
        logsA,
        date,
      );
      await guardianShieldService.earnShieldIfEligible(
        userId,
        habitAId,
        "hard",
        currentStreak,
        currentStreakStartDate,
        date,
        tx,
      );
    }
  });

  check(
    "shield earned by habit A (hard, 30-day)",
    await guardianShieldLogModel.countAvailable(userId),
    1,
  );

  const missedDate = addUtcDays(startDate, 30);
  let pendingLogId;
  await runInTransaction(async (tx) => {
    await habitLogModel.insertPendingReviewLog(habitBId, missedDate, null, tx);
    const pending = await habitLogModel.findPendingByHabitAndDate(
      habitBId,
      missedDate,
      userId,
      tx,
    );
    pendingLogId = pending.id;
    const shielded = await guardianShieldService.spendShield(
      userId,
      pendingLogId,
      tx,
    );
    check(
      "habit A's shield successfully spent to protect habit B's missed day",
      shielded,
      true,
    );
    await habitLogModel.resolveDecision(pendingLogId, "shielded", tx);
  });

  check(
    "shield balance decremented after spend",
    await guardianShieldLogModel.countAvailable(userId),
    0,
  );

  const breakDate = addUtcDays(startDate, 14);
  await runInTransaction(async (tx) => {
    await setLogStatus(habitAId, breakDate, "missed", tx);
    const logsA = await logsFor(habitAId, tx);
    await guardianShieldService.reconcileShieldsFromDate(
      userId,
      habitAId,
      logsA,
      breakDate,
      tx,
      TZ,
    );
  });

  const habitBLogs = await habitLogModel.getLogsForHabit(habitBId);
  const missedDateLog = habitBLogs.find((r) => r.log_date === missedDate);
  check(
    "habit B's shielded day reverts to missed once habit A's earning streak breaks (cross-habit cascade)",
    missedDateLog.status,
    "missed",
  );
}

// ---------- Scenario 3: 7-day consistency bonus earned, then clawed back ----------

async function scenarioBonusEarnAndClawback() {
  console.log("\n=== Scenario 3: consistency bonus earn + clawback ===");
  const userId = await resetAndCreateUser();
  const startDate = "2026-01-01";
  const habitId = await createHabit(userId, "easy", `${startDate} 00:00:00`);
  const habit = { id: habitId, difficulty: "easy" };

  await runInTransaction(async (tx) => {
    for (let i = 0; i < 7; i++) {
      const date = addUtcDays(startDate, i);
      await setLogStatus(habitId, date, "completed", tx);
      await completionRewardService.awardCompletionRewards(
        userId,
        habit,
        date,
        tx,
        TZ,
      );
    }
  });

  let bonusRows = await xpBonusLogModel.findAwardsFromDate(userId, startDate);
  check(
    "7-day consistency bonus awarded after 7 full-completion days",
    bonusRows.length,
    1,
  );

  let progress = await userProgressModel.getProgress(userId);
  check(
    "total XP = 7 completions (70) + 7-day bonus (150)",
    progress.total_xp,
    7 * 10 + 150,
  );

  // Simulate a retroactive correction of day 3 (mirrors what habitService.undoLog does for XP,
  // then applies the resulting 'missed' state the way a resolved review decision would)
  const breakDate = addUtcDays(startDate, 2);
  await runInTransaction(async (tx) => {
    await xpService.reverseCompletionXp(userId, habitId, breakDate, tx);
    await setLogStatus(habitId, breakDate, "missed", tx);
    await dailyAuraStatsService.recalculateDailyAuraStats(
      userId,
      breakDate,
      tx,
      TZ,
    );
    await bonusService.reconcileBonusesFromDate(userId, breakDate, tx);
    await levelService.recalculateAndPersistLevel(userId, tx, TZ);
  });

  bonusRows = await xpBonusLogModel.findAwardsFromDate(userId, startDate);
  check(
    "bonus clawed back once day 3 no longer counts as a full-completion day",
    bonusRows.length,
    0,
  );

  progress = await userProgressModel.getProgress(userId);
  check(
    "XP settles back to just the 6 remaining completions (60), no bonus",
    progress.total_xp,
    60,
  );
}

// ---------- Scenario 4: pending-review session expiry keeps earned shields intact ----------
//
// The expired missed days sit AFTER the award date, so they cannot
// retroactively change the streak as of the award date - and per
// docs/04-guardian-shield.md a shield is only revoked when "the streak
// that earned a shield no longer holds". reconcileShieldsFromDate()
// therefore never revisits this award (findAwardsFromDate is anchored at
// the earliest changed date), and it stays available in the wallet.

async function scenarioSessionExpiryRevokesShield() {
  console.log("\n=== Scenario 4: pending-review expiry -> shield stays earned ===");
  const userId = await resetAndCreateUser();
  const startDate = "2026-01-01";
  const habitId = await createHabit(userId, "hard", `${startDate} 00:00:00`);
  const habit = { id: habitId, difficulty: "hard" };

  await runInTransaction(async (tx) => {
    for (let i = 0; i < 30; i++) {
      const date = addUtcDays(startDate, i);
      await setLogStatus(habitId, date, "completed", tx);
      await completionRewardService.awardCompletionRewards(
        userId,
        habit,
        date,
        tx,
        TZ,
      );
      const logs = await logsFor(habitId, tx);
      const { currentStreak, currentStreakStartDate } = calculateHabitStreaks(
        logs,
        date,
      );
      await guardianShieldService.earnShieldIfEligible(
        userId,
        habitId,
        "hard",
        currentStreak,
        currentStreakStartDate,
        date,
        tx,
      );
    }
  });

  check(
    "shield earned after initial 30-day streak",
    await guardianShieldLogModel.countAvailable(userId),
    1,
  );

  const missedDay1 = addUtcDays(startDate, 30);
  const missedDay2 = addUtcDays(startDate, 31);

  // both missed days have streak > 0 behind them, so they go to pending_review under
  // one extending session (mirrors reviewSyncService.finalizeDay's streak>0 branch)
  await runInTransaction(async (tx) => {
    await pendingReviewSessionService.addMissedDay(
      userId,
      habitId,
      missedDay1,
      tx,
      TZ,
    );
    await pendingReviewSessionService.addMissedDay(
      userId,
      habitId,
      missedDay2,
      tx,
      TZ,
    );
  });

  check(
    "both missed days recorded as pending_review under one session",
    (await habitLogModel.findAllPendingByHabit(habitId)).length,
    2,
  );

  await runInTransaction(async (tx) => {
    const session = await pendingReviewSessionModel.findActiveByHabit(
      habitId,
      tx,
    );
    const simulatedNow = parseToUTCDay(missedDay2) + GRACE_PERIOD_MS + 1;
    check(
      "grace-period math confirms this session would be expired at this point",
      isSessionExpired(session.last_missed_date, simulatedNow),
      true,
    );

    const expiredLogs = await habitLogModel.expirePendingLogsForSession(
      session.id,
      tx,
    );
    await pendingReviewSessionModel.resolve(session.id, tx);

    const earliestExpiredDate = expiredLogs.map((l) => l.logDate).sort()[0];
    const logs = await logsFor(habitId, tx);
    await guardianShieldService.reconcileShieldsFromDate(
      userId,
      habitId,
      logs,
      earliestExpiredDate,
      tx,
      TZ,
    );
  });

  check(
    "expired pending_review days convert to missed, none remain pending",
    (await habitLogModel.findAllPendingByHabit(habitId)).length,
    0,
  );

  check(
    "shield stays available: the expired days postdate the award, so the streak that earned it still holds",
    await guardianShieldLogModel.countAvailable(userId),
    1,
  );
}

async function main() {
  try {
    await scenarioShieldEarnAndRevoke();
    await scenarioCrossHabitShieldRevert();
    await scenarioBonusEarnAndClawback();
    await scenarioSessionExpiryRevokesShield();
  } catch (err) {
    fail++;
    console.error("SCRIPT ERROR:", err);
  } finally {
    await pool.query(
      `DELETE FROM habits WHERE user_id = (SELECT id FROM users WHERE email = ?)`,
      [TEST_EMAIL],
    );
    await pool.query(`DELETE FROM users WHERE email = ?`, [TEST_EMAIL]);
    console.log("\n---");
    console.log(pass + " passed, " + fail + " failed");
    await pool.end();
    process.exit(fail > 0 ? 1 : 0);
  }
}

main();
