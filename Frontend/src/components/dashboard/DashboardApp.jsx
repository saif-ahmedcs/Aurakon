"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import { STYLES } from "./styles/dashboardStyles";
import { JOURNEY_STAGES } from "../../constants/journey";
import { getHabitLimit } from "../../constants/habits";

import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  refreshAccessToken,
} from "../../services/tokenStore";
import {
  getCurrentUserRequest,
  updateUsernameRequest,
  getProgressRequest,
  getProfileRequest,
  getPendingReviewSummaryRequest,
} from "../../services/dashboardApi";

import { useToast } from "../../hooks/useToast";
import { useAccountFlow } from "../../hooks/useAccountFlow";
import { useHabits } from "../../hooks/useHabits";
import { useAuraEnergy } from "../../hooks/useAuraEnergy";
import { useReviewSession } from "../../hooks/useReviewSession";
import { useDayBoundary } from "../../hooks/useDayBoundary";

import { DashboardShell } from "./components/DashboardShell";
import { ConfirmDialog } from "./components/modals/ConfirmDialog";
import { ProfileModal } from "./components/modals/ProfileModal";
import { HabitDetailModal } from "./components/modals/HabitDetailModal";
import { EditHabitModal } from "./components/modals/EditHabitModal";
import { AddHabitModal } from "./components/modals/AddHabitModal";
import { ReviewSessionModal } from "./components/modals/ReviewSessionModal";
import { LoggedOutScreen } from "./components/account/LoggedOutScreen";
import { CheckEmailScreen } from "./components/account/CheckEmailScreen";
import { DeleteAccountCheckEmailScreen } from "./components/account/DeleteAccountCheckEmailScreen";
import { MyAccountPage } from "./components/account/MyAccountPage";

/* Shared frame for every screen: the app root class plus the global
 * dashboard stylesheet (fonts, tokens, components).
 *
 * APP_FRAME_BASE replicates - scoped to .aura-app - the document-level
 * rules the dashboard previously inherited from globals.css (page
 * centering/width, centered text inheritance, base type scale, heading
 * weight, form-control colour scheme) so it renders identically now
 * that it lives inside the shared Aurakon app shell. */
const APP_FRAME_BASE = `
.aura-app {
  width: 1126px;
  max-width: 100%;
  margin: 0 auto;
  text-align: center;
  display: flex;
  flex-direction: column;
  font-size: 18px;
  line-height: 145%;
  letter-spacing: 0.18px;
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color-scheme: light dark;
}
@media (max-width: 1024px) {
  .aura-app { font-size: 16px; }
}
.aura-app h1,
.aura-app h2 {
  font-weight: 500;
}
`;

