const { cleanupUnverified } = require("../scripts/cleanupUnverified");
const { cleanupExpiredTokens } = require("../scripts/Cleanupexpiredtokens");
const {
  cleanupConsumedConfirmationTokens,
} = require("../scripts/cleanupConsumedConfirmationTokens");
const {
  cleanupExpiredDemoAccounts,
} = require("../scripts/cleanupExpiredDemoAccounts");

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const cleanupJobs = [
  {
    name: "consumed confirmation tokens",
    intervalMs: 5 * MINUTE_MS,
    run: cleanupConsumedConfirmationTokens,
  },
  {
    name: "expired tokens",
    intervalMs: HOUR_MS,
    run: cleanupExpiredTokens,
  },
  {
    name: "unverified accounts",
    intervalMs: 24 * HOUR_MS,
    run: cleanupUnverified,
  },
  {
    name: "expired demo accounts",
    intervalMs: HOUR_MS,
    run: cleanupExpiredDemoAccounts,
  },
];

function createCleanupRunner({ jobs = cleanupJobs, logger = console } = {}) {
  const lastCompletedAt = new Map();
  let timer = null;
  let activeRun = null;
  let started = false;
  let stopPromise = null;

  async function runJob(job) {
    const startedAt = Date.now();

    try {
      await job.run();
      logger.info(
        `[cleanup] ${job.name} completed in ${Date.now() - startedAt}ms.`,
      );
    } catch (error) {
      logger.error(`[cleanup] ${job.name} failed:`, error);
    } finally {
      lastCompletedAt.set(job.name, Date.now());
    }
  }

  async function runDueJobs() {
    for (const job of jobs) {
      const lastCompleted = lastCompletedAt.get(job.name);
      if (
        lastCompleted !== undefined &&
        Date.now() - lastCompleted < job.intervalMs
      ) {
        continue;
      }

      await runJob(job);
    }
  }

  function nextDelay() {
    return Math.max(
      0,
      Math.min(
        ...jobs.map((job) => {
          const lastCompleted = lastCompletedAt.get(job.name);
          return lastCompleted === undefined
            ? 0
            : job.intervalMs - (Date.now() - lastCompleted);
        }),
      ),
    );
  }

  function schedule(delayMs) {
    if (!started) return;

    timer = setTimeout(async () => {
      timer = null;
      activeRun = runDueJobs();
      try {
        await activeRun;
      } finally {
        activeRun = null;
        schedule(nextDelay());
      }
    }, delayMs);

    timer.unref?.();
  }

  function start() {
    if (started) {
      logger.warn("[cleanup] Runner is already started.");
      return false;
    }

    started = true;
    logger.info("[cleanup] Runner started.");
    schedule(0);
    return true;
  }

  function stop() {
    if (stopPromise) return stopPromise;

    started = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }

    stopPromise = (activeRun || Promise.resolve()).then(() => {
      logger.info("[cleanup] Runner stopped.");
    });

    return stopPromise;
  }

  return { start, stop };
}

module.exports = { cleanupJobs, createCleanupRunner };
