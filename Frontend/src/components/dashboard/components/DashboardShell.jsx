import { BackgroundLayer, AmbientSparkField, CharacterCard } from "./background/BackgroundLayer";
import { TopBar } from "./TopBar";
import { PendingReviewBanner } from "./PendingReviewBanner";
import { HabitsPanel } from "./HabitsPanel";
import { AuraStrip } from "./AuraStrip";
import { JourneySection } from "./JourneySection";
import { OverallStatsSection } from "./OverallStatsSection";
import { BottomNav } from "./BottomNav";

/* ---------------------------------------------------------------- */
/* Dashboard composition layer                                        */
/*                                                                    */
/* Pure visual assembly of the dashboard page - background layers,    */
/* top bar, review banner, content sections and bottom navigation.   */
/* All state and behaviour live in DashboardApp and arrive as props.  */
/* ---------------------------------------------------------------- */
export function DashboardShell({
  // identity / progression
  heroName,
  rankTier,
  gender,
  stage,
  stageTitle,
  level,
  title,
  xpCurrent,
  xpTotal,
  xpPercent,
  activeStageIndex,
  journeyStages,
  titlesAchieved,
  lifetimeXpLabel,
  globalStreakDays,
  // top bar / menu
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onMenuTouchStart,
  onMenuTouchEnd,
  onOpenProfile,
  onOpenMyAccount,
  onRequestLogout,
  onRequestLogoutAll,
  // pending reviews
  totalPendingCount,
  onOpenReviewSession,
  // navigation
  activeTab,
  onNavigate,
  homeRef,
  habitsRef,
  journeyRef,
  statsRef,
  // habits
  habits,
  openHabitMenuId,
  onToggleHabitMenu,
  onToggleComplete,
  onHabitAction,
  onOpenHabitDetail,
  onOpenAddHabit,
  // aura
  auraEnergy,
  auraPulse,
  // journey
  onStageSelect,
  // overall stats
  shieldsAvailable,
}) {
  return (
    <>
      <BackgroundLayer
        gender={gender}
        stage={stage}
        name={heroName}
        stageTitle={stageTitle}
        level={level}
        xpCurrent={xpCurrent}
        xpTotal={xpTotal}
        xpPercent={xpPercent}
      />
      <AmbientSparkField />

      <div className="fg">
        <TopBar
          heroName={heroName}
          rankTier={rankTier}
          level={level}
          title={title}
          menuOpen={menuOpen}
          onToggleMenu={onToggleMenu}
          onCloseMenu={onCloseMenu}
          onMenuTouchStart={onMenuTouchStart}
          onMenuTouchEnd={onMenuTouchEnd}
          onOpenProfile={onOpenProfile}
          onOpenMyAccount={onOpenMyAccount}
          onRequestLogout={onRequestLogout}
          onRequestLogoutAll={onRequestLogoutAll}
        />

        <PendingReviewBanner
          count={totalPendingCount}
          onOpen={onOpenReviewSession}
        />

        <main className="content-wrap">
          <div className="content-stack" ref={homeRef}>
            {/* Mobile only character card; desktop uses the full-bleed
                BackgroundLayer above */}
            <CharacterCard
              gender={gender}
              stage={stage}
              name={heroName}
              stageTitle={stageTitle}
              level={level}
              xpCurrent={xpCurrent}
              xpTotal={xpTotal}
              xpPercent={xpPercent}
            />

            {/* 1. Habits - highest priority content */}
            <HabitsPanel
              habits={habits}
              openMenuId={openHabitMenuId}
              onToggleMenu={onToggleHabitMenu}
              onToggleComplete={onToggleComplete}
              onAction={onHabitAction}
              onOpenDetail={onOpenHabitDetail}
              onAddHabit={onOpenAddHabit}
              sectionRef={habitsRef}
            />

            {/* 2. Aura Energy - compact, grouped composition */}
            <AuraStrip value={auraEnergy} pulse={auraPulse} />

            {/* 3. Your Journey - royal, animated, interactive */}
            <JourneySection
              stages={journeyStages}
              activeStageIndex={activeStageIndex}
              titlesAchieved={titlesAchieved}
              onStageSelect={onStageSelect}
              sectionRef={journeyRef}
            />

            {/* 4. Overall stats - lowest priority, grouped at the end */}
            <OverallStatsSection
              shieldsAvailable={shieldsAvailable}
              lifetimeXpLabel={lifetimeXpLabel}
              globalStreakDays={globalStreakDays}
              sectionRef={statsRef}
            />
          </div>
        </main>
      </div>

      <BottomNav active={activeTab} onNavigate={onNavigate} />
    </>
  );
}
