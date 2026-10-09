"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { clamp, sceneInterval, gestureTarget, gestureInterval } from "./scene-progress";
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
      gliding = false,
      nativeIntent = false;
    let lastTop = el.scrollTop,
      lastTime = performance.now(),
      velocity = 0,
      height = el.clientHeight;
    let paintFrame = 0,
      inputAnchor = Math.max(1, ids.indexOf(requested.current)),
      peak = 0,
      retreat = 0,
      lastInput = 0;
    let touch: {
      x: number;
      y: number;
      top: number;
      lastY: number;
      time: number;
      axis: "pending" | "vertical" | "horizontal";
      target: Element | null;
    } | null = null;
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
      const p = nativeIntent ? gestureInterval(el.scrollTop/height,inputAnchor,ids.length) : sceneInterval(el.scrollTop / height, ids.length);
      callbacks.current.onProgress({
        from: ids[p.from],
        to: ids[p.to],
        progress: p.progress,
      });
    };
    const commit = (index: number) => {
      nativeIntent = false;
      peak = 0;
      retreat = 0;
      requested.current = ids[index];
      callbacks.current.onNavigate(ids[index], 1);
      callbacks.current.onProgress(null);
    };
    const glideTo = (index: number) => {
      stop();
      const from = el.scrollTop,
        target = index * height,
        delta = target - from;
      if (reduced() || Math.abs(delta) < 0.5) {
        el.scrollTop = target;
        commit(index);
        return;
      }
      gliding = true;
      const start = performance.now(),
        duration = clamp(520 + (Math.abs(delta) / height) * 780, 520, 1300);
      const step = (now: number) => {
        const p = clamp((now - start) / duration, 0, 1);
        const eased = 0.5 - Math.cos(Math.PI * p) / 2;
        el.scrollTop = from + delta * eased;
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
            gestureTarget(inputAnchor, el.scrollTop / height, velocity * height, retreat, ids.length, height),
          ),
        150,
      );
    };
    const scroll = () => {
      if (
        !active ||
        blocked ||
        gliding ||
        (touching && touch?.axis === "vertical") ||
        performance.now() < syncUntil.current
      )
        return;
      if (!nativeIntent && !touching) {
        syncUntil.current = performance.now() + 60;
        el.scrollTop = Math.max(0, ids.indexOf(requested.current)) * height;
        return;
      }
      const now = performance.now();
      // Wheel input is bounded to the same adjacent scene pair as touch.
      const index = Math.max(1, ids.indexOf(requested.current));
      if (Math.abs(el.scrollTop - index * height) < 0.5) {
        velocity = 0;
        lastTop = el.scrollTop;
        lastTime = now;
        callbacks.current.onProgress(null);
        return;
      }
      const bounded = clamp(
        el.scrollTop,
        Math.max(1, index - 1) * height,
        Math.min(ids.length - 1, index + 1) * height,
      );
      if (Math.abs(bounded - el.scrollTop) > 0.5) el.scrollTop = bounded;
      velocity =
        (el.scrollTop - lastTop) /
        Math.max(16, now - lastTime) / height;
      lastTop = el.scrollTop;
      lastTime = now;
      const distance = Math.abs(el.scrollTop - inputAnchor * height);
      peak = Math.max(peak, distance);
      retreat = peak - distance;
      paint();
      schedule();
    };
    const wheel = () => {
      if (!active || blocked) return;
      const now = performance.now();
      if (!nativeIntent || now - lastInput > 220) {
        inputAnchor = Math.max(1, ids.indexOf(requested.current));
        peak = Math.abs(el.scrollTop - inputAnchor * height);
        retreat = 0;
      }
      lastInput = now;
      nativeIntent = true;
      syncUntil.current = 0;
      stop();
      schedule();
    };
    const down = (e: TouchEvent) => {
      if (!active || blocked || e.touches.length !== 1) return;
      const target = e.target instanceof Element ? e.target : null;
      if (
        target?.closest(
          '.card-carrier,.ceremony-card,button,a,input,textarea,select,[role="dialog"]',
        )
      )
        return;
      stop();
      touching = true;
      nativeIntent = false;
      syncUntil.current = 0;
      inputAnchor = Math.max(1, ids.indexOf(requested.current));
      peak = Math.abs(el.scrollTop - inputAnchor * height);
      retreat = 0;
      velocity = 0;
      const t = e.touches[0];
      touch = {
        x: t.clientX,
        y: t.clientY,
        top: el.scrollTop,
        lastY: t.clientY,
        time: performance.now(),
        axis: "pending",
        target,
      };
    };
    const move = (e: TouchEvent) => {
      if (!touch || e.touches.length !== 1 || blocked) return;
      const t = e.touches[0],
        dx = t.clientX - touch.x,
        dy = touch.y - t.clientY;
      if (touch.axis === "pending") {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
        touch.axis =
          Math.abs(dy) > Math.abs(dx) * 1.15 ? "vertical" : "horizontal";
        const nested = touch.target?.closest(".ganesh-layout,.chapter-menu");
        if (
          nested &&
          nested.scrollHeight > nested.clientHeight + 1 &&
          ((dy > 0 &&
            nested.scrollTop < nested.scrollHeight - nested.clientHeight - 1) ||
            (dy < 0 && nested.scrollTop > 0))
        )
          touch.axis = "horizontal";
      }
      if (touch.axis !== "vertical") return;
      e.preventDefault();
      nativeIntent = true;
      const now = performance.now();
      velocity =
        (touch.lastY - t.clientY) / Math.max(8, now - touch.time) / height;
      touch.lastY = t.clientY;
      touch.time = now;
      lastTime = now;
      el.scrollTop = clamp(
        touch.top + dy,
        Math.max(1, inputAnchor - 1) * height,
        Math.min(ids.length - 1, inputAnchor + 1) * height,
      );
      lastTop = el.scrollTop;
      const distance = Math.abs(el.scrollTop - inputAnchor * height);
      peak = Math.max(peak, distance);
      retreat = peak - distance;
      if (!paintFrame)
        paintFrame = requestAnimationFrame(() => {
          paintFrame = 0;
          paint();
        });
    };
    const up = (e: TouchEvent) => {
      if (!touch) return;
      const controlled = touch.axis === "vertical",
        cancelled = e.type === "touchcancel";
      touch = null;
      touching = false;
      if (controlled) {
        cancelAnimationFrame(paintFrame);
        paintFrame = 0;
        paint();
        const releaseVelocity =
          performance.now() - lastTime < 140 ? velocity * height : 0;
        glideTo(
          cancelled
            ? inputAnchor
            : gestureTarget(
                inputAnchor,
                el.scrollTop / height,
                releaseVelocity,
                retreat,
                ids.length,
                height,
              ),
        );
      } else {
        nativeIntent = false;
      }
    };
    // Focusing a control inside the pinned chapter must not scroll the rail.
    const focus = (e: FocusEvent) => {
      if (
        gliding ||
        touching ||
        !(e.target instanceof Element) ||
        !e.target.closest("button,a,input,select,textarea")
      )
        return;
      syncUntil.current = performance.now() + 100;
      el.scrollTop = Math.max(0, ids.indexOf(requested.current)) * height;
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
      if(height===el.clientHeight)return;
      const page = height
        ? el.scrollTop / height
        : ids.indexOf(requested.current);
      stop();
      syncUntil.current = performance.now() + 60;
      height = el.clientHeight;
      el.scrollTop = page * height;
      lastTop = el.scrollTop;
      touch=null;touching=false;
      if(Math.abs(page-ids.indexOf(requested.current))<.01)callbacks.current.onProgress(null);
      else {paint();schedule();}
    });
    observer.observe(el);
    el.addEventListener("scroll", scroll, { passive: true });
    el.addEventListener("wheel", wheel, { passive: true });
    el.addEventListener("touchstart", down, { passive: true, capture: true });
    el.addEventListener("touchmove", move, { passive: false, capture: true });
    el.addEventListener("touchend", up, { passive: true });
    el.addEventListener("touchcancel", up, { passive: true });
    el.addEventListener("keydown", key);
    el.addEventListener("focusin", focus);
    return () => {
      stop();
      observer.disconnect();
      el.removeEventListener("scroll", scroll);
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("touchstart", down, true);
      el.removeEventListener("touchmove", move, true);
      cancelAnimationFrame(paintFrame);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", up);
      el.removeEventListener("keydown", key);
      el.removeEventListener("focusin", focus);
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
