const TITLE_THRESHOLDS = [
  { minXp: 90000, title: "Legendary Soul" },
  { minXp: 55000, title: "Mythic Champion" },
  { minXp: 30000, title: "Commander" },
  { minXp: 15000, title: "Aura Master" },
  { minXp: 7500, title: "Iron Will" },
  { minXp: 3500, title: "Rising Warrior" },
  { minXp: 1500, title: "Elite Disciple" },
  { minXp: 500, title: "Disciplined Mind" },
  { minXp: 0, title: "New Soul" },
];

function resolveTitleTier(totalXp) {
  const safeXp = Number.isFinite(totalXp) ? totalXp : 0;
  const tier = TITLE_THRESHOLDS.find((t) => safeXp >= t.minXp);
  return tier
    ? tier.title
    : TITLE_THRESHOLDS[TITLE_THRESHOLDS.length - 1].title;
}

module.exports = { TITLE_THRESHOLDS, resolveTitleTier };
