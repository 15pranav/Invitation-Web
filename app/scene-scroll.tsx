"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { clamp, sceneInterval, settleIndex } from "./scene-progress";
export type ScrollPair = { from: string; to: string; progress: number } | null;
export default function SceneScroll({
  stage,
  chapters,
  active,
  blocked,
  onNavigate,
  onProgress,
  children,
}: {
  stage: string;
  chapters: { id: string; label: string }[];
  active: boolean;
  blocked: boolean;
  onNavigate: (id: string, speed: number) => void;
  onProgress: (pair: ScrollPair) => void;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onNavigate, onProgress });
  const requested = useRef(stage);
  const cancel = useRef(() => {});
  const syncUntil = useRef(0);
  const idsKey = ["opening", ...chapters.map((c) => c.id)].join("|");
  useEffect(() => {
    callbacks.current = { onNavigate, onProgress };
  }, [onNavigate, onProgress]);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const ids = idsKey.split("|");
    let frame = 0,
      settle: ReturnType<typeof setTimeout> | undefined,
      touching = false,
      gliding = false;
    let lastTop = el.scrollTop,
      lastTime = performance.now(),
      velocity = 0,
      height = el.clientHeight;
    const reduced = () =>
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      gliding = false;
      clearTimeout(settle);
    };
    cancel.current = stop;
    const paint = () => {
      if (reduced()) return;
      const p = sceneInterval(el.scrollTop / el.clientHeight, ids.length);
      callbacks.current.onProgress({
        from: ids[p.from],
        to: ids[p.to],
        progress: p.progress,
      });
    };
    const commit = (index: number) => {
      requested.current = ids[index];
      callbacks.current.onNavigate(ids[index], 1);
      callbacks.current.onProgress(null);
    };
    const glideTo = (index: number) => {
      stop();
      const from = el.scrollTop,
        target = index * el.clientHeight,
        delta = target - from;
      if (reduced() || Math.abs(delta) < 0.5) {
        el.scrollTop = target;
        commit(index);
        return;
      }
      gliding = true;
      const start = performance.now(),
        duration = clamp(
          340 + (Math.abs(delta) / el.clientHeight) * 240,
          340,
          580,
        );
      const step = (now: number) => {
        const p = clamp((now - start) / duration, 0, 1);
        el.scrollTop = from + delta * (1 - Math.pow(1 - p, 3));
        paint();
        if (p < 1) frame = requestAnimationFrame(step);
        else {
          gliding = false;
          frame = 0;
          lastTop = el.scrollTop;
          velocity = 0;
          commit(index);
        }
      };
      frame = requestAnimationFrame(step);
    };
    const schedule = () => {
      clearTimeout(settle);
      if (touching || !active || blocked || gliding) return;
      settle = setTimeout(
        () =>
          glideTo(
            settleIndex(el.scrollTop / el.clientHeight, velocity, ids.length),
          ),
        150,
      );
    };
    const scroll = () => {
      if (
        !active ||
        blocked ||
        gliding ||
        performance.now() < syncUntil.current
      )
        return;
      const now = performance.now();
      // One scene per gesture; native touch inertia still supplies the progress.
      const index = Math.max(1, ids.indexOf(requested.current));
      if (Math.abs(el.scrollTop - index * el.clientHeight) < 0.5) {
        velocity = 0;
        lastTop = el.scrollTop;
        lastTime = now;
        callbacks.current.onProgress(null);
        return;
      }
      const bounded = clamp(
        el.scrollTop,
        Math.max(1, index - 1) * el.clientHeight,
        Math.min(ids.length - 1, index + 1) * el.clientHeight,
      );
      if (Math.abs(bounded - el.scrollTop) > 0.5) el.scrollTop = bounded;
      velocity =
        (el.scrollTop - lastTop) /
        Math.max(16, now - lastTime) /
        el.clientHeight;
      lastTop = el.scrollTop;
      lastTime = now;
      paint();
      schedule();
    };
    const wheel = () => {
      stop();
      schedule();
    };
    const down = () => {
      touching = true;
      stop();
    };
    const up = () => {
      touching = false;
      schedule();
    };
    // Focusing a control inside the pinned chapter must not scroll the rail.
    const focus = (e:FocusEvent) => {
      if(gliding || touching || !(e.target instanceof Element) || !e.target.closest('button,a,input,select,textarea')) return;
      syncUntil.current=performance.now()+100;
      el.scrollTop=Math.max(0,ids.indexOf(requested.current))*height;
    };
    const key = (e: KeyboardEvent) => {
      if (
        !active ||
        blocked ||
        (e.target instanceof Element &&
          e.target.closest('button,input,textarea,select,a,[role="dialog"]'))
      )
        return;
      if (
        ![
          "ArrowDown",
          "PageDown",
          "ArrowUp",
          "PageUp",
          "Home",
          "End",
          " ",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      const i = ids.indexOf(requested.current);
      glideTo(
        e.key === "Home"
          ? 1
          : e.key === "End"
            ? ids.length - 1
            : clamp(
                i + (["ArrowUp", "PageUp"].includes(e.key) ? -1 : 1),
                1,
                ids.length - 1,
              ),
      );
    };
    const observer = new ResizeObserver(() => {
      const page = height
        ? el.scrollTop / height
        : ids.indexOf(requested.current);
      stop();
      syncUntil.current = performance.now() + 60;
      height = el.clientHeight;
      el.scrollTop = page * height;
      lastTop = el.scrollTop;
    });
    observer.observe(el);
    el.addEventListener("scroll", scroll, { passive: true });
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchend", up, { passive: true });
    el.addEventListener("touchcancel", up, { passive: true });
    el.addEventListener("keydown", key);
    el.addEventListener("focusin",focus);
    return () => {
      stop();
      observer.disconnect();
      el.removeEventListener("scroll", scroll);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", up);
      el.removeEventListener("keydown", key);
      el.removeEventListener("focusin",focus);
    };
  }, [idsKey, active, blocked]);
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    if (stage !== requested.current) {
      cancel.current();
      syncUntil.current = performance.now() + 60;
      requested.current = stage;
      el.scrollTop =
        Math.max(0, idsKey.split("|").indexOf(stage)) * el.clientHeight;
      callbacks.current.onProgress(null);
    }
  }, [stage, idsKey]);
  return (
    <div
      ref={rail}
      className={`scene-scroll ${!active || blocked ? "scroll-paused" : ""}`}
      tabIndex={0}
      aria-label="Scroll through the celebration"
    >
      {children}
      <div
        className="scene-scroll-space"
        style={{ height: `${chapters.length * 100}dvh` }}
        aria-hidden="true"
      />
    </div>
  );
}
