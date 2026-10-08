import type { CSSProperties } from "react";

// Fixed seeds: quiet edge light, never a particle field across Maa's face.
const stars = Array.from({ length: 18 }, (_, i) => ({
  x: i % 2 ? 72 + ((i * 7) % 18) : 10 + ((i * 11) % 18),
  y: 17 + ((i * 17) % 61),
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
        <radialGradient id={id} cx="45%" cy="38%" r="68%">
          <stop offset="0" stopColor="#efbe88" stopOpacity=".8" />
          <stop offset=".32" stopColor="#b77969" stopOpacity=".7" />
          <stop offset=".7" stopColor="#713047" stopOpacity=".38" />
          <stop offset="1" stopColor="#481020" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g fill={"url(#" + id + ")"}>
        <path d="M-30 175C-8 146 12 169 29 130C44 92 67 115 81 84C101 45 130 84 154 63C177 42 198 77 206 98C231 82 255 111 256 138C295 115 320 157 344 163C372 143 408 165 430 199L430 260H-30Z" />
        <path
          opacity=".72"
          d="M-20 206C12 170 48 209 69 167C92 128 129 152 143 136C164 111 189 148 214 143C244 119 263 176 293 160C327 142 354 190 419 173L430 260H-20Z"
        />
        <path
          opacity=".55"
          d="M-30 235C26 211 43 166 74 184C116 209 150 168 180 186C214 217 248 184 276 204C304 179 354 223 424 209L430 260H-30Z"
        />
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
        className="maa-lamp-chain"
        d="M30 0V133 M27 18L30 22L33 18L30 14Z M27 46L30 50L33 46L30 42Z M27 74L30 78L33 74L30 70Z M27 102L30 106L33 102L30 98Z"
        fill="none"
        stroke="currentColor"
        strokeWidth=".8"
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
