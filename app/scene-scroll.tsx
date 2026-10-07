"use client";
import { useEffect, useRef, type ReactNode } from "react";
export default function SceneScroll({
  stage,
  chapters,
  active,
  blocked,
  onNavigate,
  children,
}: {
  stage: string;
  chapters: { id: string; label: string }[];
  active: boolean;
  blocked: boolean;
  onNavigate: (id: string, speed: number) => void;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null),
    last = useRef({ top: 0, time: 0 }),
    requested = useRef(stage),
    syncing = useRef(false),
    gliding = useRef(false),
    glide = useRef<number | null>(null),
    release = useRef<ReturnType<typeof setTimeout> | null>(null),
    settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ids = ["opening", ...chapters.map((c) => c.id)];
  function stopGlide() {
    if (glide.current !== null) cancelAnimationFrame(glide.current);
    glide.current = null;
    gliding.current = false;
  }
  // Eased programmatic settle: controlled deceleration instead of the
  // browser's generic smooth-scroll, canceled the instant the user
  // touches the wheel/trackpad/screen so it never fights their finger.
  function glideTo(el: HTMLElement, target: number) {
    stopGlide();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.scrollTop = target;
      return;
    }
    const from = el.scrollTop,
      delta = target - from;
    if (Math.abs(delta) < 2) return;
    const t0 = performance.now(),
      duration = Math.min(680, 240 + (Math.abs(delta) / el.clientHeight) * 300);
    gliding.current = true;
    const step = (now: number) => {
      const q = Math.min(1, (now - t0) / duration),
        eased = 1 - Math.pow(1 - q, 3);
      el.scrollTop = from + delta * eased;
      if (q < 1) glide.current = requestAnimationFrame(step);
      else {
        glide.current = null;
        gliding.current = false;
        last.current = { top: el.scrollTop, time: performance.now() };
      }
    };
    glide.current = requestAnimationFrame(step);
  }
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const index = ids.indexOf(stage);
    if (index < 0) return;
    if (requested.current !== stage) {
      stopGlide();
      syncing.current = true;
      requested.current = stage;
      if (settle.current) clearTimeout(settle.current);
      el.scrollTo({ top: index * el.clientHeight, behavior: "instant" });
      last.current = { top: el.scrollTop, time: performance.now() };
      if (release.current) clearTimeout(release.current);
      release.current = setTimeout(() => {
        syncing.current = false;
      }, 80);
    }
  }, [stage, chapters.map((c) => c.id).join("|")]);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      stopGlide();
      syncing.current = true;
      el.scrollTo({
        top: Math.max(0, ids.indexOf(requested.current)) * el.clientHeight,
        behavior: "instant",
      });
      if (release.current) clearTimeout(release.current);
      release.current = setTimeout(() => {
        syncing.current = false;
      }, 80);
    });
    observer.observe(el);
    // Any fresh user input (wheel/trackpad/touch/pointer) cancels both the
    // in-flight glide AND any pending settle timer — otherwise a settle fired
    // right after a new touch felt like a late snap or double jump fighting
    // the finger.
    const cancelGlide = () => {
      stopGlide();
      if (settle.current) {
        clearTimeout(settle.current);
        settle.current = null;
      }
    };
    el.addEventListener("wheel", cancelGlide, { passive: true });
    el.addEventListener("touchstart", cancelGlide, { passive: true });
    el.addEventListener("pointerdown", cancelGlide, { passive: true });
    return () => {
      observer.disconnect();
      stopGlide();
      el.removeEventListener("wheel", cancelGlide);
      el.removeEventListener("touchstart", cancelGlide);
      el.removeEventListener("pointerdown", cancelGlide);
      if (settle.current) clearTimeout(settle.current);
      if (release.current) clearTimeout(release.current);
    };
  }, [ids.join("|")]);
  function navigate(index: number, speed = 1) {
    const id = ids[Math.max(1, Math.min(ids.length - 1, index))];
    if (id === requested.current) return;
    requested.current = id;
    onNavigate(id, speed);
  }
  return (
    <div
      ref={rail}
      className={`scene-scroll ${!active || blocked ? "scroll-paused" : ""}`}
      tabIndex={0}
      aria-label="Scroll through the celebration"
      onScroll={(e) => {
        const el = e.currentTarget,
          now = performance.now();
        const velocity =
          Math.abs(el.scrollTop - last.current.top) /
          Math.max(16, now - last.current.time);
        last.current = { top: el.scrollTop, time: now };
        if (!active || blocked || syncing.current || gliding.current) return;
        const page = el.scrollTop / el.clientHeight;
        el.style.setProperty(
          "--scroll-drift",
          `${(page - Math.round(page)) * -12}px`,
        );
        navigate(
          Math.round(page),
          Math.max(0.65, Math.min(1.15, 1.15 - velocity * 0.13)),
        );
        if (settle.current) clearTimeout(settle.current);
        // Let a fast flick keep its momentum before easing to the snap target;
        // slow drags settle almost immediately.
        settle.current = setTimeout(
          () => {
            const target =
              Math.max(1, Math.round(el.scrollTop / el.clientHeight)) *
              el.clientHeight;
            if (Math.abs(target - el.scrollTop) > 2) glideTo(el, target);
          },
          Math.max(120, Math.min(360, 120 + velocity * 650)),
        );
      }}
      onKeyDown={(e) => {
        if (
          !active ||
          blocked ||
          (e.target instanceof Element &&
            e.target.closest('button,input,textarea,select,a,[role="dialog"]'))
        )
          return;
        const index = ids.indexOf(requested.current);
        if (
          [
            "ArrowDown",
            "PageDown",
            "ArrowUp",
            "PageUp",
            "Home",
            "End",
            " ",
          ].includes(e.key)
        ) {
          e.preventDefault();
          const next =
            e.key === "Home"
              ? 1
              : e.key === "End"
                ? ids.length - 1
                : index + (["ArrowUp", "PageUp"].includes(e.key) ? -1 : 1);
          rail.current?.scrollTo({
            top:
              Math.max(1, Math.min(ids.length - 1, next)) *
              rail.current.clientHeight,
            behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
              ? "instant"
              : "smooth",
          });
        }
      }}
    >
      {children}
      <div
        className="scene-scroll-space"
        style={{ height: `${chapters.length * 100}dvh` }}
        aria-hidden="true"
      />
      {ids.map((id, i) => (
        <div
          key={id}
          className="scene-snap"
          style={{ top: `${i * 100}dvh` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
