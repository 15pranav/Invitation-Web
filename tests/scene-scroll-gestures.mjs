import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
// Exercise the actual component listeners with a deterministic event clock.
let now = 0,
  serial = 0;
const jobs = new Map();
const schedule = (fn, delay) => {
  const id = ++serial;
  jobs.set(id, { at: now + delay, fn });
  return id;
};
const advance = (ms) => {
  const end = now + ms;
  for (;;) {
    const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0];
    if (!next || next[1].at > end) break;
    jobs.delete(next[0]);
    now = next[1].at;
    next[1].fn(now);
  }
  now = end;
};
class Element {
  constructor(control = false) {
    this.control = control;
  }
  closest(selector) {
    return this.control && selector.includes("button") ? this : null;
  }
}
class Rail extends Element {
  scrollTop = 3 * 812;
  clientHeight = 812;
  listeners = new Map();
  addEventListener(n, f) {
    this.listeners.set(n, f);
  }
  removeEventListener(n) {
    this.listeners.delete(n);
  }
  emit(n, e = {}) {
    this.listeners.get(n)?.({
      target: this,
      type: n,
      preventDefault() {
        this.prevented = true;
      },
      ...e,
    });
  }
}
const rail = new Rail(),
  effects = [],
  navigation = [],
  progress = [];
let refs = 0;
const react = {
  useRef: (v) => ({ current: refs++ === 0 ? rail : v }),
  useEffect: (f) => effects.push(f),
};
const jsx = {
  jsx: (type, props) => ({ type, props }),
  jsxs: (type, props) => ({ type, props }),
};
const compile = (path, require) => {
  const compiledModule = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  vm.runInNewContext(js, {
    module: compiledModule,
    exports: compiledModule.exports,
    require,
    Element,
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
    performance: { now: () => now },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (f) => schedule(f, 16),
    cancelAnimationFrame: (id) => jobs.delete(id),
    setTimeout: schedule,
    clearTimeout: (id) => jobs.delete(id),
  });
  return compiledModule.exports;
};
const model = compile("app/scene-progress.ts", () => {});
const Scroll = compile("app/scene-scroll.tsx", (name) =>
  name === "react" ? react : name === "react/jsx-runtime" ? jsx : model,
).default;
Scroll({
  stage: "s3",
  chapters: Array.from({ length: 8 }, (_, i) => ({
    id: "s" + (i + 1),
    label: "",
  })),
  active: true,
  blocked: false,
  onNavigate: (id) => navigation.push(id),
  onProgress: (p) => progress.push(p),
  children: null,
});
const cleanups = effects.map((f) => f());
const start = (y = 500, target = rail) =>
  rail.emit("touchstart", { target, touches: [{ clientX: 200, clientY: y }] });
const move = (y, ms = 40) => {
  advance(ms);
  rail.emit("touchmove", { touches: [{ clientX: 200, clientY: y }] });
};
const end = () => {
  rail.emit("touchend", { touches: [] });
  advance(750);
};
start();
move(496);
end();
assert.equal(navigation.length, 0, "4px accidental movement does not navigate");
start();
move(468, 120);
advance(16);
assert.ok(
  Math.abs(progress.at(-1).progress - 32 / 812) < 0.001,
  "drag follows finger distance",
);
end();
assert.equal(navigation.at(-1), "s4", "32px light swipe advances");
start();
move(532, 120);
end();
assert.equal(navigation.at(-1), "s3", "backward light swipe advances equally");
start();
move(488, 20);
end();
assert.equal(navigation.at(-1), "s4", "12px fast flick advances");
start();
move(256, 180);
advance(16);
const peak = progress.at(-1).progress;
move(419, 100);
advance(16);
assert.ok(
  progress.at(-1).progress < peak,
  "dragging backward reverses visible progress",
);
end();
assert.equal(navigation.at(-1), "s4", "clear reversal settles back");
start();
move(-1800, 200);
advance(16);
assert.equal(progress.at(-1).to, "s5");
assert.equal(progress.at(-1).progress, 1);
end();
assert.equal(navigation.at(-1), "s5", "large swipe advances only one scene");
const n = navigation.length;
start(500, new Element(true));
move(100);
end();
assert.equal(navigation.length, n, "button gestures retain ownership");
rail.scrollTop += 80;
rail.emit("scroll");
assert.equal(
  rail.scrollTop,
  5 * 812,
  "focus-induced scroll cannot become a gesture",
);
rail.emit("wheel");
rail.scrollTop += 36;
rail.emit("scroll");
advance(850);
assert.equal(navigation.at(-1), "s6", "light wheel input still navigates");
start();
move(470);
rail.emit("touchcancel", { touches: [] });
advance(750);
assert.equal(navigation.at(-1), "s6", "cancel settles safely to its anchor");
cleanups.forEach((f) => f?.());
assert.equal(rail.listeners.size, 0, "listeners removed on unmount");
console.log(
  "PASS actual scroll listeners: accidental movement, light/fast/backward swipe, reversible progress, one-scene limit, controls, focus, wheel, cancel, cleanup.",
);
