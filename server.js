process.env.TZ = "UTC";
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