function AppFrame({ children }) {
  return (
    <div className="aura-app">
      <style>{STYLES}</style>
      <style>{APP_FRAME_BASE}</style>
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* App container                                                      */
/*                                                                    */
/* Bootstraps the authenticated session (access token recovery via    */
/* the refresh cookie, then profile + progress + habits from the      */
/* Aurakon backend), owns all dashboard state through focused hooks   */
/* (habits, aura, review session, account flow, toast) and routes     */
/* between the full-page account/auth screens and the main dashboard  */
/* shell. Any session failure bounces back to the sign-in route.      */
/* ------------------------------------------------------------------ */

/* Journey stages are indexed by their (normalised) title so the ladder
 * always matches whatever tier the backend currently reports. */
function normaliseTitle(title) {
  return (title || "")
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "");
}

function resolveStageIndex(stages, title) {
  const wanted = normaliseTitle(title);
  const index = stages.findIndex((s) => normaliseTitle(s.title) === wanted);
  return index === -1 ? 0 : index;
}

/* Undoing a check-in or marking a pending day "missed" can break a
 * full-completion streak that had already earned a 7/30-day bonus or a
 * Guardian Shield - the backend deletes that award and reverses the XP
 * server-side (a real reward-reversal, not just "no bonus this time").
 * refreshProgress() alone makes totalXp/shieldBalance land on the right
 * number, but with nothing surfaced here that drop would read as
 * unexplained data loss. Mirrors the "bonus earned" toast shape. */
function announceReversedRewards(showToast, reversedBonuses, reversedShields) {
  for (const bonus of reversedBonuses || []) {
    const bonusLabel =
      bonus.bonusType === "7day" ? "7-Day Streak" : "30-Day Streak";
    const bonusXp = Math.abs(bonus.delta || 0);
    showToast(`⚠️ ${bonusLabel} bonus reversed · −${bonusXp} XP`);
  }
  for (const shield of reversedShields || []) {
    showToast(
      `🛡️ Guardian Shield revoked · ${shield.milestone}-day streak broke`,
    );
  }
}

export default function DashboardApp() {
  const { toast, toastId, showToast } = useToast();
  const habitsLoadStarted = useRef(false);

  /* -------------------------------------------------------------- */
  /* Session bootstrap                                               */
  /* -------------------------------------------------------------- */

  const [sessionReady, setSessionReady] = useState(false);
  const [meData, setMeData] = useState(null); // GET /api/auth/me
  const [progressData, setProgressData] = useState(null); // GET /api/progress
  const [profileData, setProfileData] = useState(null); // GET /api/profile

  const {
    habits,
    loaded: habitsLoaded,
    load: loadHabits,
    toggleHabitCompletion,
    deleteHabit,
    updateHabit,
    addHabit,
    undoCheckIn,
    resolveHabitDate,
    refreshHabit,
    refreshHabits,
    trackMutation,
  } = useHabits({ showToast });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // After a page reload the in-memory access token is gone; the
        // httpOnly refresh cookie restores it silently. Single-flight:
        // StrictMode (dev) mounts this effect twice, and the backend's
        // refresh token is single-use - parallel refresh calls would
        // look like token replay and wipe the session.
        if (!getAccessToken()) {
          await refreshAccessToken();
        }

        const [me, progress, profile] = await Promise.all([
          getCurrentUserRequest(),
          getProgressRequest(),
          getProfileRequest(),
        ]);
        if (cancelled) return;

        setMeData(me);
        setProgressData(progress);
        setProfileData(profile);
      } catch (err) {
        if (cancelled) return;
        clearAccessToken();
        window.location.href = "/";
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Habit history loads once the account (and its time zone) is known;
  // a failure here also ends the session.
  useEffect(() => {
    if (!meData || habitsLoaded || habitsLoadStarted.current) return;
    habitsLoadStarted.current = true;
    loadHabits(meData.timezone)
      .then(() => setSessionReady(true))
      .catch(() => {
        clearAccessToken();
        window.location.href = "/";
      });
  }, [meData, habitsLoaded, loadHabits]);

  const progressSeq = useRef(0);
  const refreshProgress = useCallback(async () => {
    const seq = (progressSeq.current += 1);
    try {
      const progress = await getProgressRequest();
      if (seq !== progressSeq.current) return; // superseded - discard
      setProgressData(progress);
      // finalizeReviews runs ahead of this GET too, and can silently
      // reconcile Guardian Shields on habits unrelated to whatever
      // triggered this refresh - chase those down as well.
      if (progress?.affectedHabitIds?.length > 0) {
        refreshHabits(progress.affectedHabitIds, meData && meData.timezone);
      }
    } catch {
      // Transient - keep showing the last known values.
    }
  }, [refreshHabits, meData]);

  /* Re-sync one or more habits' server-computed state (streaks, pending
   * reviews) after a mutation elsewhere, e.g. review decisions. Accepts
   * either a single habit id or an array - review decisions can also
   * name extra habits touched by cross-habit Guardian Shield
   * reconciliation, which need the same authoritative re-sync. */
  const syncHabitFromServer = useCallback(
    (habitIdOrIds) => {
      const timeZone = meData ? meData.timezone : undefined;
      if (Array.isArray(habitIdOrIds)) {
        return refreshHabits(habitIdOrIds, timeZone);
      }
      return refreshHabit(habitIdOrIds, timeZone);
    },
    [refreshHabit, refreshHabits, meData],
  );

  const handleAccountTimeZoneChange = useCallback(
    async (nextTz) => {
      setMeData((prev) =>
        prev ? { ...prev, timezone: nextTz, timezoneSource: "manual" } : prev,
      );

      // The backend applies the new timezone to all "today" computation
      // immediately (PATCH /timezone), but the habits already loaded in
      // state still reflect completedToday/pendingReviewDates baked in
      // against the old zone's "today". Re-sync both against the new
      // zone right away instead of waiting for the next day boundary,
      // mutation, or 409 to trigger a resync.
      try {
        await loadHabits(nextTz);
      } catch {
        // Transient - keep showing the last known state.
      }
      refreshProgress();
    },
    [loadHabits, refreshProgress],
  );

  const account = useAccountFlow({
    showToast,
    email: meData ? meData.email : "",
    createdAt: meData
      ? new Date(meData.createdAt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "",
    onTimeZoneChange: handleAccountTimeZoneChange,
  });

  /* -------------------------------------------------------------- */
  /* Derived progression values                                      */
  /* -------------------------------------------------------------- */

  // gender comes from the stored profile (GET /api/auth/me); stage and
  // every plate value derive from the backend progression data.
  const gender = (meData && meData.gender) || "male";

  /* The rank ladder is backend-owned: GET /api/progress returns every
   * title tier with its XP threshold and which one is current. The
   * static JOURNEY_STAGES constant is only a structural fallback. */
  const journeyStages = useMemo(() => {
    const titles = progressData ? progressData.titles : null;
    if (!Array.isArray(titles) || titles.length === 0) return JOURNEY_STAGES;
    return [...titles].reverse().map((tier, i) => ({
      id: i + 1,
      title: tier.title,
      meta:
        Number(tier.minXp) > 0
          ? Number(tier.minXp).toLocaleString() + "+ XP"
          : "The journey begins",
    }));
  }, [progressData]);

  const activeStageIndex = useMemo(() => {
    const titles = progressData ? progressData.titles : null;
    if (Array.isArray(titles)) {
      const currentIndex = titles.findIndex((t) => t.current);
      if (currentIndex !== -1) return titles.length - 1 - currentIndex;
    }
    return resolveStageIndex(
      journeyStages,
      progressData ? progressData.title : "",
    );
  }, [progressData, journeyStages]);

  const stageTitle = journeyStages[activeStageIndex].title;
  const rankTier = journeyStages[activeStageIndex].id; // drives crest + character art
  const titlesAchieved = activeStageIndex + 1;

  const heroLevel = progressData ? Number(progressData.level) || 1 : 1;
  const xpCurrent = progressData ? Number(progressData.totalXp) : 0;
  // Progress is measured within the *current tier's band*, not against
  // lifetime XP: the plate reads "XP earned in this rank / XP needed to
  // clear this rank", so it always starts at 0% right after a rank-up.
  const currentTierMinXp = (() => {
    const titles = progressData ? progressData.titles : null;
    if (!Array.isArray(titles)) return 0;
    const currentTier = titles.find((t) => t.current);
    return currentTier ? Number(currentTier.minXp) : 0;
  })();
  // Next tier's absolute XP threshold - derived from the backend's
  // xpNeeded (XP remaining to the next threshold) plus current XP.
  const nextTierMinXp =
    progressData && progressData.nextRank
      ? xpCurrent + Number(progressData.nextRank.xpNeeded)
      : null;
  const xpIntoTier = Math.max(0, xpCurrent - currentTierMinXp);
  const xpTierSpan =
    nextTierMinXp !== null ? nextTierMinXp - currentTierMinXp : 0;
  // xpTotal/percent below now represent progress *within the current
  // tier band* (used by the hero plate bar/label), not lifetime XP.
  // At max rank there's no next tier to band against, so xpTotal
  // just mirrors xpIntoTier (isMaxRank below is what actually flags
  // the "highest rank achieved" state to the plate).
  const xpTotal = nextTierMinXp !== null ? xpTierSpan : xpIntoTier;
  const xpPercent =
    progressData && xpTotal > 0
      ? nextTierMinXp !== null
        ? Math.min(100, Math.round((xpIntoTier / xpTierSpan) * 100))
        : 100
      : 0;
  // Explicit signal for "highest rank achieved" - driven by the
  // backend's nextRank being null, not an xpTotal/xpCurrent
  // comparison (which is unreliable right at the max tier's own
  // threshold, where both are 0).
  const isMaxRank = Boolean(progressData) && nextTierMinXp === null;

  const shieldsAvailable = progressData ? progressData.shieldBalance : 0;

  /* -------------------------------------------------------------- */
  /* Habits                                                          */
  /* -------------------------------------------------------------- */

  const { auraEnergy, setAuraEnergy, auraPulse, pulseAura } = useAuraEnergy(0);

  useEffect(() => {
    if (progressData) setAuraEnergy(Number(progressData.auraEnergyToday) || 0);
  }, [progressData, setAuraEnergy]);

  const review = useReviewSession({
    habits,
    resolveHabitDate,
    shieldsAvailable,
    showToast,
    onProgressChanged: refreshProgress,
    onHabitChanged: syncHabitFromServer,
    trackMutation,
  });
  const { openReviewSession } = review;
  const autoPopupCheckedRef = useRef(false);
  useEffect(() => {
    if (!sessionReady || autoPopupCheckedRef.current) return;
    autoPopupCheckedRef.current = true;
    (async () => {
      try {
        const summary = await getPendingReviewSummaryRequest();
        if (summary?.affectedHabitIds?.length > 0) {
          refreshHabits(summary.affectedHabitIds, meData && meData.timezone);
        }
        if (summary && summary.shouldAutoPopup) {
          openReviewSession();
        }
      } catch {
        // Non-critical - the banner still lets the user open it manually.
      }
    })();
  }, [sessionReady, openReviewSession, refreshHabits, meData]);

  /* -------------------------------------------------------------- */
  /* Day-boundary detection                                          */
  /*                                                                */
  /* When the user's local day changes (e.g. crossing midnight in    */
  /* their configured timezone), reload habits and progress so       */
  /* completedToday, pendingReviewDates and streaks stay current.    */
  /* The scheduled timeout fires precisely at midnight in the user's */
  /* timezone; a visibilitychange listener catches the case where    */
  /* the tab was backgrounded past midnight.                         */
  /* -------------------------------------------------------------- */

  const handleDayChange = useCallback(async () => {
    const tz = meData ? meData.timezone : undefined;
    if (!tz) return;
    try {
      await loadHabits(tz);
    } catch {
      // Transient - keep showing the last known state.
    }
    refreshProgress();

    // Re-check whether a pending-review session should auto-popup
    // for the new day (the backend's finalizeReviews runs lazily on
    // API calls, so loadHabits above already triggered it).
    try {
      const summary = await getPendingReviewSummaryRequest();
      if (summary?.affectedHabitIds?.length > 0) {
        refreshHabits(summary.affectedHabitIds, tz);
      }
      if (summary && summary.shouldAutoPopup) {
        openReviewSession();
      }
    } catch {
      // Non-critical.
    }
  }, [meData, loadHabits, refreshProgress, openReviewSession, refreshHabits]);

  useDayBoundary(meData ? meData.timezone : null, handleDayChange);

  const [menuOpen, setMenuOpen] = useState(false);
  // Swipe-to-close for the compact popover menu: track the touch start
  // point, then close if the user drags past a small threshold in any
  // direction (swiping the tablet back toward the menu button, or off
  // to the side, both dismiss it).
  const menuTouchStart = useRef(null);
  const handleMenuTouchStart = useCallback((e) => {
    const t = e.touches[0];
    menuTouchStart.current = { x: t.clientX, y: t.clientY };
  }, []);
  const handleMenuTouchEnd = useCallback((e) => {
    const start = menuTouchStart.current;
    menuTouchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.hypot(dx, dy) > 32) {
      setMenuOpen(false);
    }
  }, []);

  const [openHabitMenu, setOpenHabitMenu] = useState(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [logoutAllConfirmOpen, setLogoutAllConfirmOpen] = useState(false);
  const [deleteHabitId, setDeleteHabitId] = useState(null);

  // Profile modal + editable username. Level / title / total XP come
  // from the backend progression data above.
  const [profileOpen, setProfileOpen] = useState(false);
  const [heroName, setHeroName] = useState("");

  useEffect(() => {
    if (profileData && profileData.username) {
      setHeroName(profileData.username);
    }
  }, [profileData]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setOpenHabitMenu(null);
        setMenuOpen(false);
        setLogoutConfirmOpen(false);
        setLogoutAllConfirmOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close the habit options menu when the user clicks/taps anywhere
  // outside of it - mirrors how the main hamburger menu closes on
  // outside click, instead of requiring the trigger to be clicked again.
  useEffect(() => {
    if (openHabitMenu === null) return;
    function onDocPointerDown(e) {
      if (!e.target.closest(".habit-menu-wrap")) {
        setOpenHabitMenu(null);
      }
    }
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("touchstart", onDocPointerDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("touchstart", onDocPointerDown);
    };
  }, [openHabitMenu]);

  /* Completing a trial pulses the banner and toasts the XP gain - but
   * only once the server has accepted the check-in. All progression
   * math (XP, aura energy, streaks, shields) happens server-side; the
   * authoritative values are pulled back via refreshProgress (the
   * habit hook re-syncs the habit itself). */
  const handleToggleComplete = useCallback(
    async (id) => {
      // The review endpoint rewrites shared per-user progression
      // (shield balance, aura stats, bonus reconciliation) before it
      // takes the same row lock a check-in takes first - so a
      // check-in fired while a review decision is still in flight can
      // race it server-side. The modal itself can no longer be
      // dismissed mid-request (see useReviewSession), but this is the
      // functional backstop for any other path to this handler.
      if (review.decisionInFlight) {
        showToast("Finishing up your last review decision - one moment.");
        return;
      }

      const habit = habits.find((h) => h.id === id);
      const turningOn = habit && !habit.completedToday;

      const result = await toggleHabitCompletion(id, meData && meData.timezone);
      if (!result?.success) {
        if (result?.confirmed) refreshProgress();
        return;
      }

      if (turningOn) {
        pulseAura();
        showToast("+" + (habit ? habit.xp : 0) + " XP · Aura rising");

        // Show distinct toast for consistency bonuses
        if (result.consistencyBonuses && result.consistencyBonuses.length > 0) {
          for (const bonus of result.consistencyBonuses) {
            const bonusLabel =
              bonus.bonusType === "7day" ? "7-Day Streak" : "30-Day Streak";
            const bonusXp = bonus.delta;
            showToast(`🎉 Consistency Bonus: ${bonusLabel} · +${bonusXp} XP!`);
          }
        }
      }
      // Unchecking can itself break a streak that had already earned a
      // bonus/shield - announce the clawback either way (turningOn only
      // gates the "+XP" toast above, not this).
      announceReversedRewards(
        showToast,
        result.reversedBonuses,
        result.reversedShields,
      );
      refreshProgress();
    },
    [
      habits,
      meData,
      toggleHabitCompletion,
      pulseAura,
      showToast,
      refreshProgress,
      review.decisionInFlight,
    ],
  );

  const [editHabitId, setEditHabitId] = useState(null);

  const handleHabitAction = useCallback((id, action) => {
    setOpenHabitMenu(null);
    if (action === "delete") {
      setDeleteHabitId(id);
    } else if (action === "edit") {
      setEditHabitId(id);
    }
  }, []);

  const closeDeleteHabitConfirm = useCallback(() => setDeleteHabitId(null), []);

  const confirmDeleteHabit = useCallback(async () => {
    const habit = habits.find((h) => h.id === deleteHabitId);
    const name = habit ? habit.name : "Habit";
    setDeleteHabitId(null);
    try {
      await deleteHabit(deleteHabitId, meData && meData.timezone);
      showToast(name + " deleted");
      refreshProgress();
    } catch (err) {
      showToast(err.error || "Could not delete the habit. Try again.");
    }
  }, [habits, deleteHabitId, deleteHabit, showToast, refreshProgress, meData]);

  const editHabit = editHabitId
    ? habits.find((h) => h.id === editHabitId)
    : null;
  const closeEditHabit = useCallback(() => setEditHabitId(null), []);

  const saveHabitEdit = useCallback(
    async (id, updates) => {
      try {
        await updateHabit(id, updates, meData && meData.timezone);
        setEditHabitId(null);
        showToast("Habit updated");
      } catch (err) {
        showToast(err.error || "Could not update the habit. Try again.");
      }
    },
    [updateHabit, showToast, meData],
  );

  const [addHabitOpen, setAddHabitOpen] = useState(false);
  const openAddHabit = useCallback(() => setAddHabitOpen(true), []);
  const closeAddHabit = useCallback(() => setAddHabitOpen(false), []);

  const habitLimit = progressData ? getHabitLimit(progressData.level) : 5;
  const currentHabitCount = habits.length;
  const atHabitLimit = currentHabitCount >= habitLimit;

  const createHabitInFlight = useRef(false);

  const createHabit = useCallback(
    async ({ name, difficulty }) => {
      if (createHabitInFlight.current) return;
      if (atHabitLimit) return;
      createHabitInFlight.current = true;
      try {
        await addHabit({ name, difficulty }, meData && meData.timezone);
        setAddHabitOpen(false);
        showToast("New trial accepted, " + name);
        refreshProgress();
      } catch (err) {
        showToast(err.error || "Could not create the habit. Try again.");
      } finally {
        createHabitInFlight.current = false;
      }
    },
    [addHabit, showToast, refreshProgress, atHabitLimit, meData],
  );

  /* -------------------------------------------------------------- */
  /* Habit detail view                                               */
  /* -------------------------------------------------------------- */

  const [detailHabitId, setDetailHabitId] = useState(null);
  const detailHabit = detailHabitId
    ? habits.find((h) => h.id === detailHabitId)
    : null;

  const openHabitDetail = useCallback(
    (id, opts) => {
      setOpenHabitMenu(null);
      if (opts && opts.review) {
        // Pending-review badge click: go straight to the review session,
        // skip opening the detail modal underneath it.
        openReviewSession(id);
        return;
      }
      setDetailHabitId(id);
    },
    [openReviewSession],
  );

  const closeHabitDetail = useCallback(() => setDetailHabitId(null), []);

  const handleUndoCheckIn = useCallback(
    async (habitId, dateStr) => {
      if (review.decisionInFlight) {
        showToast("Finishing up your last review decision - one moment.");
        return;
      }
      const result = await undoCheckIn(
        habitId,
        dateStr,
        meData && meData.timezone,
      );
      if (result?.success) {
        showToast("Check-in undone");
        // The server reversed XP and reconciled aura/bonuses/shields -
        // announce any bonus/shield it clawed back as a consequence.
        announceReversedRewards(
          showToast,
          result.reversedBonuses,
          result.reversedShields,
        );
        refreshProgress();
      } else if (result?.confirmed) {
        refreshProgress();
      }
    },
    [undoCheckIn, meData, showToast, refreshProgress, review.decisionInFlight],
  );

  /* -------------------------------------------------------------- */
  /* Navigation                                                      */
  /* -------------------------------------------------------------- */

  const [activeTab, setActiveTab] = useState("home");
  const homeRef = useRef(null);
  const habitsRef = useRef(null);
  const journeyRef = useRef(null);
  const statsRef = useRef(null);

  const handleNavigate = useCallback(
    (id) => {
      setActiveTab(id);
      const targets = {
        home: homeRef,
        habits: habitsRef,
        journey: journeyRef,
        progress: statsRef,
      };
      const el = targets[id] && targets[id].current;
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  /* -------------------------------------------------------------- */
  /* Menu / logout wiring                                            */
  /* -------------------------------------------------------------- */

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);

  const handleMenuMyAccount = useCallback(() => {
    setMenuOpen(false);
    account.openMyAccount();
  }, [account]);

  const handleMenuLogoutAllDevices = useCallback(() => {
    setMenuOpen(false);
    setLogoutAllConfirmOpen(true);
  }, []);

  const handleMenuLogout = useCallback(() => {
    setLogoutConfirmOpen(true);
  }, []);

  // Ends the session server-side (single device or all devices) and
  // shows the signed-out screen; the return button navigates to the
  // sign-in route.
  const performLogout = useCallback(
    async (allDevices) => {
      setMenuOpen(false);
      setLogoutConfirmOpen(false);
      setLogoutAllConfirmOpen(false);
      account.closeMyAccount();
      if (allDevices) {
        await account.logOutAllDevices();
      } else {
        await account.logOut();
      }
    },
    [account],
  );

  const handleLogOut = useCallback(() => {
    performLogout(false);
  }, [performLogout]);

  const handleLogoutAllDevices = useCallback(() => {
    // Revokes every refresh token server-side, then signs this device
    // out too.
    setLogoutAllConfirmOpen(false);
    performLogout(true);
  }, [performLogout]);

  const handleSaveHeroName = useCallback(
    async (name) => {
      try {
        await updateUsernameRequest(name);
        setHeroName(name);
        showToast("Name updated");
      } catch (err) {
        let message = err.error || "Could not update the name.";
        if (err.status === 429 && typeof err.retryAfter === "number") {
          const mins = Math.ceil(err.retryAfter / 60);
          message +=
            mins >= 2
              ? ` Try again in ${mins} minutes.`
              : ` Try again in ${err.retryAfter} seconds.`;
        }
        showToast(message);
      }
    },
    [showToast],
  );

  /* -------------------------------------------------------------- */
  /* Screen routing                                                  */
  /* -------------------------------------------------------------- */

  if (!sessionReady || !habitsLoaded) {
    // Blank dark frame while the session bootstraps - matches the app
    // background so there is no flash before the shell renders.
    return <AppFrame>{null}</AppFrame>;
  }

  if (account.loggedOut) {
    return (
      <AppFrame>
        <LoggedOutScreen deleted={false} onReturn={account.returnToSignIn} />
      </AppFrame>
    );
  }

  if (account.myAccountOpen) {
    return (
      <AppFrame>
        <MyAccountPage
          email={account.accountEmail}
          createdAt={account.accountCreatedAt}
          gender={gender}
          timeZone={
            account.accountTimeZone || (meData ? meData.timezone : "UTC")
          }
          timeZoneSource={
            account.accountTimeZoneSource ||
            (meData ? meData.timezoneSource : "default")
          }
          onChangeTimeZone={account.changeTimeZone}
          onChangePassword={account.changePassword}
          onForgotPassword={account.startPasswordReset}
          onRequestDeleteAccount={account.requestDeleteAccount}
          onBack={account.closeMyAccount}
          heroName={heroName}
        />
      </AppFrame>
    );
  }

  if (account.deleteCheckEmailOpen) {
    return (
      <AppFrame>
        <DeleteAccountCheckEmailScreen
          email={account.accountEmail}
          onBack={account.backToMyAccount}
        />
      </AppFrame>
    );
  }

  if (account.checkEmailOpen) {
    return (
      <AppFrame>
        <CheckEmailScreen
          email={account.accountEmail}
          onBack={account.backToMyAccount}
        />
      </AppFrame>
    );
  }

  const deleteHabitTarget = deleteHabitId
    ? habits.find((hb) => hb.id === deleteHabitId)
    : null;

  return (
    <AppFrame>
      <DashboardShell
        heroName={heroName}
        rankTier={rankTier}
        gender={gender}
        stage={rankTier}
        stageTitle={stageTitle}
        level={heroLevel}
        title={progressData ? progressData.title : ""}
        xpCurrent={xpIntoTier}
        xpTotal={xpTotal}
        xpPercent={xpPercent}
        isMaxRank={isMaxRank}
        activeStageIndex={activeStageIndex}
        journeyStages={journeyStages}
        titlesAchieved={titlesAchieved}
        lifetimeXpLabel={
          progressData ? Number(progressData.totalXp).toLocaleString() : "0"
        }
        globalStreakDays={progressData ? progressData.globalDailyStreak : 0}
        menuOpen={menuOpen}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        onMenuTouchStart={handleMenuTouchStart}
        onMenuTouchEnd={handleMenuTouchEnd}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenMyAccount={handleMenuMyAccount}
        onRequestLogout={handleMenuLogout}
        onRequestLogoutAll={handleMenuLogoutAllDevices}
        totalPendingCount={review.totalPendingCount}
        onOpenReviewSession={() => review.openReviewSession()}
        activeTab={activeTab}
        onNavigate={handleNavigate}
        homeRef={homeRef}
        habitsRef={habitsRef}
        journeyRef={journeyRef}
        statsRef={statsRef}
        habits={habits}
        openHabitMenuId={openHabitMenu}
        onToggleHabitMenu={(id) =>
          setOpenHabitMenu((cur) => (cur === id ? null : id))
        }
        onToggleComplete={handleToggleComplete}
        checkInLocked={review.decisionInFlight}
        onHabitAction={handleHabitAction}
        onOpenHabitDetail={openHabitDetail}
        onOpenAddHabit={openAddHabit}
        atHabitLimit={atHabitLimit}
        currentHabitCount={currentHabitCount}
        habitLimit={habitLimit}
        auraEnergy={auraEnergy}
        auraPulse={auraPulse}
        onStageSelect={showToast}
        shieldsAvailable={shieldsAvailable}
      />

      {deleteHabitId && (
        <ConfirmDialog
          ariaLabel="Confirm delete habit"
          title="Delete this habit?"
          body={
            (deleteHabitTarget
              ? '"' + deleteHabitTarget.name + '"'
              : "This habit") +
            " and its full history will be permanently removed. This can't be undone."
          }
          confirmLabel="Delete Habit"
          onCancel={closeDeleteHabitConfirm}
          onConfirm={confirmDeleteHabit}
        />
      )}

      {logoutConfirmOpen && (
        <ConfirmDialog
          ariaLabel="Confirm log out"
          title="Log out?"
          body="You'll need to sign in again to keep tracking your habits and streak."
          confirmLabel="Log Out"
          onCancel={() => setLogoutConfirmOpen(false)}
          onConfirm={handleLogOut}
        />
      )}

      {logoutAllConfirmOpen && (
        <ConfirmDialog
          ariaLabel="Confirm log out of all devices"
          title="Log out of all devices?"
          body="This ends every active session, including this one. You'll need to sign in again everywhere."
          confirmLabel="Log Out All Devices"
          onCancel={() => setLogoutAllConfirmOpen(false)}
          onConfirm={handleLogoutAllDevices}
        />
      )}

      {profileOpen && (
        <ProfileModal
          name={heroName}
          onSaveName={handleSaveHeroName}
          title={progressData ? progressData.title : ""}
          level={heroLevel}
          tier={rankTier}
          totalXp={xpCurrent}
          totalShields={shieldsAvailable}
          onClose={() => setProfileOpen(false)}
        />
      )}

      {detailHabit && (
        <HabitDetailModal
          habit={detailHabit}
          onClose={closeHabitDetail}
          onReviewDay={(habitId, dateStr) =>
            review.openReviewSession(habitId, dateStr)
          }
          onReviewAll={(habitId) => review.openReviewSession(habitId)}
          onUndoCheckIn={handleUndoCheckIn}
          undoLocked={review.decisionInFlight}
          timeZone={meData ? meData.timezone : undefined}
        />
      )}

      {editHabit && (
        <EditHabitModal
          habit={editHabit}
          onClose={closeEditHabit}
          onSave={saveHabitEdit}
        />
      )}

      {addHabitOpen && (
        <AddHabitModal
          onClose={closeAddHabit}
          onCreate={createHabit}
          habitLimit={habitLimit}
          currentHabitCount={currentHabitCount}
          atHabitLimit={atHabitLimit}
        />
      )}

      {review.reviewOpen && (
        <ReviewSessionModal
          queue={review.reviewQueue}
          index={review.reviewIndex}
          step={review.reviewStep}
          shieldsAvailable={review.reviewShieldsAvailable}
          rateLimitCountdown={review.rateLimitCountdown}
          closeDisabled={review.decisionInFlight}
          onRecovered={review.handleReviewRecovered}
          onMissed={review.handleReviewMissed}
          onRequestShieldUse={review.requestShieldUse}
          onConfirmShieldUse={review.confirmShieldUse}
          onCancelShieldUse={review.cancelShieldUse}
          onDeclineShield={review.declineShield}
          onClose={review.closeReviewSession}
        />
      )}

      {toast && (
        <div className="toast" role="status" key={toastId}>
          {toast}
        </div>
      )}
    </AppFrame>
  );
}
