import type { CSSProperties } from "react";

// Fixed seeds: quiet edge light, never a particle field across Maa's face.
const stars = Array.from({ length: 18 }, (_, i) => ({
  x: i % 2 ? 72 + ((i * 7) % 18) : 10 + ((i * 11) % 18),
  y: 17 + ((i * 17) % 61),
  duration: 5.7 + (i % 6) * 0.83,
}));
export default function MaaAtmosphere() {
  return (
    <div className="maa-atmosphere" aria-hidden="true">
      <div className="maa-air-halo" />
      <div className="maa-distant-recess" />
      <div className="maa-mist maa-mist-far" />
      <div className="maa-mist maa-mist-near" />
      <div className="maa-mist maa-mist-low" />
      <div className="maa-floor-reflection">
        <i />
        <i />
      </div>
      <div className="maa-dust">
        {stars.map((s, i) => (
          <i
            key={i}
            style={
              {
                left: s.x + "%",
                top: s.y + "%",
                "--dust-duration": s.duration + "s",
                "--dust-delay": -i * 1.73 + "s",
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
