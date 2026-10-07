"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Music2,
  Flower2,
  Utensils,
  Cake,
  MapPin,
  BookOpen,
  RotateCw,
} from "lucide-react";
import { isPlaceholder } from "@/lib/content";
import type { CeremonialCard } from "@/lib/deck-content";
const icons = {
  jyoti: Flame,
  bhajan: Music2,
  katha: BookOpen,
  aarti: Flower2,
  dinner: Utensils,
  birthday: Cake,
  venue: MapPin,
};
type Phase =
  "arriving" | "stacked" | "fan" | "gather" | "shuffle" | "aligned" | "flight";
export default function Deck({
  items,
  leaving = false,
  speed = 1,
  onDeparture,
  onBridge,
}: {
  items: CeremonialCard[];
  leaving?: boolean;
  speed?: number;
  onDeparture?: () => void;
  onBridge?: () => void;
}) {
  const reduced = useReducedMotion();
  const [order, setOrder] = useState(() => items.map((x) => x.id));
  const [phase, setPhase] = useState<Phase>("arriving"),
    [flip, setFlip] = useState(false),
    [departing, setDeparting] = useState<{
      id: string;
      direction: number;
    } | null>(null),
    [spark, setSpark] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]),
    dragged = useRef(false),
    busy = useRef(false),
    wasLeaving = useRef(false),
    tapStart = useRef({ x: 0, y: 0 }),
    done = useRef(onDeparture);
  done.current = onDeparture;
  const bridgeCallback = useRef(onBridge);
  bridgeCallback.current = onBridge;
  const ids = items.map((x) => x.id).join("|");
  const idsInOrder = [
    ...order.filter((id) => items.some((i) => i.id === id)),
    ...items.filter((i) => !order.includes(i.id)).map((i) => i.id),
  ];
  const selected = idsInOrder[0],
    fan = phase === "fan",
    inTransition =
      leaving || ["gather", "shuffle", "aligned", "flight"].includes(phase);
  const later = (fn: () => void, delay: number) => {
    timers.current.push(setTimeout(fn, delay * (leaving ? speed : 1)));
  };
  useEffect(() => {
    setOrder((o) => [
      ...o.filter((id) => items.some((i) => i.id === id)),
      ...items.filter((i) => !o.includes(i.id)).map((i) => i.id),
    ]);
    setFlip(false);
  }, [ids]);
  useEffect(() => {
    later(() => setPhase("stacked"), reduced ? 0 : 850);
    return () => timers.current.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    if (!leaving) {
      if (wasLeaving.current) {
        timers.current.forEach(clearTimeout);
        timers.current = [];
        busy.current = false;
        setDeparting(null);
        setFlip(false);
        setPhase("stacked");
      }
      wasLeaving.current = false;
      return;
    }
    wasLeaving.current = true;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    busy.current = true;
    setFlip(false);
    setDeparting(null);
    if (reduced || !items.length) {
      done.current?.();
      return;
    }
    setPhase("fan");
    later(() => setPhase("gather"), 250);
    later(() => {
      setPhase("shuffle");
      setSpark((n) => n + 1);
    }, 750);
    later(() => setPhase("aligned"), 1250);
    later(() => {
      setPhase("flight");
      setSpark((n) => n + 1);
    }, 1550);
    later(() => bridgeCallback.current?.(), 2300);
    later(() => done.current?.(), 2800);
  }, [leaving, reduced]);
  function fanOut() {
    if (inTransition) return;
    setFlip(false);
    setPhase("fan");
    setSpark((n) => n + 1);
  }
  function gather() {
    if (inTransition) return;
    setFlip(false);
    setPhase("stacked");
    setSpark((n) => n + 1);
  }
  function cycle(direction: number) {
    if (inTransition || busy.current || items.length < 2) return;
    setPhase("fan");
    setFlip(false);
    busy.current = true;
    const outgoing =
      direction > 0 ? selected : idsInOrder[idsInOrder.length - 1];
    setDeparting({ id: outgoing, direction: direction > 0 ? -1 : 1 });
    setSpark((n) => n + 1);
    setOrder((o) =>
      direction > 0
        ? [...o.slice(1), o[0]]
        : [o[o.length - 1], ...o.slice(0, -1)],
    );
    later(
      () => {
        setDeparting(null);
        busy.current = false;
      },
      reduced ? 0 : 620,
    );
  }
  function select(id: string) {
    if (inTransition || busy.current) return;
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    if (!fan) {
      fanOut();
      return;
    }
    if (id === selected) setFlip((f) => !f);
    else {
      // Bring the tapped card to the centre without revealing it; the reveal
      // stays a deliberate second tap on the active card.
      const rank = idsInOrder.indexOf(id);
      if (rank < 1) return;
      busy.current = true;
      setOrder([...idsInOrder.slice(rank), ...idsInOrder.slice(0, rank)]);
      setFlip(false);
      setSpark((n) => n + 1);
      later(
        () => {
          busy.current = false;
        },
        reduced ? 0 : 620,
      );
    }
  }
  if (!items.length)
    return (
      <p className="quiet" role="status">
        The programme will be revealed soon.
      </p>
    );
  return (
    <div
      className={`deck-experience physical-deck phase-${phase}`}
      data-deck-phase={phase}
    >
      <div
        className={`deck ${fan ? "fanned" : "stacked"}`}
        role="group"
        aria-label="Ceremonial card deck"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            cycle(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            cycle(-1);
          }
          if (e.key === "Escape") {
            setFlip(false);
          }
        }}
      >
        <div className="deck-orbit" />
        {items.map((item, i) => {
          const rank = idsInOrder.indexOf(item.id),
            active = item.id === selected;
          let offset = rank;
          if (offset > items.length / 2) offset -= items.length;
          const Icon = icons[item.icon || item.kind];
          const spread = fan;
          const visible = spread ? Math.abs(offset) <= 2 : rank < 10;
          let pose: Record<string, number | number[]> = {
            x: spread ? offset * 93 : rank * 3.2,
            y: spread ? Math.abs(offset) * 22 : rank * 2.3,
            rotate: spread
              ? offset * 12
              : (rank % 2 ? -0.6 : 0.6) * Math.min(rank, 4),
            rotateX: 0,
            rotateY: 0,
            z: active && flip ? 95 : -rank * 3,
            scale: active ? (flip ? 1.035 : 1) : spread ? 0.92 : 1,
            opacity: visible ? 1 : 0,
          };
          let duration: number | undefined;
          if (phase === "arriving")
            pose = {
              ...pose,
              x: rank * 3.2,
              y: rank * 2.3,
              rotate: (rank % 2 ? -0.6 : 0.6) * Math.min(rank, 4),
            };
          if (phase === "shuffle") {
            pose = {
              ...pose,
              x: [
                rank * 3.2,
                (rank % 2 ? 1 : -1) * (55 + rank * 2),
                rank * 3.2,
              ],
              y: [rank * 2, -12 - rank * 3, rank * 2],
              z: [-rank * 3, rank % 2 ? 65 : -75, -rank * 3],
              rotate: [0, rank % 2 ? 8 : -8, 0],
            };
            duration = 0.5;
          }
          if (phase === "aligned")
            pose = {
              ...pose,
              x: rank * 1.2,
              y: rank * 0.7,
              rotate: 0,
              rotateX: 12,
              rotateY: -10,
              z: -rank * 3,
            };
          if (phase === "flight") {
            pose = {
              x: [0, (rank % 2 ? 1 : -1) * 45, (rank % 2 ? 1 : -1) * 390],
              y: [0, -25, -170],
              z: [-rank * 3, 130, 600],
              rotate: [0, rank % 2 ? 8 : -8, rank % 2 ? 22 : -22],
              rotateY: [-10, 20, 45],
              rotateX: 0,
              scale: [1, 1.35, 2.5],
              opacity: [1, 1, 0],
            };
            duration = 0.65;
          }
          if (departing?.id === item.id) {
            pose = {
              ...pose,
              x: [
                0,
                departing.direction * 215,
                departing.direction * 125,
                pose.x as number,
              ],
              y: [-12, -35, 38, pose.y as number],
              z: [80, 110, -120, -rank * 3],
              rotate: [
                0,
                departing.direction * 23,
                departing.direction * 9,
                pose.rotate as number,
              ],
            };
            duration = 0.6;
          }
          const delay =
            phase === "arriving"
              ? Math.min(rank, 9) * 0.045
              : phase === "flight"
                ? Math.min(rank, 9) * 0.06
                : 0;
          return (
            <motion.div
              key={item.id}
              className="card-carrier"
              style={{
                zIndex: departing?.id === item.id ? 30 : 20 - rank,
                pointerEvents: visible && !inTransition ? "auto" : "none",
              }}
              initial={
                reduced
                  ? false
                  : {
                      x: (i % 2 ? 1 : -1) * (80 + i * 12),
                      y: -80 - i * 6,
                      z: -200 - i * 15,
                      rotate: (i % 2 ? 1 : -1) * (13 + i),
                      opacity: 0,
                    }
              }
              animate={
                reduced ? { ...pose, z: 0, rotateX: 0, rotateY: 0 } : pose
              }
              transition={
                reduced
                  ? { duration: 0 }
                  : duration
                    ? { duration, delay, ease: [0.22, 0.65, 0.25, 1] }
                    : {
                        type: "spring",
                        stiffness: 155,
                        damping: 23,
                        mass: 0.85,
                        delay,
                      }
              }
            >
              <motion.button
                className={`ceremony-card ${active ? "selected" : ""}`}
                drag={active && !inTransition && items.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.72}
                whileDrag={{ rotate: 2, scale: 1.035 }}
                whileTap={
                  inTransition ? undefined : { scale: active ? 0.985 : 0.955 }
                }
                onDragStart={() => {
                  dragged.current = true;
                }}
                onDragEnd={(_, info) => {
                  if (
                    Math.abs(info.offset.x) > 42 ||
                    Math.abs(info.velocity.x) > 380
                  )
                    cycle(info.offset.x + info.velocity.x * 0.12 < 0 ? 1 : -1);
                  dragged.current = false;
                }}
                onPointerDown={(e) => {
                  tapStart.current = { x: e.clientX, y: e.clientY };
                }}
                onPointerCancel={() => {
                  dragged.current = false;
                }}
                onPointerUp={(e) => {
                  // Tap intent: pointer barely moved and this was not a drag.
                  // Fires reliably on touch where click can be suppressed by
                  // scroll/pan intent handling.
                  if (
                    Math.hypot(
                      e.clientX - tapStart.current.x,
                      e.clientY - tapStart.current.y,
                    ) > 10
                  )
                    return;
                  select(item.id);
                }}
                onClick={(e) => {
                  // Keyboard activation only; pointer taps are handled above.
                  if (e.detail === 0) select(item.id);
                }}
                tabIndex={visible && !inTransition && (fan || active) ? 0 : -1}
                aria-hidden={!visible || (!fan && !active)}
                aria-pressed={active && flip}
                aria-label={
                  !fan && active
                    ? `Fan the ceremonial deck, ${items.length} cards`
                    : `${item.title}. ${active ? "Tap to " + (flip ? "close" : "reveal") : "Bring this card to the centre"}`
                }
              >
                <div
                  className={`card-inner ${active && flip ? "flipped" : ""}`}
                >
                  <div
                    aria-hidden={active && flip}
                    className={`card-face card-front kind-${item.kind} ${item.theme ? `theme-${item.theme}` : ""}`}
                  >
                    <span className="card-index">
                      {String(i + 1).padStart(2, "0")} <Icon size={17} />
                    </span>
                    <div className="card-art">
                      <img
                        src={item.artwork || "/art/ceremonial-engraving.webp"}
                        alt={
                          item.artwork
                            ? "Ceremonial card artwork"
                            : "Original engraved diya and lotus artwork"
                        }
                        loading="lazy"
                        onError={(e) => {
                          if (item.artwork)
                            e.currentTarget.src =
                              "/art/ceremonial-engraving.webp";
                        }}
                      />
                    </div>
                    <span className="card-hindi" lang="hi">
                      {item.subtitle}
                    </span>
                    <h3>{item.title}</h3>
                    <span className="card-caption">
                      {item.frontContent ||
                        (!fan ? "TOUCH TO UNFOLD" : "TOUCH TO REVEAL")}
                    </span>
                  </div>
                  <div
                    aria-hidden={!(active && flip)}
                    className="card-face card-back"
                  >
                    <Icon size={25} strokeWidth={1} />
                    <p className="hindi">{item.subtitle}</p>
                    <h3>{item.backTitle || item.title}</h3>
                    <strong className="card-time">{item.time}</strong>
                    {isPlaceholder(item.time) && (
                      <span className="pending">Time to be confirmed</span>
                    )}
                    <p>{item.backContent || item.description}</p>
                    <span className="card-caption">TOUCH TO RETURN</span>
                  </div>
                </div>
              </motion.button>
            </motion.div>
          );
        })}
        {!reduced && spark > 0 && (
          <div key={spark} className="deck-gold-trail" aria-hidden="true">
            {Array.from({ length: 9 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    "--trail-x": `${(i - 4) * 22}px`,
                    "--trail-y": `${-30 - (i % 4) * 14}px`,
                    animationDelay: `${i * 0.022}s`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>
        )}
      </div>
      <div className="deck-controls">
        <button
          className="icon-button"
          disabled={inTransition || items.length < 2}
          onClick={() => cycle(-1)}
          aria-label="Previous ceremony"
        >
          <ChevronLeft size={19} />
        </button>
        <span aria-live="polite">
          {String(items.findIndex((i) => i.id === selected) + 1).padStart(
            2,
            "0",
          )}{" "}
          <i>/</i> {String(items.length).padStart(2, "0")}
        </span>
        <button
          className="icon-button"
          disabled={inTransition || items.length < 2}
          onClick={() => cycle(1)}
          aria-label="Next ceremony"
        >
          <ChevronRight size={19} />
        </button>
      </div>
      <button
        className="text-button"
        disabled={inTransition}
        onClick={fan ? gather : fanOut}
      >
        <RotateCw size={13} />
        {fan ? "Gather the cards" : "Fan the cards"}
      </button>
      <p className="gesture-hint">
        {inTransition
          ? "Let the music carry the night…"
          : fan
            ? "Swipe to explore · Tap to turn"
            : "Touch the stack to unfold the night"}
      </p>
    </div>
  );
}
