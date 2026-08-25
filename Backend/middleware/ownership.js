const asyncHandler = require("../utils/asyncHandler");
const habitModel = require("../models/habitModel");
const { BadRequestError } = require("../utils/AppErrors");

async function ownershipCheck(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    const err = new BadRequestError("id: must be a positive integer");
    err.fields = [{ path: "id", message: "must be a positive integer" }];
    throw err;
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
