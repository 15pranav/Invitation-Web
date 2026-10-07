import { useEffect, useRef, useState } from "react";

// One devotional marigold travels from the "Offer a flower" button to the
// altar along a soft bezier arc (WAAPI, transform/opacity only). Origin and
// destination are read from live DOM rects so the path adapts to any viewport.

const MAX_ACTIVE = 2;
const LIFETIME = 3000;

type Offering = { id: number };

function pointOn(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
}

export default function MarigoldOffering({ cue = 0 }: { cue?: number }) {
  const [active, setActive] = useState<Offering[]>([]);

  useEffect(() => {
    if (cue <= 0) return;
    const id = cue;
    setActive((list) => [...list.slice(-(MAX_ACTIVE - 1)), { id }]);
    const timer = setTimeout(
      () => setActive((list) => list.filter((o) => o.id !== id)),
      LIFETIME,
    );
    return () => clearTimeout(timer);
  }, [cue]);

  if (active.length === 0) return null;
  return (
    <div className="marigold-offering" aria-hidden="true">
      {active.map((o) => (
        <MarigoldFlight key={o.id} />
      ))}
    </div>
  );
}

function MarigoldFlight() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const flower = host.querySelector<HTMLElement>(".marigold-bloom");
    const glow = host.querySelector<HTMLElement>(".marigold-glow");
    const petals = host.querySelectorAll<HTMLElement>(".marigold-drift");
    if (!flower) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    // Origin: the offer button. Destination: altar base inside the temple canvas.
    const button = document.querySelector<HTMLElement>(".offer-flower-button");
    const temple = document.querySelector<HTMLElement>(".temple-canvas");
    const br = button?.getBoundingClientRect();
    const tr = temple?.getBoundingClientRect();
    const x0 = br ? br.left + br.width / 2 : vw * 0.5;
    const y0 = br ? br.top + br.height * 0.4 : vh * 0.82;
    const x2 = tr ? tr.left + tr.width / 2 : vw * 0.5;
    const y2 = tr ? tr.top + tr.height * 0.78 : vh * 0.62;

    // Control point: above the chord's midpoint → rises, curves, descends.
    const mx = (x0 + x2) / 2;
    const my = (y0 + y2) / 2;
    const dist = Math.hypot(x2 - x0, y2 - y0);
    const lift = reduced ? 0 : Math.min(dist * 0.32, vh * 0.3);
    const x1 = mx - (y2 - y0) * 0.12;
    const y1 = my - lift;

    const setBase = (el: HTMLElement, x: number, y: number) => {
      el.style.left = `${x0}px`;
      el.style.top = `${y0}px`;
      el.style.setProperty("--tx", `${x - x0}px`);
      el.style.setProperty("--ty", `${y - y0}px`);
    };

    if (reduced) {
      setBase(flower, x2, y2);
      flower.animate(
        [
          { opacity: 0, transform: "translate(-50%,-50%) scale(.85)" },
          { opacity: 1, offset: 0.3 },
          {
            opacity: 0,
            transform: `translate(calc(-50% + ${x2 - x0}px), calc(-50% + ${y2 - y0}px)) scale(.95)`,
          },
        ],
        { duration: 1100, easing: "ease-out", fill: "forwards" },
      );
      return;
    }

    // Sample the bezier into easing-weighted keyframes: rises promptly, lands
    // softly (ease-out over t).
    const steps = 26;
    const frames: Keyframe[] = [];
    for (let i = 0; i <= steps; i++) {
      const s = i / steps;
      const t = 1 - Math.pow(1 - s, 1.6); // ease-out distribution
      const px = pointOn(t, x0, x1, x2) - x0;
      const py = pointOn(t, y0, y1, y2) - y0;
      const scale = 0.85 + 0.18 * Math.sin(Math.PI * s) - 0.08 * s;
      const rot = -14 + 30 * s + 4 * Math.sin(s * 5);
      const opacity = s < 0.12 ? s / 0.12 : s > 0.96 ? (1 - s) / 0.04 : 1;
      frames.push({
        opacity,
        transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px)) rotate(${rot}deg) scale(${scale})`,
        offset: s,
      });
    }
    frames[0].opacity = 0;
    const anim = flower.animate(frames, {
      duration: 1000,
      easing: "linear",
      fill: "forwards",
    });

    // Landing: small warm glow + a few loose petals, no burst.
    if (glow) {
      setBase(glow, x2, y2);
      glow.animate(
        [
          { opacity: 0, transform: "translate(-50%,-50%) scale(.4)" },
          { opacity: 0.85, offset: 0.35 },
          { opacity: 0, transform: "translate(-50%,-50%) scale(1.5)" },
        ],
        { duration: 900, delay: 900, easing: "ease-out", fill: "forwards" },
      );
    }
    petals.forEach((p, i) => {
      const angle = (-60 + i * 55) * (Math.PI / 180);
      const dx = Math.cos(angle) * (18 + i * 9);
      const dy = Math.abs(Math.sin(angle)) * (22 + i * 8) + 16;
      setBase(p, x2, y2);
      p.animate(
        [
          { opacity: 0, transform: "translate(-50%,-50%) scale(.7)" },
          { opacity: 0.9, offset: 0.2 },
          {
            opacity: 0,
            transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${i * 90 - 60}deg) scale(.55)`,
          },
        ],
        {
          duration: 1300 + i * 180,
          delay: 950 + i * 70,
          easing: "cubic-bezier(.2,.4,.5,1)",
          fill: "forwards",
        },
      );
    });
    return () => anim.cancel();
  }, []);

  return (
    <div
      ref={(el) => {
        hostRef.current = el;
      }}
      className="marigold-flight"
    >
      <span className="marigold-glow" />
      <i className="marigold-drift" />
      <i className="marigold-drift" />
      <i className="marigold-drift" />
      <span className="marigold-bloom" />
    </div>
  );
}
