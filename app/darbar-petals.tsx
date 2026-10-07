import type { CSSProperties } from "react";

// Stable pseudo-random seeds avoid hydration changes and synchronized lanes.
const random = (seed: number) => {
  const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
};
export default function DarbarPetals({ boosted, offering=0 }: { boosted: boolean; offering?:number }) {
  return <div className={`darbar-petals${boosted ? " boosted" : ""}`} aria-hidden="true">
    {Array.from({ length: 32 }, (_, i) => <span key={i} className={i < 18 ? "petal-lane" : "petal-lane surge"}>
      <i style={{
        left: `${2 + random(i) * 94}%`,
        animationDelay: `${-random(i + 40) * 19}s`,
        animationDuration: `${9 + random(i + 80) * 10}s`,
        "--petal-scale": .65 + random(i + 120) * .65,
        "--petal-drift": `${(random(i + 160) - .5) * 9}vw`,
        "--petal-turn": `${90 + random(i + 200) * 260}deg`,
      } as CSSProperties} />
    </span>)}
    {offering > 0 && <span key={offering} className="offered-petals">{Array.from({length:9},(_,i)=><i key={i} style={{"--offer-spread":`${(i-4)*.9}vw`,"--offer-turn":`${i*43-160}deg`,animationDelay:`${i*.035}s`} as CSSProperties} />)}</span>}
  </div>;
}
