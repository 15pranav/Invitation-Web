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
