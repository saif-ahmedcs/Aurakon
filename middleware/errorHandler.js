const { AppError } = require("../utils/AppErrors");

function errorHandler(err, req, res, next) {
  console.error(err);
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "request body too large" });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid JSON in request body" });
  }
  res.status(500).json({ error: "internal server error" });
}

module.exports = errorHandler;
