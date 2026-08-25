/* Aura Energy banner - compact, grouped composition showing the user's
 * current aura charge. Purely presentational: the value and pulse flag
 * come from useAuraEnergy. */
export function AuraStrip({ value, pulse }) {
  return (
    <div
      className={"aura-strip" + (pulse ? " aura-strip-pulse" : "")}
      aria-label="Aura energy"
    >
      <span className="aura-strip-medallion">
        <img
          src="/assets/aura-energy-icon.png"
          alt=""
          aria-hidden="true"
          className="aura-strip-icon-img"
        />
        <span
          className="aura-spark-cluster aura-spark-icon"
          aria-hidden="true"
        >
          <i className="aura-spark aura-spark-1" />
          <i className="aura-spark aura-spark-2" />
          <i className="aura-spark aura-spark-3" />
          <i className="aura-spark aura-spark-4" />
          <i className="aura-spark aura-spark-5" />
          <i className="aura-spark aura-spark-6" />
        </span>
      </span>

      <div className="aura-strip-content">
        <div className="aura-strip-headrow">
          <span className="aura-strip-title">Aura Energy</span>
          <span className="aura-strip-percent">{value}%</span>
        </div>
        <div className="aura-strip-track-wrap">
          <div className="aura-strip-track">
            <div className="aura-strip-fill" style={{ width: value + "%" }} />
            <span className="aura-strip-track-shine" aria-hidden="true" />
          </div>
          <span
            className="aura-spark-cluster aura-spark-left"
            aria-hidden="true"
          >
            <i className="aura-spark aura-spark-1" />
            <i className="aura-spark aura-spark-2" />
            <i className="aura-spark aura-spark-3" />
          </span>
          <span
            className="aura-spark-cluster aura-spark-right"
            aria-hidden="true"
          >
            <i className="aura-spark aura-spark-1" />
            <i className="aura-spark aura-spark-2" />
            <i className="aura-spark aura-spark-3" />
          </span>
        </div>
      </div>
    </div>
  );
}
