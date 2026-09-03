const path = require("path");
const fs = require("fs");
const backendEnvPath = path.resolve(__dirname, "../.env");
require("dotenv").config({
  path: fs.existsSync(backendEnvPath)
    ? backendEnvPath
    : path.resolve(__dirname, "../../.env"),
});

const bcrypt = require("bcrypt");
const { pool, runInTransaction } = require("../db");
const levelService = require("../services/levelService");
const streakService = require("../services/streakService");
const habitModel = require("../models/habitModel");
const { difficultyToXp } = require("../utils/xpCalculator");
const {
  TITLE_THRESHOLDS,
  resolveTitleTier,
} = require("../utils/titleThresholds");
const { calculateHabitStreaks } = require("../utils/streak");
const { addUtcDays } = require("../utils/reviewWindow");
const { todayInTimezone } = require("../utils/timezone");
const { BCRYPT_SALT_ROUNDS } = require("../utils/constants");
const {
  SHIELD_MILESTONE_INTERVALS,
  isShieldMilestone,
  isShieldEligibleDifficulty,
} = require("../utils/guardianShieldRules");
const { checkBonusEligibility } = require("../utils/consistencyBonusRules");

const DEMO_EMAIL = "demo@aurakon.app";
const DEMO_PASSWORD = "AurakonDemo2026!";
const DEMO_TIMEZONE = "UTC";

// ── History length ─────────────────────────────────────────────────────
const FULL_HISTORY_DAYS = 650;
const CURRENT_GLOBAL_STREAK_BEFORE_TODAY = 29;

const HABITS = [
  { key: "ready", title: "Complete the Final Trial", difficulty: "medium" },
  { key: "review", title: "Plan tomorrow's focus", difficulty: "easy" },
  { key: "deepWork", title: "Deep work sprint", difficulty: "hard" },
  { key: "movement", title: "Morning movement", difficulty: "easy" },
  { key: "strength", title: "Strength session", difficulty: "hard" },
];

const BONUS_XP = { "7day": 150, "30day": 750 };
const HABIT_COUNT = HABITS.length;

// ── Cached bcrypt hash ─────────────────────────────────────────────────
let cachedPasswordHash = null;
async function getDemoPasswordHash() {
  if (!cachedPasswordHash) {
    cachedPasswordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_SALT_ROUNDS);
  }
  return cachedPasswordHash;
}

