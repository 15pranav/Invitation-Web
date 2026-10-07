"use client";
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  lazy,
  Suspense,
} from "react";
import {
  AnimatePresence,
  motion,
  MotionConfig,
  useReducedMotion,
  useMotionValue,
} from "motion/react";
import {
  ArrowUpRight,
  Bell,
  Flower2,
  Menu,
  X,
  Volume2,
  VolumeX,
  Pause,
  Play,
  MapPin,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
} from "lucide-react";
import { EventContent, eventDate, isPlaceholder } from "@/lib/content";
import Deck from "./deck";
import DarbarPetals from "./darbar-petals";
import BalloonVeil from "./balloon-veil";
import { resolveDeck } from "@/lib/deck-content";
import { useSound } from "./audio";
import SceneScroll, { type ScrollPair } from "./scene-scroll";
import JourneyLayer from "./journey-layer";
import { RSVP, MemoryDialog } from "./guest-dialogs";
const Temple = lazy(() => import("./temple"));
const chapters = [
  { id: "ganesh", label: "An auspicious beginning" },
  { id: "darbar", label: "At Maa’s Darbar" },
  { id: "deck", label: "The night unfolds" },
  { id: "bhajans", label: "Bhajans of the night" },
  { id: "birthday", label: "Chitraksh turns two" },
  { id: "memories", label: "Little moments" },
  { id: "venue", label: "Come celebrate" },
  { id: "finale", label: "With love & blessings" },
];
function Countdown({ date }: { date: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  useEffect(() => {
    const update = () =>
      setRemaining(
        Math.max(0, new Date(date + "T00:00:00+05:30").getTime() - Date.now()),
      );
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [date]);
  if (remaining === null) return null;
  return (
    <div className="countdown" aria-label="Countdown to celebration">
      {[
        [Math.floor(remaining / 86400000), "DAYS"],
        [Math.floor(remaining / 3600000) % 24, "HOURS"],
        [Math.floor(remaining / 60000) % 60, "MINUTES"],
      ].map(([n, label]) => (
        <div key={label}>
          <strong>{String(n).padStart(2, "0")}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
export default function Experience({
  content,
  preview = false,
}: {
  content: EventContent;
  preview?: boolean;
}) {
  const [stage, setStage] = useState("opening"),
    [lit, setLit] = useState(false),
    [menu, setMenu] = useState(false),
    [bellPulse, setBellPulse] = useState(0),
    [notice, setNotice] = useState(""),
    [rsvp, setRsvp] = useState(false),
    [memory, setMemory] = useState<EventContent["media"][number] | null>(null),
    [memoryIndex, setMemoryIndex] = useState(0),
    [selectedSong, setSelectedSong] = useState<string | null>(null),
    [polaroid, setPolaroid] = useState<"idle" | "focus" | "flip">("idle"),
    [ready, setReady] = useState(false),
    [deckLeaving, setDeckLeaving] = useState(false),
    [bridge, setBridge] = useState<
      | "ignition"
      | "darbar"
      | "birthday"
      | "cards"
      | "blessing"
      | "balloons"
      | "closing"
      | null
    >(null);
  const [petalSurge, setPetalSurge] = useState(false);
  const main = useRef<HTMLElement>(null);
  const atmosphereFrame = useRef(0);
  const [scrollPair, setScrollPair] = useState<[string, string] | null>(null);
  const [scrollArrived, setScrollArrived] = useState(false);
  const scrollProgress = useMotionValue(0);
  const updateScroll = useCallback(
    (pair: ScrollPair) => {
      if (!pair) {
        setScrollPair(null);
        return;
      }
      const balloon =
        (pair.from === "birthday" && pair.to === "memories") ||
        pair.to === "finale";
      const p = pair.progress,
        clamp = (v: number) => Math.max(0, Math.min(1, v));
      scrollProgress.set(p);
      const devotional = pair.from === "ganesh" && pair.to === "darbar";
      const ramp = (a:number,b:number) => { const q=clamp((p-a)/(b-a)); return q*q*(3-2*q); };
      main.current?.style.setProperty("--devotional-veil", String(ramp(.12,.48)*(1-ramp(.68,1))));
      main.current?.style.setProperty("--devotional-warmth", String(ramp(.2,.7)));
      main.current?.style.setProperty("--devotional-glow", String(ramp(0,.25)*(1-ramp(.7,1))));
      const sceneOpacity = (id: string) =>
        ["deck", "bhajans"].includes(id) ? 0.13 : 1;
      main.current?.style.setProperty(
        "--shared-scene-opacity",
        String(sceneOpacity(pair.from) * (1 - p) + sceneOpacity(pair.to) * p),
      );
      main.current?.style.setProperty("--scene-progress", String(p));
      main.current?.style.setProperty(
        "--scene-blend",
        String(devotional ? ramp(.43,.9) : balloon ? clamp((p - 0.4) / 0.17) : p),
      );
      main.current?.style.setProperty(
        "--content-out",
        String(devotional ? 1-ramp(.3,.72) : balloon ? 1 - clamp(p / 0.14) : 1 - p),
      );
      main.current?.style.setProperty(
        "--content-in",
        String(devotional ? ramp(.65,.96) : balloon ? clamp((p - 0.63) / 0.25) : p),
      );
      setScrollPair((old) =>
        old?.[0] === pair.from && old[1] === pair.to
          ? old
          : [pair.from, pair.to],
      );
    },
    [scrollProgress],
  );
  const [finaleCue, setFinaleCue] = useState(0);
  const pendingChapter = useRef<string | null>(null);
  const bridgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const surgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();
  const stageTitle = useRef<HTMLHeadingElement>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const birthdayWorld = ["transform", "birthday", "memories", "venue"].includes(
    stage,
  );
  const [journeySpeed, setJourneySpeed] = useState(1);
  const sound = useSound(
    content.audio,
    stage,
    content.features.sound,
    selectedSong,
    bridge === "birthday" && !birthdayWorld,
  );
  const visible = chapters
    .map((c) =>
      c.id === "birthday"
        ? { ...c, label: content.child.split(" ")[0] + " turns two" }
        : c,
    )
    .filter(
      (c) =>
        !(c.id === "bhajans" && !content.features.bhajans) &&
        !(
          ["birthday", "memories"].includes(c.id) && !content.features.birthday
        ) &&
        !(c.id === "memories" && !content.features.gallery),
    );
  const index = visible.findIndex((c) => c.id === stage);
  const modeFor = (id: string): "diya" | "birthday" | "darbar" =>
    ["opening", "ganesh", "finale"].includes(id)
      ? "diya"
      : ["birthday", "memories", "venue", "transform"].includes(id)
        ? "birthday"
        : "darbar";
  const displayStages = scrollPair || [stage];
  const scrollBalloons =
    !!scrollPair &&
    ((scrollPair[0] === "birthday" && scrollPair[1] === "memories") ||
      scrollPair[1] === "finale");
  const sceneLayers = displayStages
    .map((id, slot) => ({ id, slot, mode: modeFor(id) }))
    .filter(
      (layer, i, list) =>
        list.findIndex((other) => other.mode === layer.mode) === i,
    )
    .filter(
      (layer) => !(scrollPair && layer.id === "finale" && stage !== "finale"),
    );
  const gallery = content.media.filter((m) => m.type !== "audio");
  useEffect(() => {
    if (polaroid === "idle") return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPolaroid("idle");
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [polaroid]);
  function ringBell() {
    sound.bell();
    setBellPulse((n) => n + 1);
    setNotice(
      sound.playing
        ? "A little prayer, a resonant bell."
        : "Enable sound to hear the temple bell.",
    );
  }
  const currentMemory = gallery[memoryIndex % Math.max(1, gallery.length)];
  useEffect(() => {
    setReady(true);
  }, []);
  useEffect(() => {
    if (stage !== "opening" && stage !== "transform")
      stageTitle.current?.focus({ preventScroll: true });
    setMenu(false);
  }, [stage]);
  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      if (bridgeTimer.current) clearTimeout(bridgeTimer.current);
      if (surgeTimer.current) clearTimeout(surgeTimer.current);
      cancelAnimationFrame(atmosphereFrame.current);
    },
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(t);
  }, [notice]);
  function clearJourneyTimers() {
    cancelAnimationFrame(atmosphereFrame.current);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    if (bridgeTimer.current) clearTimeout(bridgeTimer.current);
  }
  function finishDeck() {
    const target = pendingChapter.current;
    if (!target) return;
    pendingChapter.current = null;
    setStage(target);
    setDeckLeaving(false);
    if (!reduced) {
      bridgeTimer.current = setTimeout(() => setBridge(null), 650);
    }
  }
  function go(id: string, immediate = false, speed = 1, fromScroll = false) {
    setScrollPair(null);
    setScrollArrived(fromScroll);
    if (id === stage && !bridge && !deckLeaving) return;
    setPolaroid("idle");
    setJourneySpeed(speed);
    // New navigation cancels the outgoing cue; the latest requested chapter wins.
    if (bridge || deckLeaving) immediate = true;
    clearJourneyTimers();
    setSelectedSong(null);
    if (stage === "ganesh" && id === "darbar" && !fromScroll && !reduced) {
      setBridge("darbar");
      const start=performance.now();
      const tick=(now:number)=>{
        const progress=Math.min(1,(now-start)/(2100*speed));
        updateScroll({from:"ganesh",to:"darbar",progress});
        if(progress<1) atmosphereFrame.current=requestAnimationFrame(tick);
        else { setStage("darbar"); setScrollPair(null); setBridge(null); }
      };
      atmosphereFrame.current=requestAnimationFrame(tick);
      return;
    }
    if (stage === "deck" && id === "bhajans" && !immediate && !reduced) {
      pendingChapter.current = id;
      setDeckLeaving(true);
      return;
    }
    // Maa's blessing carries us into the deck: the golden bloom (bridge
    // "cards") peaks ~35–65% through its 1.15s wash, so the stage switches
    // near peak brightness and the deck settles as the light recedes.
    if (stage === "darbar" && id === "deck" && !immediate && !reduced) {
      // Maa's blessing: deliberately slow. Aura builds, jewellery glints,
      // golden bloom expands and only becomes dominant (~1.45s) before the
      // deck scene emerges through the receding light.
      setBridge("blessing");
      transitionTimer.current = setTimeout(
        () => setStage("deck"),
        1450 * speed,
      );
      bridgeTimer.current = setTimeout(() => setBridge(null), 2350 * speed);
      return;
    }
    // Birthday → Little Moments: balloons sweep forward as a cinematic veil;
    // the scene swaps behind them at peak coverage, then they fly on upward.
    if (stage === "birthday" && id === "memories" && !immediate && !reduced) {
      setBridge("balloons");
      pendingChapter.current = "memories";
      return;
    }
    // Balloon world → finale: balloons exit up and out, the background
    // crossfades, then the diya relights through its full choreography
    // (emerge → flame → warm glow → blessing text).
    if (id === "finale" && birthdayWorld && !immediate && !reduced) {
      setBridge("closing");
      setFinaleCue((n) => n + 1);
      pendingChapter.current = "finale";
      return;
    }
    pendingChapter.current = null;
    setDeckLeaving(false);
    if (id === "birthday" && !birthdayWorld && !immediate && !reduced) {
      setBridge("birthday");
      transitionTimer.current = setTimeout(
        () => setStage("birthday"),
        2300 * speed,
      );
      bridgeTimer.current = setTimeout(() => setBridge(null), 4400 * speed);
    } else {
      setBridge(null);
      setStage(id);
    }
  }
  function enter() {
    if (lit) return;
    setLit(true);
    sound.start();
    sound.bell();
    if (!reduced) setBridge("ignition");
    transitionTimer.current = setTimeout(() => setStage("ganesh"), reduced ? 0 : 1550);
    bridgeTimer.current = setTimeout(() => setBridge(null), reduced ? 0 : 3200);
  }
  function next() {
    go(visible[Math.min(index + 1, visible.length - 1)].id);
  }
  useEffect(() => {
    const context = (
      document as unknown as {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => Promise<void> | void;
        };
      }
    ).modelContext;
    if (!context) return;
    const abort = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "open_celebration_chapter",
            description:
              "Navigate to a chapter of this invitation. Does not submit an RSVP or change saved content.",
            inputSchema: {
              type: "object",
              properties: {
                chapter: { type: "string", enum: visible.map((c) => c.id) },
              },
              required: ["chapter"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false },
            execute: async (input: unknown) => {
              const id = (input as { chapter: string })?.chapter;
              if (!visible.some((c) => c.id === id))
                throw new Error("Unknown or hidden chapter");
              clearJourneyTimers();
              pendingChapter.current = null;
              setDeckLeaving(false);
              setBridge(null);
              setLit(true);
              setStage(id);
              return { chapter: id };
            },
          },
          { signal: abort.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => abort.abort();
  }, [content]);
  return (
    <MotionConfig reducedMotion="user">
      <SceneScroll
        stage={stage}
        chapters={visible}
        active={lit && stage !== "opening"}
        blocked={menu || rsvp || !!memory || !!bridge || deckLeaving}
        onProgress={updateScroll}
        onNavigate={(id, speed) => {
          if (id !== stage) {
            if (id === "finale") setFinaleCue((n) => n + 1);
            go(id, true, speed, true);
          }
        }}
      >
        <main
          ref={main}
          style={{ "--journey-speed": journeySpeed } as React.CSSProperties}
          className={
            "experience " +
            (scrollPair ? "is-scrubbing " : "") +
            (scrollArrived ? "scroll-arrived " : "") +
            "world-" +
            (birthdayWorld ? "birthday" : "temple") +
            " stage-" +
            stage +
            (lit && stage === "opening" ? " is-igniting" : "") +
            ((bridge === "balloons" && stage === "birthday") ||
            (bridge === "closing" && stage !== "finale")
              ? " balloon-outgoing"
              : "")
          }
        >
          <div className="grain" />
          <AnimatePresence mode="sync" initial={false}>
            {displayStages.map((id, slot) => (
              <JourneyLayer
                key={id}
                className={"stage-atmosphere stage-" + id}
                slot={scrollPair ? slot : undefined}
                reduced={!!reduced}
              />
            ))}
          </AnimatePresence>
          {preview && (
            <div className="preview-ribbon">
              DRAFT PREVIEW · <a href="/admin">Back to editor</a>
            </div>
          )}
          <header className="masthead">
            <span className="family-header">WITH LOVE FROM OUR FAMILY</span>
            <div className="header-right">
              <span className="header-date">{eventDate(content.date)}</span>
              {stage !== "opening" && content.features.sound && (
                <button
                  className="icon-button sound-toggle"
                  onClick={sound.toggle}
                  aria-pressed={sound.playing}
                  aria-label={sound.playing ? "Sound on" : "Sound off"}
                  title={sound.playing ? "Sound on" : "Sound off"}
                >
                  {sound.playing ? (
                    <Volume2 size={18} strokeWidth={1.6} />
                  ) : (
                    <VolumeX size={18} strokeWidth={1.6} />
                  )}
                </button>
              )}
              {stage !== "opening" && (
                <button
                  className="icon-button"
                  onClick={() => setMenu(!menu)}
                  aria-label={menu ? "Close chapters" : "Open chapters"}
                  aria-expanded={menu}
                >
                  {menu ? <X size={19} /> : <Menu size={19} />}
                </button>
              )}
            </div>
          </header>
          <AnimatePresence mode="sync">
            {ready ? (
              sceneLayers.map(({ id: sceneStage, slot, mode: visualMode }) => (
                <JourneyLayer
                  key={visualMode}
                  slot={
                    scrollPair &&
                    modeFor(scrollPair[0]) !== modeFor(scrollPair[1])
                      ? slot
                      : undefined
                  }
                  reduced={!!reduced}
                  className={
                    "scene-layer stage-" +
                    sceneStage +
                    (scrollPair &&
                    modeFor(scrollPair[0]) === modeFor(scrollPair[1])
                      ? " shared-scene"
                      : "")
                  }
                >
                  <div className={"scene scene-" + visualMode}>
                    <Suspense
                      fallback={
                        <div className="scene-loading">
                          Preparing a little light…
                        </div>
                      }
                    >
                      <Temple
                        mode={visualMode}
                        lit={lit}
                        bellPulse={bellPulse}
                        travelling={
                          (bridge === "birthday" && !birthdayWorld) ||
                          ((bridge === "cards" || bridge === "blessing") &&
                            stage === "darbar")
                        }
                        ambientOnly={
                          !bridge &&
                          !["opening", "darbar", "birthday"].includes(stage)
                        }
                        reduced={!!reduced}
                        reignite={finaleCue}
                        finale={sceneStage === "finale"}
                        speed={journeySpeed}
                        onBellTap={ringBell}
                      />
                    </Suspense>
                  </div>
                </JourneyLayer>
              ))
            ) : (
              <div className="scene-loading" aria-hidden="true" />
            )}
          </AnimatePresence>
          {scrollBalloons && !reduced && (
            <div className="light-bridge bridge-balloons">
              <BalloonVeil
                speed={1}
                progress={scrollProgress}
                onCovered={() => {}}
                onComplete={() => {}}
              />
            </div>
          )}
          {scrollPair?.[0] === "ganesh" && scrollPair[1] === "darbar" && !reduced && (
            <div className="devotional-atmosphere" aria-hidden="true"><div className="devotional-gold"/><div className="devotional-red"/><div className="devotional-cloud"/>{Array.from({length:18},(_,i)=><i key={i} style={{left:`${12+(i*37)%78}%`,top:`${15+(i*23)%70}%`}} />)}</div>
          )}
          {bridge && bridge !== "darbar" && !reduced && (
            <div
              key={bridge}
              className={`light-bridge bridge-${bridge}`}
              aria-hidden="true"
            >
              {bridge === "ignition" ? (
                <div className="ganesh-cloud-veil">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              ) : (
                <div className="bridge-core" />
              )}
              {(bridge === "balloons" || bridge === "closing") && (
                <BalloonVeil
                  speed={journeySpeed}
                  onCovered={() => {
                    const target = pendingChapter.current;
                    if (target) {
                      setStage(target);
                      pendingChapter.current = null;
                    }
                  }}
                  onComplete={() => setBridge(null)}
                />
              )}
            </div>
          )}
          {bridge === "blessing" && stage === "darbar" && !reduced && (
            // Jewellery glints ahead of the golden bloom: crown, necklace,
            // bangles and rim catch the light one after another.
            <div className="darbar-glints" aria-hidden="true">
              {[
                [50, 24],
                [44, 42],
                [58, 46],
                [34, 55],
                [66, 52],
              ].map(([x, y], i) => (
                <i
                  key={i}
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    animationDelay: `${0.5 + i * 0.16}s`,
                  }}
                />
              ))}
            </div>
          )}
          <AnimatePresence mode="sync">
            {displayStages.map((chapterStage, slot) => (
              <JourneyLayer
                key={chapterStage}
                className={
                  "chapter" +
                  (scrollPair && chapterStage === "finale" && stage !== "finale"
                    ? " finale-scrub-hidden"
                    : "")
                }
                slot={scrollPair ? slot : undefined}
                reduced={!!reduced}
                onComplete={() =>
                  stageTitle.current?.focus({ preventScroll: true })
                }
              >
                {chapterStage === "opening" && (
                  <div className="opening">
                    <p className="devotion" lang="hi">
                      ॥ जय माता दी ॥
                    </p>
                    <p className="eyebrow">
                      ONE FAMILY. TWO BEAUTIFUL REASONS.
                    </p>
                    <h1>
                      A night of blessings.
                      <br />
                      <em>A little world of joy.</em>
                    </h1>
                    <p className="opening-sub">
                      Mata Ka Jagran <span>✦</span>{" "}
                      {content.child.split(" ")[0]} turns two
                    </p>
                    <div className="opening-action">
                      <button
                        className="primary"
                        disabled={lit}
                        onClick={enter}
                      >
                        {lit
                          ? "May the light lead us"
                          : "Enter the Celebration"}
                        <span>LIGHT THE DIYA</span>
                      </button>
                      {!lit && <p>Begin with a little light.</p>}
                    </div>
                  </div>
                )}
                {chapterStage === "ganesh" && (
                  <div className="ganesh-layout">
                    <div className="ganesh-ambience" aria-hidden="true">
                      <i className="cloud-edge cloud-edge-left" />
                      <i className="cloud-edge cloud-edge-right" />
                      <i className="rare-star" />
                    </div>
                    <div className="ganesh-image">
                      <div className="ganesh-radiance" aria-hidden="true" />
                      <div className="blessing-dust" aria-hidden="true">
                        {Array.from({ length: 12 }, (_, i) => (
                          <i
                            key={i}
                            style={{
                              left: `${12 + ((i * 17) % 76)}%`,
                              top: `${10 + ((i * 23) % 80)}%`,
                              animationDelay: `${i * -0.8}s`,
                            }}
                          />
                        ))}
                      </div>
                      <img
                        src="/art/ganesh-ji.webp"
                        width={1000}
                        height={1000}
                        draggable={false}
                        alt="Ganesh Ji, an auspicious beginning"
                        fetchPriority="high"
                      />
                    </div>
                    <div className="chapter-copy">
                      <h1
                        ref={chapterStage === stage ? stageTitle : undefined}
                        tabIndex={-1}
                      >
                        <span className="hindi">शुभ आरम्भ</span>
                        <em>
                          Every joy begins
                          <br />
                          with a blessing.
                        </em>
                      </h1>
                      <p className="mantra hindi">
                        वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।
                        <br />
                        निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥
                      </p>
                      <p className="invitation hindi">{content.invitation}</p>
                      <button className="quiet-button" onClick={next}>
                        Enter Maa’s Darbar <span>✦</span>
                      </button>
                    </div>
                  </div>
                )}
                {chapterStage === "darbar" && (
                  <>
                    <DarbarPetals boosted={petalSurge} />
                    <div className="darbar-title">
                      <p className="eyebrow">IN THE PRESENCE OF THE DIVINE</p>
                      <h1
                        ref={chapterStage === stage ? stageTitle : undefined}
                        tabIndex={-1}
                        className="hindi"
                      >
                        माँ का दरबार
                      </h1>
                    </div>
                    <div className="darbar-side">
                      <span className="vertical-rule" />
                      <p>
                        A moment to pause.
                        <br />A blessing to carry.
                      </p>
                      <span className="hindi">जय माता दी</span>
                    </div>
                    <div className="darbar-actions">
                      {content.features.flowers && (
                        <button
                          className="ritual-button"
                          onClick={() => {
                            setNotice("Your flower is offered with love.");
                            // Boost the shared red petal emitter, then let it
                            // ease back to baseline (CSS fades the surge layer
                            // out over ~2s — no snap back).
                            setPetalSurge(true);
                            if (surgeTimer.current)
                              clearTimeout(surgeTimer.current);
                            surgeTimer.current = setTimeout(
                              () => setPetalSurge(false),
                              300,
                            );
                          }}
                        >
                          <Flower2 size={20} strokeWidth={1} />
                          <span>Offer a flower</span>
                        </button>
                      )}
                      <button className="ritual-button" onClick={ringBell}>
                        <Bell size={20} strokeWidth={1} />
                        <span>Ring the bell</span>
                      </button>
                    </div>
                    <p className="darbar-hint">Drag gently to look around</p>
                  </>
                )}
                {chapterStage === "deck" && (
                  <div className="deck-chapter">
                    <div className="chapter-heading">
                      <p className="eyebrow">A CEREMONY IN EVERY CARD</p>
                      <h1
                        ref={chapterStage === stage ? stageTitle : undefined}
                        tabIndex={-1}
                      >
                        Let the night <em>unfold.</em>
                      </h1>
                      <p className="quiet">
                        An evening of togetherness, a night of devotion.
                      </p>
                    </div>
                    <Deck
                      items={resolveDeck(content)}
                      leaving={deckLeaving}
                      speed={journeySpeed}
                      onDeparture={finishDeck}
                      onBridge={() => setBridge("cards")}
                    />
                  </div>
                )}
                {chapterStage === "bhajans" && (
                  <>
                    <div className="bhajan-petals" aria-hidden="true">
                      {Array.from({ length: 9 }, (_, i) => (
                        <i
                          key={i}
                          style={
                            {
                              left: `${i % 2 ? 6 + ((i * 13) % 16) : 76 + ((i * 11) % 16)}%`,
                              animationDelay: `${i * -2.6}s`,
                              animationDuration: `${13 + (i % 4) * 3.5}s`,
                              "--petal-scale": 0.7 + ((i * 0.23) % 0.55),
                            } as React.CSSProperties
                          }
                        />
                      ))}
                    </div>
                    <div className="listening-chapter">
                      <p className="eyebrow">DEVOTION, IN EVERY NOTE</p>
                      <h1
                        ref={chapterStage === stage ? stageTitle : undefined}
                        tabIndex={-1}
                      >
                        Bhajans of <em>the night.</em>
                      </h1>
                      <p className="hindi listening-sub">
                        माता के भजन एवं मधुर संकीर्तन
                      </p>
                      <div className="song-list">
                        {content.bhajans.length ? (
                          content.bhajans.map((b, i) => (
                            <button
                              className={
                                "song-row " +
                                (selectedSong === b.url && b.url
                                  ? "active"
                                  : "")
                              }
                              key={b.id}
                              onClick={() => {
                                if (!b.url) {
                                  setNotice(
                                    "This recording will be added soon.",
                                  );
                                  return;
                                }
                                setSelectedSong(b.url);
                                sound.select();
                              }}
                            >
                              <span className="song-index">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                              <span>
                                <strong>{b.title}</strong>
                                <small>
                                  {b.singer || "Singer to be announced"}
                                </small>
                              </span>
                              <span>
                                {b.url ? (
                                  <Play size={18} />
                                ) : (
                                  <small>Coming soon</small>
                                )}
                              </span>
                            </button>
                          ))
                        ) : (
                          <div className="empty-bhajans">
                            <span className="hindi">भक्ति से भरी एक रात</span>
                            <p>
                              The night’s bhajans are being lovingly chosen.
                              <br />
                              Recordings and the programme will appear here.
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="quiet">
                        {content.mandali === "TBD"
                          ? "Singer / mandali to be announced"
                          : content.mandali}
                      </p>
                    </div>
                  </>
                )}
                {chapterStage === "transform" && (
                  <div className="transformation">
                    <motion.div
                      className="blessing-trail"
                      aria-hidden="true"
                      initial={{ scale: 0.2, y: 180, opacity: 0 }}
                      animate={{
                        scale: [0.2, 1, 0.4],
                        y: [180, 0, -260],
                        opacity: [0, 1, 0],
                      }}
                      transition={{ duration: 3.6, times: [0, 0.4, 1] }}
                    />
                    <button
                      className="skip-ceremony"
                      onClick={() => go("birthday")}
                    >
                      Continue to the celebration
                    </button>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1 }}
                    >
                      And from a blessing,
                      <br />
                      <em>a little joy takes flight.</em>
                    </motion.p>
                  </div>
                )}
                {chapterStage === "birthday" && (
                  <div className="birthday-chapter">
                    <p className="eyebrow">
                      OUR LITTLE WORLD. OUR BIGGEST BLESSING.
                    </p>
                    <h1
                      ref={chapterStage === stage ? stageTitle : undefined}
                      tabIndex={-1}
                    >
                      {content.child.split(" ")[0]}
                      <br />
                      <em>turns two.</em>
                    </h1>
                    <span className="birthday-two" aria-hidden="true">
                      2
                    </span>
                    <p className="birthday-note">
                      Two years of tiny wonders.
                      <br />A lifetime of love ahead.
                    </p>
                    <div className="birthday-programme">
                      {content.programme
                        .filter((p) => p.world === "birthday")
                        .map((p) => (
                          <div key={p.id}>
                            <span>{p.title}</span>
                            <strong>{p.time}</strong>
                            {isPlaceholder(p.time) && (
                              <small>Time to be confirmed</small>
                            )}
                            <p>{p.description}</p>
                          </div>
                        ))}
                    </div>
                    {content.features.countdown && (
                      <Countdown date={content.date} />
                    )}
                  </div>
                )}
                {chapterStage === "memories" && (
                  <div className="memory-chapter">
                    <p className="eyebrow">
                      THE DAYS ARE LITTLE. THE LOVE IS ENDLESS.
                    </p>
                    <h1
                      ref={chapterStage === stage ? stageTitle : undefined}
                      tabIndex={-1}
                    >
                      Little moments.
                      <br />
                      <em>Forever memories.</em>
                    </h1>
                    <div className="memory-stage">
                      {currentMemory ? (
                        polaroid === "idle" ? (
                          <motion.button
                            layoutId="memory-polaroid"
                            className="memory-photo"
                            transition={{
                              duration: reduced ? 0 : 0.5,
                              ease: [0.22, 0.65, 0.25, 1],
                            }}
                            onPointerDown={(e) =>
                              e.currentTarget.classList.add("photo-lift")
                            }
                            onPointerUp={(e) =>
                              e.currentTarget.classList.remove("photo-lift")
                            }
                            onPointerCancel={(e) =>
                              e.currentTarget.classList.remove("photo-lift")
                            }
                            onClick={() => setPolaroid("focus")}
                            aria-label={`Enlarge memory: ${currentMemory.title}`}
                          >
                            {currentMemory.type === "video" ? (
                              <video
                                src={currentMemory.url}
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <img
                                src={currentMemory.url}
                                alt={currentMemory.title}
                                loading="lazy"
                              />
                            )}
                            <span>
                              {currentMemory.title}
                              {currentMemory.type === "video" && (
                                <Play size={20} />
                              )}
                            </span>
                          </motion.button>
                        ) : (
                          <span
                            className="memory-photo-ghost"
                            aria-hidden="true"
                          />
                        )
                      ) : (
                        <div className="memory-placeholder">
                          <ImageIcon size={30} strokeWidth={1} />
                          <span>
                            A little space for
                            <br />
                            <em>beautiful memories.</em>
                          </span>
                          <small>
                            DEVELOPMENT PLACEHOLDER
                            <br />
                            Family photos and videos will appear here.
                          </small>
                        </div>
                      )}
                    </div>
                    {gallery.length > 1 && (
                      <div className="deck-controls">
                        <button
                          className="icon-button"
                          aria-label="Previous memory"
                          onClick={() => {
                            setPolaroid("idle");
                            setMemoryIndex(
                              (memoryIndex - 1 + gallery.length) %
                                gallery.length,
                            );
                          }}
                        >
                          <ChevronLeft />
                        </button>
                        <span>
                          {memoryIndex + 1} / {gallery.length}
                        </span>
                        <button
                          className="icon-button"
                          aria-label="Next memory"
                          onClick={() => {
                            setPolaroid("idle");
                            setMemoryIndex((memoryIndex + 1) % gallery.length);
                          }}
                        >
                          <ChevronRight />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {chapterStage === "venue" && (
                  <div className="venue-chapter">
                    <p className="eyebrow">
                      THE EVENING IS INCOMPLETE WITHOUT YOU
                    </p>
                    <h1
                      ref={chapterStage === stage ? stageTitle : undefined}
                      tabIndex={-1}
                    >
                      Come for the blessings.
                      <br />
                      <em>Stay for the joy.</em>
                    </h1>
                    <div className="venue-details">
                      <p className="date-display">{eventDate(content.date)}</p>
                      <MapPin size={24} strokeWidth={1} />
                      <h2>{content.venue}</h2>
                      <div className="venue-times">
                        {content.programme
                          .filter(
                            (p) => p.kind === "dinner" || p.kind === "jyoti",
                          )
                          .map((p) => (
                            <p key={p.id}>
                              <span>
                                {p.kind === "dinner"
                                  ? "Dinner"
                                  : "Jyoti Prachand"}
                              </span>
                              <strong>{p.time}</strong>
                            </p>
                          ))}
                      </div>
                      <a
                        className="quiet-button"
                        href={content.maps}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open directions <ArrowUpRight size={16} />
                      </a>
                    </div>
                    <div className="venue-bottom">
                      {content.features.rsvp && content.rsvp.enabled && (
                        <button
                          className="primary"
                          onClick={() => setRsvp(true)}
                        >
                          Join the celebration · RSVP
                        </button>
                      )}
                      <p className="quiet">
                        Family contact:{" "}
                        {content.contacts.includes("00000") ? (
                          <span>To be confirmed</span>
                        ) : (
                          <a
                            href={
                              "tel:" + content.contacts.replace(/[^+0-9]/g, "")
                            }
                          >
                            {content.contacts}
                          </a>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {chapterStage === "finale" && (
                  <div className="finale-chapter finale-sequence">
                    <p className="eyebrow">WITH FOLDED HANDS & FULL HEARTS</p>
                    <h1
                      ref={chapterStage === stage ? stageTitle : undefined}
                      tabIndex={-1}
                    >
                      <span className="hindi">आप सपरिवार आमंत्रित हैं</span>
                      <em>With love, always.</em>
                    </h1>
                    <p className="hindi closing-copy">{content.closing}</p>
                    <div className="family-names">
                      {content.hosts.map((h, i) => (
                        <p key={i} className="hindi">
                          {h.name}
                          <span>{h.role}</span>
                        </p>
                      ))}
                    </div>
                    <p className="final-jai hindi">॥ जय माता दी ॥</p>
                    <button
                      className="text-button"
                      onClick={() => go("darbar")}
                    >
                      Return to Maa’s Darbar
                    </button>
                  </div>
                )}
              </JourneyLayer>
            ))}
          </AnimatePresence>
          {menu && (
            <nav className="chapter-menu" aria-label="Celebration chapters">
              {content.features.sound && (
                <button
                  className="menu-sound"
                  onClick={sound.toggle}
                  aria-pressed={sound.playing}
                >
                  {sound.playing ? (
                    <Volume2 size={16} />
                  ) : (
                    <VolumeX size={16} />
                  )}
                  Sound {sound.playing ? "On" : "Off"}
                </button>
              )}
              {visible.map((c) => (
                <button
                  key={c.id}
                  onClick={() => go(c.id)}
                  className={stage === c.id ? "active" : ""}
                >
                  {c.label}
                </button>
              ))}
              {content.features.rsvp && content.rsvp.enabled && (
                <button
                  onClick={() => {
                    setMenu(false);
                    setRsvp(true);
                  }}
                >
                  <span>✦</span>Send your RSVP
                </button>
              )}
            </nav>
          )}
          {stage === "opening" ? (
            <footer className="opening-footer">
              <span>{eventDate(content.date).toUpperCase()}</span>
              <span>WITH LOVE FROM OUR FAMILY</span>
            </footer>
          ) : (
            stage !== "transform" && (
              <footer className="journey-footer">
                <div className="chapter-progress" aria-label="Journey progress">
                  {visible.map((c) => (
                    <button
                      key={c.id}
                      className={stage === c.id ? "active" : ""}
                      onClick={() => go(c.id)}
                      aria-label={c.label}
                      aria-current={stage === c.id ? "step" : undefined}
                    />
                  ))}
                </div>
                <div className="journey-bottom">
                  <span className="chapter-label">
                    {visible[index]?.label}
                    <small className="scroll-hint">Scroll to wander</small>
                  </span>
                  {stage !== "finale" && (
                    <button className="next-chapter" onClick={next}>
                      {visible[index + 1]?.label}
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </footer>
            )
          )}
          <AnimatePresence>
            {polaroid !== "idle" && currentMemory && (
              <motion.div
                className="polaroid-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.3 }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) setPolaroid("idle");
                }}
              >
                <motion.div
                  layoutId="memory-polaroid"
                  className="memory-photo polaroid-focus"
                  role="button"
                  tabIndex={0}
                  aria-label={
                    polaroid === "flip"
                      ? "Show the front of the memory"
                      : "Turn the memory over"
                  }
                  transition={{
                    duration: reduced ? 0 : 0.5,
                    ease: [0.22, 0.65, 0.25, 1],
                  }}
                  onClick={() =>
                    setPolaroid(polaroid === "focus" ? "flip" : "focus")
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setPolaroid(polaroid === "focus" ? "flip" : "focus");
                    }
                  }}
                >
                  <div
                    className={`polaroid-inner ${polaroid === "flip" ? "flipped" : ""}`}
                  >
                    <div className="polaroid-face polaroid-front">
                      {currentMemory.type === "video" ? (
                        <video
                          src={currentMemory.url}
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <img
                          src={currentMemory.url}
                          alt={currentMemory.title}
                        />
                      )}
                      <span>
                        {currentMemory.title}
                        {currentMemory.type === "video" && <Play size={20} />}
                      </span>
                      <small className="polaroid-hint">TOUCH TO TURN</small>
                    </div>
                    <div className="polaroid-face polaroid-back">
                      <p className="polaroid-script hindi">यादें</p>
                      <h3>{currentMemory.title}</h3>
                      <p className="polaroid-caption">
                        {currentMemory.caption ||
                          "A little moment, kept forever in our hearts."}
                      </p>
                      {currentMemory.type === "video" && (
                        <button
                          className="quiet-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMemory(currentMemory);
                            setPolaroid("idle");
                          }}
                        >
                          Play the memory
                        </button>
                      )}
                      <small className="polaroid-hint">TOUCH TO RETURN</small>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="toast" role="status" aria-live="polite">
            {notice || sound.error}
          </div>
          {rsvp && (
            <RSVP
              content={content}
              preview={preview}
              onClose={() => setRsvp(false)}
            />
          )}{" "}
          {memory && (
            <MemoryDialog item={memory} onClose={() => setMemory(null)} />
          )}
        </main>
      </SceneScroll>
    </MotionConfig>
  );
}
