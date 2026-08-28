process.env.TZ = "UTC";
require("./utils/validateEnv");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { globalIpLimiter } = require("./middleware/rateLimiters");
const habitsRouter = require("./routes/habits");
const reviewRouter = require("./routes/review");
const authRouter = require("./routes/auth");
const progressRouter = require("./routes/progress");
const profileRouter = require("./routes/profile");
const errorHandler = require("./middleware/errorHandler");
const { pool } = require("./db");
const { createCleanupRunner } = require("./services/cleanupRunner");

const app = express();
const PORT = 3000;

app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
      },
    },
  }),
);

app.use(globalIpLimiter);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/habits", habitsRouter);
app.use("/api/review", reviewRouter);
app.use("/api/auth", authRouter);
app.use("/api/progress", progressRouter);
app.use("/api/profile", profileRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use(errorHandler);

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