// ── Helpers ────────────────────────────────────────────────────────────
function fail(message) {
  throw new Error(`Demo reset failed: ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function timestampForDate(date) {
  return `${date} 12:00:00`;
}

function addStatus(logsByDate, date, habitKey, status, reviewSessionId = null) {
  let day = logsByDate.get(date);
  if (!day) {
    day = new Map();
    logsByDate.set(date, day);
  }
  day.set(habitKey, { status, reviewSessionId });
}

function addFullDay(logsByDate, date, overrides = {}) {
  for (const habit of HABITS) {
    const override = overrides[habit.key];
    addStatus(
      logsByDate,
      date,
      habit.key,
      override?.status || "completed",
      override?.reviewSessionId || null,
    );
  }
}

function findExactCompletionPlan(amount, maxByDifficulty = null) {
  const difficulties = [
    ...new Set(HABITS.map((habit) => habit.difficulty)),
  ].sort((a, b) => difficultyToXp(b) - difficultyToXp(a));
  const xpByDifficulty = new Map(
    difficulties.map((difficulty) => [difficulty, difficultyToXp(difficulty)]),
  );
  const dp = Array(amount + 1).fill(null);
  dp[0] = { plan: [], counts: new Map(difficulties.map((d) => [d, 0])) };

  for (let xp = 1; xp <= amount; xp += 1) {
    for (const difficulty of difficulties) {
      const value = xpByDifficulty.get(difficulty);
      if (xp >= value && dp[xp - value] !== null) {
        const prev = dp[xp - value];
        const currentCount = prev.counts.get(difficulty) || 0;
        const maxAllowed = maxByDifficulty
          ? maxByDifficulty.get(difficulty) || 0
          : Infinity;
        if (currentCount < maxAllowed) {
          const nextCounts = new Map(prev.counts);
          nextCounts.set(difficulty, currentCount + 1);
          dp[xp] = {
            plan: [...prev.plan, difficulty],
            counts: nextCounts,
          };
          break;
        }
      }
    }
  }

  return dp[amount] ? dp[amount].plan : null;
}

// ── DB operations ──────────────────────────────────────────────────────

async function deleteExistingDemoUser(tx, email = DEMO_EMAIL) {
  const [users] = await tx.query(
    "SELECT id FROM users WHERE email = ? FOR UPDATE",
    [email],
  );
  const user = users[0];
  if (!user) return;

  const userId = user.id;
  await tx.query(
    "DELETE FROM account_deletion_confirmations WHERE user_id = ?",
    [userId],
  );
  await habitModel.deleteAllByUser(userId, tx);
  await tx.query("DELETE FROM users WHERE id = ?", [userId]);
}

async function createDemoUser(
  tx,
  email = DEMO_EMAIL,
  password = DEMO_PASSWORD,
) {
  const passwordHash =
    password === DEMO_PASSWORD
      ? await getDemoPasswordHash()
      : await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const [result] = await tx.query(
    `INSERT INTO users
       (email, password_hash, username, gender, timezone, timezone_source,
        is_verified, created_at)
     VALUES (?, ?, 'AurakonDemo', 'male', ?, 'manual', true, UTC_TIMESTAMP())`,
    [email, passwordHash, DEMO_TIMEZONE],
  );
  return result.insertId;
}

async function createHabits(tx, userId, createdAt) {
  const habitsByKey = new Map();
  for (const habit of HABITS) {
    const [result] = await tx.query(
      `INSERT INTO habits (title, difficulty, user_id, created_at)
       VALUES (?, ?, ?, ?)`,
      [habit.title, habit.difficulty, userId, timestampForDate(createdAt)],
    );
    habitsByKey.set(habit.key, { ...habit, id: result.insertId });
  }
  return habitsByKey;
}

async function createReviewSession(
  tx,
  habitId,
  missedDate,
  status,
  openedAt = null,
) {
  const [result] = await tx.query(
    `INSERT INTO pending_review_sessions
       (habit_id, status, opened_at, last_missed_date, active_habit_id)
     VALUES (?, ?, ?, ?, ?)`,
    [
      habitId,
      status,
      timestampForDate(openedAt || missedDate),
      missedDate,
      status === "active" ? habitId : null,
    ],
  );
  return result.insertId;
}

async function persistLogs(tx, logsByDate, habitsByKey, userId) {
  const rows = [];
  for (const [date, day] of logsByDate) {
    for (const [habitKey, log] of day) {
      rows.push({ habit: habitsByKey.get(habitKey), date, log });
    }
  }
  if (rows.length === 0) return;

  await tx.query(
    `INSERT INTO habit_logs
       (habit_id, log_date, status, review_session_id, created_at)
     VALUES ?`,
    [
      rows.map(({ habit, date, log }) => [
        habit.id,
        date,
        log.status,
        log.reviewSessionId,
        timestampForDate(date),
      ]),
    ],
  );

  const habitIds = [...habitsByKey.values()].map((h) => h.id);
  const [insertedRows] = await tx.query(
    `SELECT id, habit_id, log_date FROM habit_logs WHERE habit_id IN (?)`,
    [habitIds],
  );
  const idByHabitAndDate = new Map(
    insertedRows.map((row) => [`${row.habit_id}|${row.log_date}`, row.id]),
  );
  for (const { habit, date, log } of rows) {
    log.id = idByHabitAndDate.get(`${habit.id}|${date}`);
  }

  const xpRows = rows.filter(
    ({ log }) => log.status === "completed" || log.status === "recovered",
  );
  if (xpRows.length > 0) {
    await tx.query(
      `INSERT INTO xp_completion_log (user_id, habit_id, log_date, xp_amount) VALUES ?`,
      [
        xpRows.map(({ habit, date }) => [
          userId,
          habit.id,
          date,
          difficultyToXp(habit.difficulty),
        ]),
      ],
    );
    const totalXpDelta = xpRows.reduce(
      (sum, { habit }) => sum + difficultyToXp(habit.difficulty),
      0,
    );
    await tx.query(
      "UPDATE users SET total_xp = GREATEST(total_xp + ?, 0) WHERE id = ?",
      [totalXpDelta, userId],
    );
  }
}

// ── Bulk daily_aura_stats ──────────────────────────────────────────────

const PRESENT_STATUSES = new Set(["completed", "recovered", "shielded"]);

function computeAuraStatsForDate(dayLogs) {
  const totalHabits = HABIT_COUNT;
  let completedHabits = 0;
  for (const log of dayLogs.values()) {
    if (PRESENT_STATUSES.has(log.status)) completedHabits++;
  }
  const fullCompletion = totalHabits > 0 && completedHabits === totalHabits;
  const auraEnergy =
    totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;
  return { totalHabits, completedHabits, fullCompletion, auraEnergy };
}

async function bulkInsertDailyAuraStats(tx, userId, logsByDate) {
  const statsRows = [];
  for (const [date, dayLogs] of logsByDate) {
    const { totalHabits, completedHabits, fullCompletion, auraEnergy } =
      computeAuraStatsForDate(dayLogs);
    statsRows.push([
      userId,
      date,
      auraEnergy,
      totalHabits,
      completedHabits,
      fullCompletion,
    ]);
  }
  if (statsRows.length === 0) return;
  await tx.query(
    `INSERT INTO daily_aura_stats
       (user_id, stat_date, aura_energy, total_habits, completed_habits, full_completion)
     VALUES ?
     ON DUPLICATE KEY UPDATE
       aura_energy = VALUES(aura_energy),
       total_habits = VALUES(total_habits),
       completed_habits = VALUES(completed_habits),
       full_completion = VALUES(full_completion)`,
    [statsRows],
  );
}

// ── Bulk consistency bonuses ───────────────────────────────────────────

function computeConsistencyBonuses(fullCompletionDates) {
  const sorted = [...fullCompletionDates].sort();
  const bonuses = []; // { bonusType, date }
  let streakLength = 0;
  let prevDate = null;

  for (const date of sorted) {
    if (prevDate && addUtcDays(prevDate, 1) === date) {
      streakLength++;
    } else {
      streakLength = 1;
    }
    prevDate = date;

    const eligibility = checkBonusEligibility(streakLength);
    for (const [bonusType, eligible] of Object.entries(eligibility)) {
      if (eligible) {
        bonuses.push({ bonusType, date });
      }
    }
  }
  return bonuses;
}

async function bulkInsertConsistencyBonuses(tx, userId, bonuses) {
  if (bonuses.length === 0) return 0;
  await tx.query(
    `INSERT INTO xp_bonus_log (user_id, bonus_type, awarded_at, required_habit_count)
     VALUES ?`,
    [bonuses.map((b) => [userId, b.bonusType, b.date, HABIT_COUNT])],
  );
  let totalBonusXp = 0;
  for (const b of bonuses) {
    totalBonusXp += BONUS_XP[b.bonusType];
  }
  await tx.query(
    "UPDATE users SET total_xp = GREATEST(total_xp + ?, 0) WHERE id = ?",
    [totalBonusXp, userId],
  );
  return totalBonusXp;
}

// ── Bulk guardian shields ──────────────────────────────────────────────
function computeShieldAwards(habitLogs, habitId, difficulty, asOfDate) {
  if (!isShieldEligibleDifficulty(difficulty)) return [];

  const sorted = habitLogs
    .filter((l) => PRESENT_STATUSES.has(l.status) && l.date <= asOfDate)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  const awards = [];
  let streakLength = 0;
  let streakStartDate = null;
  let prevDate = null;

  for (const log of sorted) {
    if (prevDate && addUtcDays(prevDate, 1) === log.date) {
      streakLength++;
    } else {
      streakLength = 1;
      streakStartDate = log.date;
    }
    prevDate = log.date;

    if (isShieldMilestone(streakLength, difficulty)) {
      awards.push({
        habitId,
        milestone: streakLength,
        streakStartDate,
        awardedAt: log.date,
      });
    }
  }
  return awards;
}

async function bulkInsertShieldAwards(tx, userId, awards) {
  if (awards.length === 0) return;
  await tx.query(
    `INSERT INTO guardian_shield_log
       (user_id, habit_id, milestone, streak_start_date, awarded_at)
     VALUES ?`,
    [
      awards.map((a) => [
        userId,
        a.habitId,
        a.milestone,
        a.streakStartDate,
        a.awardedAt,
      ]),
    ],
  );
}

// ── Global streak ──────────────────────────────────────────────────────
function computeGlobalStreak(fullCompletionDates) {
  const sorted = [...fullCompletionDates].sort();
  if (sorted.length === 0) return { streak: 0, lastFullCompletionDate: null };

  let runLength = 1;
  for (let i = 1; i < sorted.length; i++) {
    if (addUtcDays(sorted[i - 1], 1) === sorted[i]) {
      runLength++;
    } else {
      runLength = 1;
    }
  }
  return {
    streak: runLength,
    lastFullCompletionDate: sorted[sorted.length - 1],
  };
}

// ── Main seed ──────────────────────────────────────────────────────────

async function seed(options = {}) {
  const email = options.email || DEMO_EMAIL;
  const password = options.password || DEMO_PASSWORD;
  const today = todayInTimezone(DEMO_TIMEZONE);
  const yesterday = addUtcDays(today, -1);
  const currentRunStart = addUtcDays(
    today,
    -CURRENT_GLOBAL_STREAK_BEFORE_TODAY,
  );
  const historicalEnd = addUtcDays(today, -141);
  const historicalStart = addUtcDays(historicalEnd, -(FULL_HISTORY_DAYS - 1));

  return runInTransaction(async (tx) => {
    await deleteExistingDemoUser(tx, email);
    const userId = await createDemoUser(tx, email, password);
    const habitsByKey = await createHabits(tx, userId, historicalStart);

    const logsByDate = new Map();
    const recoveredDate = addUtcDays(historicalStart, 90);
    const shieldedDate = addUtcDays(historicalStart, 45);
    const recoveredSessionId = await createReviewSession(
      tx,
      habitsByKey.get("movement").id,
      recoveredDate,
      "resolved",
    );
    for (
      let day = historicalStart;
      day <= historicalEnd;
      day = addUtcDays(day, 1)
    ) {
      addFullDay(logsByDate, day);
    }
    addStatus(
      logsByDate,
      recoveredDate,
      "movement",
      "recovered",
      recoveredSessionId,
    );
    addStatus(logsByDate, shieldedDate, "strength", "shielded");

    const dayBeforeYesterday = addUtcDays(today, -2);
    const activeReviewSessionId = await createReviewSession(
      tx,
      habitsByKey.get("review").id,
      yesterday,
      "active",
      dayBeforeYesterday,
    );
    const secondActiveReviewSessionId = await createReviewSession(
      tx,
      habitsByKey.get("deepWork").id,
      yesterday,
      "active",
      yesterday,
    );

    for (
      let day = currentRunStart;
      day <= yesterday;
      day = addUtcDays(day, 1)
    ) {
      addFullDay(logsByDate, day);
    }
    addStatus(
      logsByDate,
      dayBeforeYesterday,
      "review",
      "pending_review",
      activeReviewSessionId,
    );
    addStatus(
      logsByDate,
      yesterday,
      "review",
      "pending_review",
      activeReviewSessionId,
    );
    addStatus(
      logsByDate,
      yesterday,
      "deepWork",
      "pending_review",
      secondActiveReviewSessionId,
    );

    for (const habit of HABITS.filter((habit) => habit.key !== "ready")) {
      addStatus(logsByDate, today, habit.key, "completed");
    }

    await persistLogs(tx, logsByDate, habitsByKey, userId);

    // ── Pre-compute bonuses from base history ──────────────────────────
    const baseFullCompletionDates = [];
    for (const [date, dayLogs] of logsByDate) {
      const stats = computeAuraStatsForDate(dayLogs);
      if (stats.fullCompletion) baseFullCompletionDates.push(date);
    }
    const baseBonuses = computeConsistencyBonuses(baseFullCompletionDates);
    let baseBonusXp = 0;
    for (const b of baseBonuses) {
      baseBonusXp += BONUS_XP[b.bonusType];
    }

    // ── XP padding to reach showcase target ────────────────────────────
    const highestRankXp = Math.max(
      ...TITLE_THRESHOLDS.map((tier) => tier.minXp),
    );
    const readyHabit = habitsByKey.get("ready");
    const targetBeforeCheckIn =
      highestRankXp - difficultyToXp(readyHabit.difficulty);
    const [beforePaddingRows] = await tx.query(
      "SELECT total_xp FROM users WHERE id = ? FOR UPDATE",
      [userId],
    );
    // Subtract bonus XP that will be added later from the padding budget.
    const completionXpSoFar = Number(beforePaddingRows[0].total_xp);
    const paddingNeeded = targetBeforeCheckIn - completionXpSoFar - baseBonusXp;
    assert(
      paddingNeeded >= 0,
      "base history exceeded the top-rank showcase target",
    );

    const paddingDays = [];
    for (
      let day = addUtcDays(historicalEnd, 1);
      day < currentRunStart;
      day = addUtcDays(day, 1)
    ) {
      paddingDays.push(day);
    }
    const maxByDifficulty = new Map(
      [...new Set(HABITS.map((habit) => habit.difficulty))].map((diff) => [
        diff,
        paddingDays.length,
      ]),
    );
    const paddingPlan = findExactCompletionPlan(paddingNeeded, maxByDifficulty);
    assert(
      paddingPlan !== null,
      "XP rules cannot exactly reach the showcase target",
    );
    assert(
      paddingPlan.length <= paddingDays.length,
      "more padding completions needed than available padding days",
    );

    const paddingLogs = new Map();
    for (const date of paddingDays) {
      for (const habit of HABITS)
        addStatus(paddingLogs, date, habit.key, "missed");
    }
    for (let i = 0; i < paddingPlan.length; i++) {
      const difficulty = paddingPlan[i];
      const date = paddingDays[i];
      const habitsForDiff = HABITS.filter((h) => h.difficulty === difficulty);
      const habit = habitsForDiff[i % habitsForDiff.length];
      addStatus(paddingLogs, date, habit.key, "completed");
    }
    await persistLogs(tx, paddingLogs, habitsByKey, userId);

    // ── Bulk daily_aura_stats for ALL dates ────────────────────────────
    const allLogs = new Map();
    for (const [date, day] of logsByDate) allLogs.set(date, day);
    for (const [date, day] of paddingLogs) {
      const existing = allLogs.get(date);
      if (existing) {
        for (const [k, v] of day) existing.set(k, v);
      } else {
        allLogs.set(date, day);
      }
    }
    await bulkInsertDailyAuraStats(tx, userId, allLogs);

    // ── Bulk consistency bonuses ───────────────────────────────────────
    const allFullCompletionDates = [];
    for (const [date, dayLogs] of allLogs) {
      const stats = computeAuraStatsForDate(dayLogs);
      if (stats.fullCompletion) allFullCompletionDates.push(date);
    }
    const bonuses = computeConsistencyBonuses(allFullCompletionDates);
    await bulkInsertConsistencyBonuses(tx, userId, bonuses);

    // ── Bulk guardian shields ──────────────────────────────────────────
    const allShieldAwards = [];
    for (const habit of habitsByKey.values()) {
      if (!isShieldEligibleDifficulty(habit.difficulty)) continue;
      // Collect all logs for this habit across both maps.
      const habitLogs = [];
      for (const [date, day] of allLogs) {
        const log = day.get(habit.key);
        if (log) habitLogs.push({ date, status: log.status });
      }
      const awards = computeShieldAwards(
        habitLogs,
        habit.id,
        habit.difficulty,
        today,
      );
      allShieldAwards.push(...awards);
    }
    await bulkInsertShieldAwards(tx, userId, allShieldAwards);

    // Spend one shield for the historical shielded log.
    const shieldedLog = logsByDate.get(shieldedDate).get("strength");
    const [availableShields] = await tx.query(
      `SELECT id FROM guardian_shield_log
       WHERE user_id = ? AND status = 'available'
       ORDER BY awarded_at ASC, id ASC LIMIT 1 FOR UPDATE`,
      [userId],
    );
    assert(availableShields.length > 0, "no shield available to spend");
    await tx.query(
      `UPDATE guardian_shield_log
       SET status = 'spent', spent_habit_log_id = ?
       WHERE id = ? AND status = 'available'`,
      [shieldedLog.id, availableShields[0].id],
    );

    // ── Shield balance ─────────────────────────────────────────────────
    const [shieldCountRows] = await tx.query(
      `SELECT COUNT(*) AS count FROM guardian_shield_log
       WHERE user_id = ? AND status = 'available'`,
      [userId],
    );
    const shieldBalance = Number(shieldCountRows[0].count);
    await tx.query("UPDATE users SET shield_balance = ? WHERE id = ?", [
      shieldBalance,
      userId,
    ]);

    // ── Per-habit streaks ──────────────────────────────────────────────
    for (const habit of habitsByKey.values()) {
      const habitLogs = [];
      for (const [date, day] of allLogs) {
        const log = day.get(habit.key);
        if (log) habitLogs.push({ date, status: log.status });
      }
      const streak = calculateHabitStreaks(habitLogs, today);
      await habitModel.updateStreaks(
        habit.id,
        streak.currentStreak,
        streak.longestStreak,
        tx,
      );
    }

    // ── Global streak + last full completion ───────────────────────────
    const { streak: globalStreak, lastFullCompletionDate } =
      computeGlobalStreak(allFullCompletionDates);
    await tx.query("UPDATE users SET global_daily_streak = ? WHERE id = ?", [
      globalStreak,
      userId,
    ]);
    if (lastFullCompletionDate) {
      await tx.query(
        "UPDATE users SET last_full_completion_date = ? WHERE id = ?",
        [lastFullCompletionDate, userId],
      );
    }

    // ── Finalization checkpoint ────────────────────────────────────────
    await tx.query(
      `INSERT INTO user_finalization_checkpoint (user_id, last_finalized_date)
       VALUES (?, ?)`,
      [userId, yesterday],
    );

    // ── Level + XP rebuild ─────────────────────────────────────────────
    const level = await levelService.recalculateAndPersistLevel(
      userId,
      tx,
      DEMO_TIMEZONE,
    );

    // rebuildTotalXp re-sums completion + bonus XP from authoritative ledgers
    // (xp_completion_log + xp_bonus_log) and sets users.total_xp.
    const xpService = require("../services/xpService");
    const xpSnapshot = await xpService.rebuildTotalXp(userId, tx);
    assert(
      xpSnapshot.totalXp === targetBeforeCheckIn,
      `rebuilt XP (${xpSnapshot.totalXp}) does not match showcase target (${targetBeforeCheckIn})`,
    );

    // ── Verification ───────────────────────────────────────────────────
    const [verificationRows] = await tx.query(
      `SELECT u.total_xp, u.current_level, u.global_daily_streak, u.shield_balance, u.gender,
              s.aura_energy AS aura_today,
              (SELECT COUNT(*) FROM xp_bonus_log WHERE user_id = u.id AND bonus_type = '7day') AS seven_day_bonuses,
              (SELECT COUNT(*) FROM xp_bonus_log WHERE user_id = u.id AND bonus_type = '30day') AS thirty_day_bonuses,
              (SELECT COUNT(*) FROM guardian_shield_log WHERE user_id = u.id AND status = 'available') AS available_shields,
              (SELECT COUNT(*) FROM guardian_shield_log WHERE user_id = u.id AND status = 'spent') AS spent_shields,
              (SELECT COUNT(*) FROM pending_review_sessions prs
               INNER JOIN habits h ON h.id = prs.habit_id
               WHERE h.user_id = u.id AND prs.status = 'active') AS active_review_sessions,
              (SELECT COUNT(*) FROM habit_logs hl
               INNER JOIN habits h ON h.id = hl.habit_id
               WHERE h.user_id = u.id AND hl.status = 'pending_review') AS pending_review_logs
       FROM users u
       LEFT JOIN daily_aura_stats s ON s.user_id = u.id AND s.stat_date = ?
       WHERE u.id = ?`,
      [today, userId],
    );
    const verification = verificationRows[0];
    assert(
      Number(verification.total_xp) === targetBeforeCheckIn,
      "stored XP is inconsistent",
    );
    assert(verification.gender === "male", "demo profile gender is not male");
    assert(
      resolveTitleTier(targetBeforeCheckIn) !== resolveTitleTier(highestRankXp),
      "demo already has the highest rank",
    );
    assert(
      Number(verification.aura_today) === 80,
      "today's pre-check-in Aura must be 80%",
    );
    assert(
      Number(verification.seven_day_bonuses) > 0,
      "7-day bonus history was not created",
    );
    assert(
      Number(verification.thirty_day_bonuses) > 0,
      "30-day bonus history was not created",
    );
    assert(
      Number(verification.available_shields) > 0,
      "no Guardian Shield is available for review",
    );
    assert(
      Number(verification.spent_shields) > 0,
      "historical shielded scenario was not created",
    );
    assert(
      Number(verification.active_review_sessions) > 0,
      "active pending review session was not created",
    );
    assert(
      Number(verification.pending_review_logs) > 0,
      "pending review logs were not created",
    );

    return {
      userId,
      email,
      today,
      readyHabitId: readyHabit.id,
      xpBeforeCheckIn: targetBeforeCheckIn,
      xpFromCheckIn: difficultyToXp(readyHabit.difficulty),
      targetRankXp: highestRankXp,
      level,
      shieldBalance,
      globalDailyStreak: Number(verification.global_daily_streak),
      activeReviewSessions: Number(verification.active_review_sessions),
      pendingReviewLogs: Number(verification.pending_review_logs),
    };
  });
}

async function resetDemoAccount(email = DEMO_EMAIL) {
  return seed({ email });
}

async function provisionDemoAccount(options = {}) {
  return seed(options);
}

if (require.main === module) {
  resetDemoAccount()
    .then((result) => {
      console.log("Demo account reset successfully.");
      console.log(`Email: ${DEMO_EMAIL}`);
      console.log(`Ready habit id: ${result.readyHabitId}`);
      console.log(
        `XP: ${result.xpBeforeCheckIn} + ${result.xpFromCheckIn} = ${result.targetRankXp}`,
      );
      console.log(
        `Derived level: ${result.level}; available Guardian Shields: ${result.shieldBalance}; active review sessions: ${result.activeReviewSessions} (${result.pendingReviewLogs} pending reviews); global streak: ${result.globalDailyStreak}`,
      );
    })
    .catch((error) => {
      console.error(error.stack || error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}

module.exports = {
  resetDemoAccount,
  provisionDemoAccount,
  DEMO_EMAIL,
  DEMO_PASSWORD,
};
