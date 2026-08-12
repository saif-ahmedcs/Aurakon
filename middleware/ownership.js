const asyncHandler = require("../utils/asyncHandler");
const habitModel = require("../models/habitModel");

async function ownershipCheck(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "invalid id" });
  }
  const habit = await habitModel.findById(id, req.user.id);
  if (!habit) {
    return res.status(404).json({ error: "habit not found" });
  }
  req.habitId = id;
  req.habit = habit;
  next();
}

module.exports = asyncHandler(ownershipCheck);
