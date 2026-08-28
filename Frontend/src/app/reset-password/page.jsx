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

function ResetPasswordInner() {
  useAuraIntroScene();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  // The reset token is single-use and short-lived, but as long as it sits
  // in the URL it can be captured by browser history (esp. on shared /
  // synced devices) or by access logs on any proxy/CDN in front of this
  // app. Strip it from the visible URL and history entry as soon as it's
  // been read into component state, without triggering a navigation.
  useEffect(() => {
    if (!token) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(window.history.state, "", url);
  }, [token]);

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
          initialScreen="reset"
          initialToken={token}
        />
        <BackgroundGlow />
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={{ width: "100vw", height: "100vh", background: "#050408" }} />
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
