"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuraIntroScene } from "../../hooks/useAuraIntroScene";
import SceneStyles from "../../components/scene/SceneStyles";
import ParticleCanvas from "../../components/scene/ParticleCanvas";
import RingGlow from "../../components/scene/RingGlow";
import RingSVG from "../../components/scene/RingSVG";
import WarriorImage from "../../components/scene/WarriorImage";
import FormZone from "../../components/auth/FormZone";
import BackgroundGlow from "../../components/scene/BackgroundGlow";

function VerifyEmailInner() {
  useAuraIntroScene();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

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
        <FormZone
          initialScreen="verify_token"
          initialToken={token}
          initialEmail={email}
        />
        <BackgroundGlow />
      </div>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ width: "100vw", height: "100vh", background: "#050408" }} />
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
