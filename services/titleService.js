const { resolveTitleTier } = require("../utils/titleThresholds");

function resolveCurrentTitle(totalXp) {
  return resolveTitleTier(totalXp);
}

module.exports = { resolveCurrentTitle };
