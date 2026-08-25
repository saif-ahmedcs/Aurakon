export const DIFFICULTY_LABEL = { easy: "Easy", medium: "Medium", hard: "Hard" };

/* XP awarded per completion mirrors the backend award table
 * (docs/03-progression-and-rewards.md): easy = 10, medium = 15,
 * hard = 25. */
export const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy", xp: 10 },
  { value: "medium", label: "Medium", xp: 15 },
  { value: "hard", label: "Hard", xp: 25 },
];

/* ---------------------------------------------------------------- */
/* Habit detail - calendar legend                                    */
/*                                                                    */
/* Left column explains what each colour on the calendar means so    */
/* the grid never has to be decoded from memory. Right column is the */
/* month itself: a filled ring is a resolved day, a dashed amber ring */
/* is a day still waiting on the user via the review session.        */
/* ---------------------------------------------------------------- */

export const LEGEND_ITEMS = [
  {
    cls: "legend-dot-done",
    label: "Checked in / Recovered",
    copy: "You completed the trial, or a missed day was reviewed and marked as recovered.",
  },
  {
    cls: "legend-dot-shielded",
    label: "Shielded",
    copy: "A streak shield covered this miss automatically - your streak stayed intact.",
  },
  {
    cls: "legend-dot-missed",
    label: "Missed",
    copy: "The trial window closed with no check-in and no shield was used.",
  },
  {
    cls: "legend-dot-pending",
    label: "Awaiting Review",
    copy: "Not yet resolved. Open the review session to say what actually happened.",
  },
];

export const DAY_STATUS_COPY = {
  done: {
    heading: "Successful Day",
    gemClass: "gem-text-success",
    body: "This trial was completed on time.",
  },
  shielded: {
    heading: "Shielded Day",
    gemClass: "gem-text-shielded",
    body: "A streak shield covered this miss automatically - your streak stayed intact.",
  },
  missed: {
    heading: "Missed Day",
    gemClass: "gem-text-missed",
    body: "This day is locked in as missed. Missed days can only be resolved during their pending review window.",
  },
};
