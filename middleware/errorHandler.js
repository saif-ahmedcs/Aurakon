const { AppError } = require("../utils/AppErrors");

function errorHandler(err, req, res, next) {
  console.error(err);
  const isOperational = err instanceof AppError;
  const status = isOperational ? err.status : 500;
  const message = isOperational ? err.message : "internal server error";
  res.status(status).json({ error: message });
}

module.exports = errorHandler;
