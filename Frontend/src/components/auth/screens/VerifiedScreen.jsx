"use client";

export function VerifiedScreen({ goTo }) {
  return (
    <>
      <div className="cc">✓</div>
      <h3>Aura Successfully Awakened.</h3>
      <p>Your journey begins now.</p>
      <button className="btn" onClick={() => goTo("login")}>
        Continue
      </button>
    </>
  );
}
