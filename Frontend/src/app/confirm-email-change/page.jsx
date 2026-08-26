"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuraIntroScene } from "../../hooks/useAuraIntroScene";
import SceneStyles from "../../components/scene/SceneStyles";
import ParticleCanvas from "../../components/scene/ParticleCanvas";
import RingGlow from "../../components/scene/RingGlow";
import RingSVG from "../../components/scene/RingSVG";
import WarriorImage from "../../components/scene/WarriorImage";
import BackgroundGlow from "../../components/scene/BackgroundGlow";
import FormInput from "../../components/common/FormInput";
import { confirmEmailChangeRequest } from "../../services/authApi";
import { getAccessToken, refreshAccessToken } from "../../services/tokenStore";

function ConfirmEmailChangeInner() {
  useAuraIntroScene();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!token) {
      setError("Email change token is missing from the link.");
      return;
    }
    if (!password) {
      setError("Please enter your current password to verify your identity.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!getAccessToken()) {
        await refreshAccessToken();
      }
      const accessToken = getAccessToken();
      await confirmEmailChangeRequest({
        token,
        currentPassword: password,
        accessToken,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.error ||
          "Failed to confirm email change. Link may be expired or password incorrect.",
      );
    } finally {
      setLoading(false);
    }
  };

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
        <div className="fz in">
          <div className="fc">
            <div id="scrhost">
              <div className="scr isc">
                {success ? (
                  <>
                    <div className="cc">✓</div>
                    <h3>Email Address Updated</h3>
                    <p className="tx">
                      Your Aurakon account email has been updated successfully.
                    </p>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => (window.location.href = "/")}
                    >
                      Return to Log In
                    </button>
                  </>
                ) : (
                  <>
                    <div className="ic">✉</div>
                    <h3>Confirm New Email</h3>
                    <p className="tx">
                      Enter your current password to finalize updating your account email.
                    </p>
                    <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
                      <FormInput
                        id="ec-pass"
                        placeholder="Current Password"
                        type="password"
                        eye
                        icon="lock"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        showPassword={showPassword}
                        onToggle={() => setShowPassword(!showPassword)}
                      />
                      {error && <div className="login-err">{error}</div>}
                      <button className="btn" type="submit" disabled={loading}>
                        {loading ? "Confirming Change…" : "Confirm Email Change"}
                      </button>
                    </form>
                    <div className="bt">
                      <span
                        className="lk"
                        onClick={() => (window.location.href = "/")}
                      >
                        Back to Log In
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        <BackgroundGlow />
      </div>
    </>
  );
}

export default function ConfirmEmailChangePage() {
  return (
    <Suspense
      fallback={
        <div style={{ width: "100vw", height: "100vh", background: "#050408" }} />
      }
    >
      <ConfirmEmailChangeInner />
    </Suspense>
  );
}
