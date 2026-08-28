"use client";

import { Suspense, useEffect } from "react";
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

  // Strip the verification token (and email) from the visible URL and
  // history entry as soon as they've been read into component state, so
  // they aren't retained in browser history or upstream access logs.
  useEffect(() => {
    if (!token && !email) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    url.searchParams.delete("email");
    window.history.replaceState(window.history.state, "", url);
  }, [token, email]);

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
