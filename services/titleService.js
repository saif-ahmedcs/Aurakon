const {
  TITLE_THRESHOLDS,
  resolveTitleTier,
} = require("../utils/titleThresholds");

function resolveCurrentTitle(totalXp) {
  return resolveTitleTier(totalXp);
}

function getTitleProgress(totalXp) {
  const safeXp = Number.isFinite(totalXp) ? totalXp : 0;
  const currentIndex = TITLE_THRESHOLDS.findIndex((t) => safeXp >= t.minXp);
  const currentTier =
    TITLE_THRESHOLDS[currentIndex] ??
    TITLE_THRESHOLDS[TITLE_THRESHOLDS.length - 1];

  const titles = TITLE_THRESHOLDS.map((tier, index) => ({
    title: tier.title,
    minXp: tier.minXp,
    current: index === currentIndex,
  }));

  const nextTier = currentIndex > 0 ? TITLE_THRESHOLDS[currentIndex - 1] : null;

  return {
    titles,
    nextRank: nextTier
      ? { title: nextTier.title, xpNeeded: nextTier.minXp - safeXp }
      : null,
  };
}

module.exports = { resolveCurrentTitle, getTitleProgress };
