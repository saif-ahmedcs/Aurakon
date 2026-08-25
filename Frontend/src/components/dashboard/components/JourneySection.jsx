"use client";

import { CROWN_ICON } from "../../../constants/assets";
import { useGoldSparks } from "../../../hooks/useAmbientFx";
import { RankEmblem } from "./RankEmblem";
import { CheckIcon, CrossedSwordsIcon } from "./icons";

/* ---------------------------------------------------------------- */
/* Still gold sparks scattered behind the journey banner - fixed,    */
/* not drifting, so the section reads as lit rather than animated.   */
/* ---------------------------------------------------------------- */

function GoldSparkField() {
  const sparks = useGoldSparks(14);
  return (
    <div className="gold-spark-field" aria-hidden="true">
      {sparks.map((s) => (
        <span
          key={s.id}
          className="gold-spark"
          style={{
            top: s.top + "%",
            left: s.left + "%",
            width: s.size + "px",
            height: s.size + "px",
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Your Journey - royal, animated, interactive rank ladder           */
/*                                                                    */
/* The ladder itself is backend-owned: the stages prop carries every  */
/* title tier with its real XP threshold (GET /api/progress titles), */
/* so thresholds and achieved counts can never drift from the server. */
/* ---------------------------------------------------------------- */

export function JourneySection({
  stages,
  activeStageIndex,
  titlesAchieved,
  onStageSelect,
  sectionRef,
}) {
  return (
    <div className="journey-section" ref={sectionRef}>
      <GoldSparkField />
      <section
        className="journey-panel-wrap"
        aria-label="Your journey titles"
      >
        <div className="journey-panel">
          <div className="journey-crest">
            <CrossedSwordsIcon />
            <h2 className="journey-title-main">Your Journey</h2>
            <span className="journey-crest-line" />
            <span className="journey-titles-badge">
              <img
                className="journey-crown-img"
                src={CROWN_ICON}
                alt=""
                aria-hidden="true"
              />
              <span className="journey-titles-badge-count">
                {titlesAchieved}
              </span>
              <span className="journey-titles-badge-total">
                /{stages.length} ranks
              </span>
            </span>
          </div>
          <ol className="journey-list">
            {stages.map((stg, i) => {
              const state =
                i < activeStageIndex
                  ? "done"
                  : i === activeStageIndex
                    ? "active"
                    : "upcoming";
              return (
                <li
                  key={stg.id}
                  className={"journey-item journey-" + state}
                  onClick={() => onStageSelect(stg.title + " · " + stg.meta)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter")
                      onStageSelect(stg.title + " · " + stg.meta);
                  }}
                >
                  <span className="journey-emblem-slot">
                    <RankEmblem
                      tier={stg.id}
                      size={state === "active" ? 84 : 74}
                      state={state}
                    />
                    {state === "done" && (
                      <span
                        className="journey-achieved-seal"
                        aria-label="Rank achieved"
                      >
                        <CheckIcon />
                      </span>
                    )}
                  </span>
                  <span className="journey-text">
                    {state === "active" && (
                      <span className="journey-current-tag">
                        Current Rank
                      </span>
                    )}
                    <span className="journey-title">{stg.title}</span>
                    <span className="journey-meta">{stg.meta}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}
