const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const { DEFAULT_TIMEZONE } = require("../utils/timezone");

async function auth(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "missing or invalid authorization header" });
  }

  const token = authHeader.slice(7);

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });
  } catch {
    return res.status(401).json({ error: "invalid or expired token" });
  }

  try {
    const profile = await userModel.getAuthProfile(decoded.sub);
    if (!profile) {
      return res.status(401).json({ error: "invalid or expired token" });
    }
    req.user = {
      id: decoded.sub,
      timezone: profile.timezone || DEFAULT_TIMEZONE,
      gender: profile.gender,
    };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = auth;
