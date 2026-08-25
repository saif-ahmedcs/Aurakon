"use client";

export function ResetOkScreen({ goTo }) {
  return (
    <>
      <div className="cc">✓</div>
      <h3>Your strength has returned.</h3>
      <p>Welcome back, Warrior.</p>
      <button className="btn" onClick={() => goTo("login")}>
        Back to Log In
      </button>
    </>
  );
}
