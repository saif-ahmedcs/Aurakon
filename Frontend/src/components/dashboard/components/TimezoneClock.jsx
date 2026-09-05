"use client";

import { useState, useEffect } from "react";

function formatTimeInZone(timeZone) {
  const opts = {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  try {
    return new Intl.DateTimeFormat("en-US", {
      ...opts,
      timeZone: timeZone || undefined,
    }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-US", opts).format(new Date());
  }
}

export function TimezoneClock({ timeZone }) {
  const [hidden, setHidden] = useState(false);
  const [label, setLabel] = useState(() => formatTimeInZone(timeZone));

  useEffect(() => {
    if (hidden) return undefined;
    setLabel(formatTimeInZone(timeZone));

    let intervalId;
    const msIntoMinute = Date.now() % 60000;
    const alignTimeout = setTimeout(() => {
      setLabel(formatTimeInZone(timeZone));
      intervalId = setInterval(
        () => setLabel(formatTimeInZone(timeZone)),
        60000,
      );
    }, 60000 - msIntoMinute);

    return () => {
      clearTimeout(alignTimeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [timeZone, hidden]);

  if (hidden || !timeZone) return null;

  return (
    <div className="tz-clock">
      <style>{`
        .tz-clock {
          position: fixed;
          left: 12px;
          bottom: 16px;
          z-index: 25;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 9px;
          border-radius: 10px;
          background: rgba(10, 7, 18, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(8px);
          font-size: 11px;
          line-height: 1;
          color: rgba(248, 246, 252, 0.62);
          font-weight: 600;
          letter-spacing: 0.02em;
          font-family: inherit;
        }
        .tz-clock-close {
          background: transparent;
          border: none;
          color: rgba(248, 246, 252, 0.42);
          font-size: 12px;
          line-height: 1;
          cursor: pointer;
          padding: 2px;
          margin: -2px -3px -2px 3px;
        }
        .tz-clock-close:hover {
          color: rgba(248, 246, 252, 0.85);
        }
        @media (max-width: 900px) {
          .tz-clock {
            bottom: calc(70px + env(safe-area-inset-bottom, 0px));
          }
        }
      `}</style>
      <span>{label}</span>
      <button
        type="button"
        className="tz-clock-close"
        aria-label="Hide timezone clock"
        onClick={() => setHidden(true)}
      >
        &#10005;
      </button>
    </div>
  );
}
