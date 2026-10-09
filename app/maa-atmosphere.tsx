import type { CSSProperties } from "react";

// Fixed seeds: quiet edge light, never a particle field across Maa's face.
const stars = Array.from({ length: 28 }, (_, i) => ({
  x: i % 2 ? 72 + ((i * 7) % 18) : 10 + ((i * 11) % 18),
  y: i < 12 ? 9 + ((i * 7) % 23) : 33 + ((i * 17) % 43),
  duration: 5.7 + (i % 6) * 0.83,
}));

// Static vector layers: reusable paths and gradients, animated only as whole planes.
function IncenseBank({ id }: { id: string }) {
  return (
    <svg
      className="maa-cloud-shapes"
      viewBox="0 0 400 240"
      preserveAspectRatio="none"
      focusable="false"
    >
      <defs>
        <radialGradient id={id}>
          <stop offset="0" stopColor="#dbae85" stopOpacity=".62" />
          <stop offset=".38" stopColor="#a96769" stopOpacity=".42" />
          <stop offset=".72" stopColor="#713047" stopOpacity=".18" />
          <stop offset="1" stopColor="#481020" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id + "-shade"}>
          <stop stopColor="#320919" stopOpacity=".48" />
          <stop offset="1" stopColor="#320919" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soft nested pockets have no shared silhouette or hard upper edge. */}
      <g fill={"url(#" + id + ")"}>
        {[
          [35, 118, 94, 72],
          [108, 81, 77, 68],
          [186, 123, 96, 79],
          [266, 92, 78, 66],
          [340, 140, 96, 73],
          [78, 184, 114, 57],
          [245, 190, 133, 57],
        ].map(([cx, cy, rx, ry], i) => (
          <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />
        ))}
      </g>
      <g fill={"url(#" + id + "-shade)"}>
        <ellipse cx="123" cy="140" rx="73" ry="36" />
        <ellipse cx="292" cy="163" rx="89" ry="42" />
      </g>
    </svg>
  );
}
function HangingLight({ side }: { side: string }) {
  return (
    <svg
      className={"maa-hanging-light maa-hanging-" + side}
      viewBox="0 0 60 220"
      focusable="false"
    >
      <defs>
        <radialGradient id={"maa-lamp-" + side}>
          <stop stopColor="#ffd08b" stopOpacity=".7" />
          <stop offset="1" stopColor="#ed9744" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        className="maa-lamp-strand"
        d="M30 3V132"
        fill="none"
        stroke="#e9b66f"
        strokeWidth="5"
        opacity=".16"
      />
      <path
        className="maa-lamp-chain"
        d="M30 0V133 M27 18L30 22L33 18L30 14Z M27 46L30 50L33 46L30 42Z M27 74L30 78L33 74L30 70Z M27 102L30 106L33 102L30 98Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      />
      <ellipse
        className="maa-lamp-light"
        cx="30"
        cy="153"
        rx="29"
        ry="37"
        fill={"url(#maa-lamp-" + side + ")"}
      />
      <path
        d="M30 128L17 150M30 128L43 150 M13 151Q30 173 47 151Z M24 167H36 M30 162V174"
        fill="#7a3f20"
        stroke="currentColor"
        strokeWidth="1.1"
      />
      <ellipse cx="30" cy="151" rx="17" ry="3" fill="#f3c36c" />
      <path
        className="maa-lamp-flame"
        d="M30 149C21 145 29 136 31 128C30 138 38 146 30 149Z"
        fill="#ffe6ad"
      />
    </svg>
  );
}
function SacredFrame() {
  return (
    <svg
      className="maa-sacred-frame"
      viewBox="0 0 600 700"
      preserveAspectRatio="none"
      focusable="false"
    >
      <g fill="none" stroke="currentColor" strokeWidth="1">
        <path d="M48 620V290C48 153 150 70 251 54L300 24L349 54C450 70 552 153 552 290V620" />
        <path
          opacity=".5"
          d="M62 620V290C62 166 156 87 256 69L300 41L344 69C444 87 538 166 538 290V620"
        />
        <path d="M34 592V328Q15 299 34 270Q50 255 34 235Q67 222 78 197 M566 592V328Q585 299 566 270Q550 255 566 235Q533 222 522 197" />
        <path d="M263 56Q281 37 300 58Q319 37 337 56 M300 58Q282 41 300 17Q318 41 300 58 M32 586L48 570L64 586L48 602Z M536 586L552 570L568 586L552 602Z" />
      </g>
      <path
        className="maa-frame-catchlight"
        d="M48 520V300 M552 475V260 M160 102Q200 73 251 64 M349 64Q400 73 440 102"
        fill="none"
        stroke="#f3cd8b"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function MaaAtmosphere() {
  return (
    <div className="maa-atmosphere" aria-hidden="true">
      <div className="maa-air-halo" />
      <div className="maa-distant-recess" />
      <div className="maa-upper-haze">
        <IncenseBank id="maa-cloud-upper" />
      </div>
      <SacredFrame />
      <HangingLight side="left" />
      <HangingLight side="right" />
      <div className="maa-mist maa-mist-far">
        <IncenseBank id="maa-cloud-far" />
      </div>
      <div className="maa-mist maa-mist-near">
        <IncenseBank id="maa-cloud-near" />
      </div>
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
