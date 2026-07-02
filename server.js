const express = require("express");
const cookieParser = require("cookie-parser");
const habitsRouter = require("./routes/habits");
const reviewRouter = require("./routes/review");
const authRouter = require("./routes/auth");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use("/api/habits", habitsRouter);
app.use("/api/review", reviewRouter);
app.use("/api/auth", authRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
