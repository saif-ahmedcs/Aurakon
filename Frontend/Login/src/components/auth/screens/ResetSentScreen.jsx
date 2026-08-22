"use client";

export function ResetSentScreen({ goTo }) {
  return (
    <>
      <div className="ic" style={{ fontSize: "20px" }}>
        ✈
      </div>
      <h3>A recovery message has been sent.</h3>
      <p>Your Aura awaits your return.</p>
      <button className="btn" onClick={() => goTo("login")}>
        Back to Log In
      </button>
    </>
  );
}
