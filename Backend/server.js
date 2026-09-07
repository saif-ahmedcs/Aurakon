const app = require("./app");
const { pool } = require("./db");
const { createCleanupRunner } = require("./services/cleanupRunner");

const PORT = process.env.PORT || 3000;

const cleanupRunner = createCleanupRunner();

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  cleanupRunner.start();
});

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[shutdown] ${signal} received; stopping server.`);

  const cleanupStopped = cleanupRunner.stop();
  server.close(async (error) => {
    if (error) {
      console.error("[shutdown] Failed to close HTTP server:", error);
      process.exitCode = 1;
    }

    try {
      await cleanupStopped;
      await pool.end();
      console.log("[shutdown] Server stopped.");
    } catch (shutdownError) {
      console.error("[shutdown] Failed to close database pool:", shutdownError);
      process.exitCode = 1;
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
