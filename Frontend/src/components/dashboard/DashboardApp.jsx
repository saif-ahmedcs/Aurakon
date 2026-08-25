"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

import { STYLES } from "./styles/dashboardStyles";
import { JOURNEY_STAGES } from "../../constants/journey";

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
} from "../../services/dashboardApi";

import { useToast } from "../../hooks/useToast";
import { useAccountFlow } from "../../hooks/useAccountFlow";
import { useHabits } from "../../hooks/useHabits";
import { useAuraEnergy } from "../../hooks/useAuraEnergy";
import { useReviewSession } from "../../hooks/useReviewSession";

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
  return (title || "").trim().toLowerCase().replace(/^the\s+/, "");
}

function resolveStageIndex(stages, title) {
  const wanted = normaliseTitle(title);
  const index = stages.findIndex(
    (s) => normaliseTitle(s.title) === wanted,
  );
  return index === -1 ? 0 : index;
}

export default function DashboardApp() {
  const { toast, showToast } = useToast();
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

  const refreshProgress = useCallback(async () => {
    try {
      setProgressData(await getProgressRequest());
    } catch {
      // Transient - keep showing the last known values.
    }
  }, []);

  /* Re-sync one habit's server-computed state (streaks, pending
   * reviews) after a mutation elsewhere, e.g. review decisions. */
  const syncHabitFromServer = useCallback(
    (habitId) => refreshHabit(habitId, meData ? meData.timezone : undefined),
    [refreshHabit, meData],
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
    return resolveStageIndex(journeyStages, progressData ? progressData.title : "");
  }, [progressData, journeyStages]);

  const stageTitle = journeyStages[activeStageIndex].title;
  const rankTier = journeyStages[activeStageIndex].id; // drives crest + character art
  const titlesAchieved = activeStageIndex + 1;

  const heroLevel = progressData ? Number(progressData.level) || 1 : 1;
  const xpCurrent = progressData ? Number(progressData.totalXp) : 0;
  // XP needed for the next title tier - the plate reads
  // "current / next-rank XP toward next rank".
  const xpTotal = progressData
    ? progressData.nextRank
      ? xpCurrent + Number(progressData.nextRank.xpNeeded)
      : xpCurrent
    : 1;
  const xpPercent =
    progressData && xpTotal > 0
      ? Math.min(100, Math.round((xpCurrent / xpTotal) * 100))
      : 0;

  const shieldsAvailable = progressData ? progressData.shieldBalance : 0;

  /* -------------------------------------------------------------- */
  /* Habits                                                          */
  /* -------------------------------------------------------------- */

  const { auraEnergy, setAuraEnergy, auraPulse, pulseAura } =
    useAuraEnergy(0);

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
  });
  const { openReviewSession } = review;

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
      const habit = habits.find((h) => h.id === id);
      const turningOn = habit && !habit.completedToday;

      const ok = await toggleHabitCompletion(id, meData && meData.timezone);
      if (!ok) return;

      if (turningOn) {
        pulseAura();
        showToast("+" + (habit ? habit.xp : 0) + " XP · Aura rising");
      }
      refreshProgress();
    },
    [habits, meData, toggleHabitCompletion, pulseAura, showToast, refreshProgress],
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
      await deleteHabit(deleteHabitId);
      showToast(name + " deleted");
      refreshProgress();
    } catch (err) {
      showToast(err.error || "Could not delete the habit. Try again.");
    }
  }, [habits, deleteHabitId, deleteHabit, showToast, refreshProgress]);

  const editHabit = editHabitId
    ? habits.find((h) => h.id === editHabitId)
    : null;
  const closeEditHabit = useCallback(() => setEditHabitId(null), []);

  const saveHabitEdit = useCallback(
    async (id, updates) => {
      try {
        await updateHabit(id, updates);
        setEditHabitId(null);
        showToast("Habit updated");
      } catch (err) {
        showToast(err.error || "Could not update the habit. Try again.");
      }
    },
    [updateHabit, showToast],
  );

  const [addHabitOpen, setAddHabitOpen] = useState(false);
  const openAddHabit = useCallback(() => setAddHabitOpen(true), []);
  const closeAddHabit = useCallback(() => setAddHabitOpen(false), []);

  const createHabitInFlight = useRef(false);

  const createHabit = useCallback(
    async ({ name, difficulty }) => {
      // The modal stays open until the server confirms, so guard
      // against a second submit landing while the first is in flight.
      if (createHabitInFlight.current) return;
      createHabitInFlight.current = true;
      try {
        await addHabit({ name, difficulty });
        setAddHabitOpen(false);
        showToast("New trial accepted, " + name);
      } catch (err) {
        showToast(err.error || "Could not create the habit. Try again.");
      } finally {
        createHabitInFlight.current = false;
      }
    },
    [addHabit, showToast],
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
      const ok = await undoCheckIn(habitId, dateStr, meData && meData.timezone);
      if (ok) {
        showToast("Check-in undone");
        // The server reversed XP and reconciled aura/bonuses/shields.
        refreshProgress();
      }
    },
    [undoCheckIn, meData, showToast, refreshProgress],
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
        xpCurrent={xpCurrent}
        xpTotal={xpTotal}
        xpPercent={xpPercent}
        activeStageIndex={activeStageIndex}
        journeyStages={journeyStages}
        titlesAchieved={titlesAchieved}
        lifetimeXpLabel={
          progressData ? Number(progressData.totalXp).toLocaleString() : "0"
        }
        globalStreakDays={
          progressData ? progressData.globalDailyStreak : 0
        }
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
        onHabitAction={handleHabitAction}
        onOpenHabitDetail={openHabitDetail}
        onOpenAddHabit={openAddHabit}
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
            (deleteHabitTarget ? '"' + deleteHabitTarget.name + '"' : "This habit") +
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
        <AddHabitModal onClose={closeAddHabit} onCreate={createHabit} />
      )}

      {review.reviewOpen && (
        <ReviewSessionModal
          queue={review.reviewQueue}
          index={review.reviewIndex}
          step={review.reviewStep}
          shieldsAvailable={shieldsAvailable}
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
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </AppFrame>
  );
}
