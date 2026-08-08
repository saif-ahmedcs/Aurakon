const { ForbiddenError, UnauthorizedError } = require("../utils/AppErrors");

function requireGender(req, res, next) {
  if (!req.user) {
    return next(
      new UnauthorizedError("missing or invalid authorization header"),
    );
  }

  if (!req.user.gender) {
    return next(
      new ForbiddenError("gender must be set before accessing this resource"),
    );
  }
  next();
}

module.exports = requireGender;
