const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const habitsRouter = require("./routes/habits");
const reviewRouter = require("./routes/review");
const authRouter = require("./routes/auth");
const errorHandler = require("./middleware/errorHandler");

const app = express();
const PORT = 3000;

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

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/habits", habitsRouter);
app.use("/api/review", reviewRouter);
app.use("/api/auth", authRouter);

app.use((req, res) => {
  res.status(404).json({ error: "not found" });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
