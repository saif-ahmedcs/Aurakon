"use client";

import { useAuraIntroScene } from "../hooks/useAuraIntroScene";
import SceneStyles from "../components/scene/SceneStyles";
import ParticleCanvas from "../components/scene/ParticleCanvas";
import RingGlow from "../components/scene/RingGlow";
import RingSVG from "../components/scene/RingSVG";
import WarriorImage from "../components/scene/WarriorImage";
import FormZone from "../components/auth/FormZone";
import BackgroundGlow from "../components/scene/BackgroundGlow";

export default function AuraLogin() {
  useAuraIntroScene();

  return (
    <>
      <SceneStyles />
      <div className="scene">
        <ParticleCanvas />
        <div className="cz">
          <RingGlow />
          <div className="rw" id="rw">
            <RingSVG />
          </div>
          <WarriorImage />
        </div>
        <FormZone />
        <BackgroundGlow />
      </div>
    </>
  );
}
