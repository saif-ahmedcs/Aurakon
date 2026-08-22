"use client";

export function VerifyScreen({ onOpenEmailApp, goTo }) {
  return (
    <>
      <div className="ic">✉</div>
      <h3>Your journey cannot begin yet.</h3>
      <p>Verify your email to awaken your Aura.</p>
      <button className="btn" onClick={onOpenEmailApp}>
        Open Email App
      </button>
      <button className="btn out" onClick={() => goTo("verified")}>
        I've Verified
      </button>
    </>
  );
}
