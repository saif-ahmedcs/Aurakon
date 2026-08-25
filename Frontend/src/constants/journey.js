/* ---------------------------------------------------------------- */
/* The nine rank titles of the progression journey                    */
/*                                                                    */
/* Structural fallback only. At runtime the ladder is rebuilt from    */
/* GET /api/progress (titles[]), which carries each tier's real XP    */
/* threshold straight from the backend (utils/titleThresholds.js).    */
/* These metas mirror those thresholds for pre-load rendering.        */
/* ---------------------------------------------------------------- */

export const JOURNEY_STAGES = [
  { id: 1, title: "New Soul", meta: "The journey begins" },
  { id: 2, title: "Disciplined Mind", meta: "500+ XP" },
  { id: 3, title: "Elite Disciple", meta: "1,500+ XP" },
  { id: 4, title: "Rising Warrior", meta: "3,500+ XP" },
  { id: 5, title: "Iron Will", meta: "7,500+ XP" },
  { id: 6, title: "Aura Master", meta: "15,000+ XP" },
  { id: 7, title: "Commander", meta: "30,000+ XP" },
  { id: 8, title: "Mythic Champion", meta: "55,000+ XP" },
  { id: 9, title: "Legendary Soul", meta: "90,000+ XP" },
];
