/* ---------------------------------------------------------------- */
/* Aura Energy presentation constants                                 */
/*                                                                    */
/* The Aura value itself is owned entirely by the backend             */
/* (GET /api/progress → auraEnergyToday, recalculated server-side     */
/* after every completion/undo/review). The frontend only renders it  */
/* and plays the pulse animation - it never computes energy.          */
/* ---------------------------------------------------------------- */

/* How long the aura banner pulse animation stays lit after a completion. */
export const AURA_PULSE_DURATION_MS = 1500;
