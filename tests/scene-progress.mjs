import assert from "node:assert/strict";
import { sceneInterval, settleIndex } from "../app/scene-progress.ts";
for (let p = 1; p <= 8; p += 0.01) {
  const a = sceneInterval(p, 9);
  assert.ok(a.from >= 1 && a.to <= 8);
  assert.ok(a.progress >= 0 && a.progress <= 1);
  assert.ok(Math.abs(a.from + a.progress - p) < 1e-9);
}
assert.deepEqual(sceneInterval(3.25, 9), { from: 3, to: 4, progress: 0.25 });
assert.deepEqual(sceneInterval(8, 9), { from: 7, to: 8, progress: 1 });
assert.equal(settleIndex(3.3, 0, 9), 3);
assert.equal(settleIndex(3.7, 0, 9), 4);
assert.equal(settleIndex(3.4, 0.003, 9), 4);
assert.equal(settleIndex(3.6, -0.003, 9), 3);
assert.equal(settleIndex(-99, -2, 9), 1);
assert.equal(settleIndex(99, 2, 9), 8);
console.log(
  "Scroll interval continuity, bidirectional settling, flick projection and boundaries passed.",
);

const { gestureTarget } = await import("../app/scene-progress.ts");
const target = (px, v = 0, retreat = 0) =>
  gestureTarget(3, 3 + px / 812, v, retreat, 9, 812);
assert.equal(target(5, 0.8), 3, "tiny movement is ignored");
assert.equal(target(30), 4, "light deliberate drag advances");
assert.equal(target(-30), 2, "backward uses the same threshold");
assert.equal(target(12, 0.4), 4, "short fast flick advances");
assert.equal(target(12, 0.1), 3, "slow near-start release returns");
assert.equal(target(81, -0.2, 162), 3, "clear reversal returns to origin");
assert.equal(target(81, 0, 162), 3, "reversed then held returns to origin");
assert.equal(target(3000, 4), 4, "one scene only");
assert.equal(gestureTarget(1, 0.8, -1, 0, 9, 812), 1);
assert.equal(gestureTarget(8, 8.4, 1, 0, 9, 812), 8);
console.log(
  "Light intent, fast flick, accidental motion, reversal and one-scene bounds passed.",
);

const {gestureInterval}=await import('../app/scene-progress.ts');
assert.deepEqual(gestureInterval(4,3,9),{from:3,to:4,progress:1},'endpoint keeps incoming scene mounted');
assert.deepEqual(gestureInterval(3.3,3,9),{from:3,to:4,progress:3.3-3});
assert.deepEqual(gestureInterval(3.1,3,9),{from:3,to:4,progress:3.1-3});
assert.deepEqual(gestureInterval(2.8,3,9),{from:2,to:3,progress:2.8-2});
