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
import { confirmAccountDeletionRequest } from "../../services/authApi";
import { getAccessToken, refreshAccessToken } from "../../services/tokenStore";

function ConfirmAccountDeletionInner() {
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
      setError("Deletion token is missing from the link.");
      return;
    }
    if (!password) {
      setError("Please enter your password to confirm deletion.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (!getAccessToken()) {
        await refreshAccessToken();
      }
      const accessToken = getAccessToken();
      await confirmAccountDeletionRequest({
        token,
        currentPassword: password,
        accessToken,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err.error ||
          "Failed to confirm account deletion. Link may be expired or password incorrect.",
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
                    <div className="ic" style={{ borderColor: "rgba(248, 113, 113, 0.4)", color: "#f87171" }}>
                      ✕
                    </div>
                    <h3>Account Permanently Deleted</h3>
                    <p className="tx">
                      Your Aurakon account and all progression data have been removed.
                    </p>
                    <button
                      className="btn"
                      type="button"
                      onClick={() => (window.location.href = "/")}
                    >
                      Return to Home
                    </button>
                  </>
                ) : (
                  <>
                    <div className="ic" style={{ borderColor: "rgba(248, 113, 113, 0.4)", color: "#f87171" }}>
                      ⚠️
                    </div>
                    <h3>Confirm Account Deletion</h3>
                    <p className="tx">
                      This action cannot be undone. Enter your password to permanently delete your account.
                    </p>
                    <form onSubmit={handleSubmit} style={{ textAlign: "left" }}>
                      <FormInput
                        id="del-pass"
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
                      <button
                        className="btn"
                        type="submit"
                        disabled={loading}
                        style={{
                          background: "linear-gradient(135deg, #dc2626, #991b1b)",
                        }}
                      >
                        {loading ? "Deleting Account…" : "Permanently Delete Account"}
                      </button>
                    </form>
                    <div className="bt">
                      <span
                        className="lk"
                        onClick={() => (window.location.href = "/")}
                      >
                        Cancel & Return
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

export default function ConfirmAccountDeletionPage() {
  return (
    <Suspense
      fallback={
        <div style={{ width: "100vw", height: "100vh", background: "#050408" }} />
      }
    >
      <ConfirmAccountDeletionInner />
    </Suspense>
  );
}
