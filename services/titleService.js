const {
  TITLE_THRESHOLDS,
  resolveTitleTier,
} = require("../utils/titleThresholds");

function resolveCurrentTitle(totalXp) {
  return resolveTitleTier(totalXp);
}

function getTitleProgress(totalXp) {
  const numericXp = Number(totalXp);
  const safeXp = Number.isFinite(numericXp) ? numericXp : 0;
  const currentIndex = TITLE_THRESHOLDS.findIndex((t) => safeXp >= t.minXp);
  const normalizedIndex =
    currentIndex === -1 ? TITLE_THRESHOLDS.length - 1 : currentIndex;

  const titles = TITLE_THRESHOLDS.map((tier, index) => ({
    title: tier.title,
    minXp: tier.minXp,
    current: index === normalizedIndex,
  }));

  const nextTier =
    normalizedIndex > 0 ? TITLE_THRESHOLDS[normalizedIndex - 1] : null;

  return {
    titles,
    nextRank: nextTier
      ? { title: nextTier.title, xpNeeded: nextTier.minXp - safeXp }
      : null,
  };
}

module.exports = { resolveCurrentTitle, getTitleProgress };
