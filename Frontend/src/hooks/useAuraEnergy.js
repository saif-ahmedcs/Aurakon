"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AURA_PULSE_DURATION_MS } from "../constants/aura";

/* Aura Energy banner state. The charge is always the backend's
 * authoritative daily value (GET /api/progress auraEnergyToday) -
 * consumers re-sync it after every progression-affecting action via
 * setAuraEnergy. This hook only owns the presentation pulse that
 * lights the banner up when a trial is completed. */
export function useAuraEnergy(initialValue = 0) {
  const [auraEnergy, setAuraEnergy] = useState(initialValue);
  const [auraPulse, setAuraPulse] = useState(false);
  const pulseTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (pulseTimer.current) clearTimeout(pulseTimer.current);
    };
  }, []);

  const pulseAura = useCallback(() => {
    setAuraPulse(true);
    if (pulseTimer.current) clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(
      () => setAuraPulse(false),
      AURA_PULSE_DURATION_MS,
    );
  }, []);

  return {
    auraEnergy,
    setAuraEnergy,
    auraPulse,
    pulseAura,
  };
}
