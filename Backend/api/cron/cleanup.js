const { cleanupJobs } = require("../../services/cleanupRunner");

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers["authorization"] || req.headers["Authorization"];
  return header === `Bearer ${secret}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "method not allowed" });
    return;
  }

  if (!isAuthorized(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  const results = [];
  let hadFailure = false;

  for (const job of cleanupJobs) {
    const startedAt = Date.now();

    try {
      await job.run();
      results.push({
        name: job.name,
        status: "ok",
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      hadFailure = true;
      console.error(`[cron/cleanup] ${job.name} failed:`, error);
      results.push({
        name: job.name,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: error.message,
      });
    }
  }

  res.status(hadFailure ? 207 : 200).json({
    ranAt: new Date().toISOString(),
    jobs: results,
  });
};
