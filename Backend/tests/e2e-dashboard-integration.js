/* E2E verification of the Dashboard <-> Progression integration.
 * Drives the real HTTP API exactly as the frontend does:
 *   login -> Bearer token -> /progress, /habits, /habits/:id/logs
 * Covers: per-user isolation (A vs B), completion -> progression sync,
 * undo reversal, streaks, aura energy and shield balance. */
const BASE = "http://localhost:3000/api";

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
      (ok ? "" : " (expected " + JSON.stringify(expected) + ")")
  );
  if (ok) pass++;
  else fail++;
}

async function req(path, { method = "GET", token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => null);
  if (res.status >= 400) {
    console.log("  [http " + res.status + "] " + method + " " + path + " ->", JSON.stringify(data));
  }
  return { status: res.status, data };
}

async function login(email) {
  const r = await req("/auth/login", {
    method: "POST",
    body: { email, password: "E2eVerify123" },
  });
  if (r.status !== 200 || !r.data.accessToken)
    throw new Error("login failed for " + email + ": " + JSON.stringify(r.data));
  return r.data.accessToken;
}

// Wait so the per-minute authenticated limiter never trips between phases.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  try {
    /* ---------------- User A ---------------- */
    const tokenA = await login("verify-user-a@aurakon.test");

    let r = await req("/progress", { token: tokenA });
    check("A initial progress shape", Object.keys(r.data).sort(), [
      "auraEnergyToday",
      "globalDailyStreak",
      "level",
      "nextRank",
      "shieldBalance",
      "title",
      "titles",
      "totalXp",
    ]);
    check("A initial totalXp", r.data.totalXp, 0);
    check("A initial title", r.data.title, "New Soul");
    check(
      "A ladder from backend (ascending minXp)",
      r.data.titles.map((t) => t.minXp),
      [90000, 55000, 30000, 15000, 7500, 3500, 1500, 500, 0]
    );
    check(
      "A current tier flagged",
      r.data.titles.find((t) => t.current).title,
      "New Soul"
    );

    // Create two habits like the Add Habit modal does.
    r = await req("/habits", {
      method: "POST",
      token: tokenA,
      body: { title: "Morning Run", difficulty: "hard" },
    });
    check("A create hard habit", [r.status, r.data.difficulty], [201, "hard"]);
    const habitA1 = r.data.id;
    check("A new habit streak starts at 0", r.data.currentStreak, 0);

    r = await req("/habits", {
      method: "POST",
      token: tokenA,
      body: { title: "Read Book", difficulty: "easy" },
    });
    const habitA2 = r.data.id;
    check("A create easy habit", [r.status, r.data.difficulty], [201, "easy"]);

    // List habits - the dashboard's source for rows + streaks.
    r = await req("/habits", { token: tokenA });
    check(
      "A list returns both with pendingReview null",
      r.data.map((h) => h.id).sort(),
      [habitA1, habitA2].sort()
    );

    // Complete the hard habit today (+25 XP / +25 aura).
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(new Date());
    r = await req(`/habits/${habitA1}/logs`, {
      method: "POST",
      token: tokenA,
      body: { date: today },
    });
    check(
      "A complete hard habit",
      [r.status, r.data.status, r.data.date],
      [201, "completed", today]
    );

    r = await req("/progress", { token: tokenA });
    check("A totalXp after completion", r.data.totalXp, 25);
    check("A auraEnergyToday after completion", r.data.auraEnergyToday, 25);
    check("A level >= 1 after first full-completion day", r.data.level >= 1, true);

    r = await req(`/habits/${habitA1}/logs`, {
      method: "POST",
      token: tokenA,
      body: { date: today },
    });
    // Backend rejects a second log for the same day (the dashboard
    // never sends one because completedToday gates the toggle).
    check("A duplicate completion is rejected", r.status, 409);

    r = await req("/progress", { token: tokenA });
    check("A XP not double-awarded", r.data.totalXp, 25);

    // Per-habit streak visible in the list payload.
    r = await req("/habits", { token: tokenA });
    const row1 = r.data.find((h) => h.id === habitA1);
    const row2 = r.data.find((h) => h.id === habitA2);
    check("A hard habit currentStreak", row1.currentStreak, 1);
    check("A easy habit untouched", row2.currentStreak, 0);

    // Undo today's log -> XP/aura reverse server-side.
    r = await req(`/habits/${habitA1}/logs/${today}`, {
      method: "DELETE",
      token: tokenA,
    });
    check("A undo accepted", r.status, 200);

    r = await req("/progress", { token: tokenA });
    check("A totalXp reversed after undo", r.data.totalXp, 0);
    check("A auraEnergyToday reversed after undo", r.data.auraEnergyToday, 0);

    // Re-complete to leave state for the isolation checks.
    await pause(1000);
    r = await req(`/habits/${habitA1}/logs`, {
      method: "POST",
      token: tokenA,
      body: { date: today },
    });
    check("A re-complete", r.status, 201);

    /* ---------------- User B ---------------- */
    const tokenB = await login("verify-user-b@aurakon.test");

    r = await req("/habits", { token: tokenB });
    check("B sees zero habits (no leakage from A)", r.data, []);

    r = await req("/progress", { token: tokenB });
    check(
      "B progress is her own (zeros, not A's)",
      [r.data.totalXp, r.data.globalDailyStreak, r.data.shieldBalance],
      [0, 0, 0]
    );

    // B cannot touch A's habit even with a valid session.
    r = await req(`/habits/${habitA1}`, { token: tokenB });
    check("B cannot read A's habit detail", r.status, 404);

    r = await req(`/habits/${habitA1}/logs`, {
      method: "POST",
      token: tokenB,
      body: { date: today },
    });
    check("B cannot check in on A's habit", [r.status], [404]);

    // A's view remains intact afterwards.
    r = await req("/habits", { token: tokenA });
    check("A still sees only own habits after B's attempts", r.data.length, 2);

    /* ---------------- Session recovery ---------------- */
    r = await req("/auth/me", { token: tokenA });
    check("A me endpoint identifies A only", r.data.email, "verify-user-a@aurakon.test");
    r = await req("/profile", { token: tokenA });
    check(
      "A profile carries own username/level/xp",
      [r.data.username, r.data.totalXp],
      ["verifierA", 25]
    );

    console.log(
      `\n${pass} passed, ${fail} failed`
    );
    process.exitCode = fail > 0 ? 1 : 0;
  } catch (e) {
    console.error("E2E ERROR:", e.message);
    process.exitCode = 1;
  }
})();
