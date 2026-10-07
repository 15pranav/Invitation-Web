import assert from "node:assert/strict";
import { AudioDirector } from "../lib/audio-director.ts";
import { sceneSound, resolveSceneSound } from "../lib/scene-audio.ts";
import { seed, contentSchema } from "../lib/content.ts";
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(check) {
  const end = Date.now() + 3000;
  while (!check() && Date.now() < end) await delay(20);
  assert.ok(check(), "Audio transition settled within three seconds");
}
class Param {
  value = 1;
  events = [];
  cancelAndHoldAtTime(t) {
    this.events.push(["hold", t]);
  }
  cancelScheduledValues() {}
  setValueAtTime(v, t) {
    this.value = v;
    this.events.push(["set", v, t]);
  }
  linearRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push(["linear", v, t]);
  }
  exponentialRampToValueAtTime(v, t) {
    this.value = v;
    this.events.push(["exponential", v, t]);
  }
}
class Node {
  gain = new Param();
  frequency = new Param();
  connect() {}
  disconnect() {}
  start() {}
  stop() {
    this.onended?.();
  }
}
class Context {
  currentTime = 10;
  state = "running";
  destination = {};
  gains = [];
  filter = null;
  createGain() {
    const n = new Node();
    this.gains.push(n);
    return n;
  }
  createBiquadFilter() {
    return (this.filter = new Node());
  }
  createMediaElementSource() {
    return new Node();
  }
  createOscillator() {
    return new Node();
  }
  async resume() {}
  async close() {
    this.state = "closed";
  }
}
const media = [];
let maxPlaying = 0;
class Media {
  paused = true;
  currentTime = 0;
  duration = 240;
  plays = 0;
  constructor(url) {
    this.src = url;
    media.push(this);
  }
  async play() {
    this.paused = false;
    this.plays++;
    this.onloadedmetadata?.();
    maxPlaying = Math.max(
      maxPlaying,
      media.filter((x) => !x.paused && x.src).length,
    );
  }
  pause() {
    this.paused = true;
  }
  removeAttribute() {
    this.src = "";
  }
  load() {}
}
const ctx = new Context(),
  errors = [];
const d = new AudioDirector(
  (e) => {
    if (e) errors.push(e);
  },
  () => ctx,
  (url) => new Media(url),
);
const plan = (url) => ({ url, volume: 0.4, crossfade: 0.05 });
d.prepare("birthday.mp3");
d.setScene(plan("opening.mp3"));
assert.equal(media.length, 0, "No assets before interaction");
d.setEnabled(true);
await delay(5);
assert.equal(media.length, 1);
media[0].currentTime = 37;
d.setScene(plan("opening.mp3"));
await delay(5);
assert.equal(media.length, 1, "Same file reused");
assert.equal(media[0].currentTime, 37);
d.bell();
assert.ok(
  ctx.gains[1].gain.events.some((e) => e[0] === "linear" && e[1] === 0.18),
);
assert.ok(
  ctx.gains[1].gain.events.some(
    (e) => e[0] === "linear" && e[1] === 1 && e[2] === 13.4,
  ),
);
d.thin(true);
assert.equal(ctx.filter.frequency.value, 1400);
d.thin(false);
assert.equal(ctx.filter.frequency.value, 20000);
d.prepare("birthday.mp3");
assert.equal(media.at(-1).preload, "metadata");
assert.equal(media.at(-1).paused, true);
const preparedCount = media.length;
d.setScene(plan("birthday.mp3"));
await delay(5);
assert.equal(media.length, preparedCount, "Prepared next scene media reused");
d.setScene(plan("closing.mp3"));
d.setScene(plan("memories.mp3"));
await until(
  () =>
    media.filter((x) => !x.paused && x.src).length === 1 &&
    media.findLast((x) => !x.paused)?.src === "memories.mp3",
);
assert.equal(media.filter((x) => !x.paused && x.src).length, 1);
assert.equal(media.findLast((x) => !x.paused)?.src, "memories.mp3");
assert.ok(maxPlaying <= 2, "Bounded crossfade voices");
d.setScene(plan("opening.mp3"));
await delay(100);
assert.equal(
  media.findLast((x) => x.src === "opening.mp3").currentTime,
  37,
  "Resume previous position",
);
d.setEnabled(false);
d.setScene(plan("closing.mp3"));
await delay(120);
assert.ok(
  media.every((x) => x.paused),
  "Mute survives concurrent chapter update",
);
d.setEnabled(true);
await until(
  () =>
    media.filter((x) => !x.paused && x.src).length === 1 &&
    media.findLast((x) => !x.paused)?.src === "closing.mp3",
);
assert.equal(media.findLast((x) => !x.paused)?.src, "closing.mp3");
d.setScene(plan(""));
await delay(100);
assert.ok(
  media.every((x) => x.paused),
  "Silent closing releases every track",
);
d.dispose();
assert.equal(ctx.state, "closed");
assert.deepEqual(errors, []);
const content = contentSchema.parse(seed);
content.audio.jagran = "opening.mp3";
content.audio.birthday = "birthday.mp3";
const prior = { url: "birthday.mp3", volume: 0.4, crossfade: 1 };
assert.equal(resolveSceneSound(content.audio, "finale", prior).url, "");
assert.equal(
  resolveSceneSound(content.audio, "memories", prior).url,
  "birthday.mp3",
);
content.audio.scenes.finale = {
  ...sceneSound(content.audio, "finale"),
  url: "closing.mp3",
};
assert.equal(
  resolveSceneSound(content.audio, "finale", prior).url,
  "closing.mp3",
);
content.audio.scenes.finale.continuePrevious = true;
assert.equal(
  resolveSceneSound(content.audio, "finale", prior).url,
  "birthday.mp3",
);
content.audio.scenes.finale.enabled = false;
assert.equal(resolveSceneSound(content.audio, "finale", prior).url, "");
assert.equal(
  resolveSceneSound(
    content.audio,
    "venue",
    { url: "closing.mp3", volume: 0.3, crossfade: 1 },
    "finale",
  ).url,
  "birthday.mp3",
  "Backward continuation restores the correct world",
);
assert.equal(
  resolveSceneSound(
    content.audio,
    "memories",
    { url: "opening.mp3", volume: 0.3, crossfade: 1 },
    "ganesh",
  ).url,
  "birthday.mp3",
  "Jump continuation resolves its chapter source",
);
content.audio.scenes.finale.volume = 2;
assert.equal(contentSchema.safeParse(content).success, false);
console.log(
  "PASS scene audio defaults, independent closing, continuation, validation; gesture gate, same-track reuse, resume, rapid navigation, maximum two voices, bell duck/tail, filter recovery, mute/navigation race, silence, disposal.",
);
