import assert from "node:assert/strict";
import * as THREE from "three";
import { createBalloon, disposeBalloons } from "../app/balloon-model.ts";
import {
  balloonPose,
  BALLOON_TIMING,
  TRANSITION_BALLOON_COUNT,
} from "../app/balloon-motion.ts";
for (const [w, h] of [
  [320, 740],
  [375, 812],
  [1280, 900],
  [1536, 726],
]) {
  const width = (100 * w) / h;
  const camera = new THREE.OrthographicCamera(
    -width / 2,
    width / 2,
    50,
    -50,
    0.1,
    1000,
  );
  camera.position.z = 400;
  camera.updateMatrixWorld();
  const scene = new THREE.Scene();
  const groups = Array.from({ length: TRANSITION_BALLOON_COUNT }, (_, i) => {
    const b = createBalloon(i, true);
    scene.add(b);
    return b;
  });
  for (const age of [1450, 1750, 2050]) {
    groups.forEach((b, i) => {
      const p = balloonPose(i, width, age);
      b.position.set(p.x, p.y, p.z);
      b.scale.setScalar(p.scale);
      b.rotation.z = p.rotation;
    });
    scene.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    let covered = 0,
      total = 0;
    const bodies = groups.map((g) => g.children[0]);
    for (let x = 0; x < 31; x++)
      for (let y = 0; y < 31; y++) {
        ray.setFromCamera(
          new THREE.Vector2(((x + 0.5) / 31) * 2 - 1, ((y + 0.5) / 31) * 2 - 1),
          camera,
        );
        covered += Number(ray.intersectObjects(bodies, false).length > 0);
        total++;
      }
    const ratio = covered / total;
    assert.ok(ratio >= 0.98, w + "x" + h + " " + age + "ms coverage " + ratio);
    console.log(
      w +
        "x" +
        h +
        " " +
        age +
        "ms: " +
        (ratio * 100).toFixed(1) +
        "% balloon silhouette coverage",
    );
  }
  for (let i = 0; i < TRANSITION_BALLOON_COUNT; i++) {
    let prior = -Infinity;
    for (let t = 0; t <= 3600; t += 20) {
      const p = balloonPose(i, width, t);
      assert.ok(p.y >= prior);
      prior = p.y;
    }
    const p = balloonPose(i, width, BALLOON_TIMING.clear);
    assert.ok(p.y - 2.15 * p.scale > 50, "entire string exits before removal");
  }
  disposeBalloons(scene);
}
console.log(
  "Balloon coverage, monotonic rise and complete upward exit passed.",
);

// Verify the resource-sharing and allocation contracts used by the veil.
const template = createBalloon(0, true),
  resourceScene = new THREE.Scene();
resourceScene.add(template.clone(true), template.clone(true));
assert.equal(
  resourceScene.children[0].children[0].geometry,
  resourceScene.children[1].children[0].geometry,
);
assert.equal(
  resourceScene.children[0].children[0].material,
  resourceScene.children[1].children[0].material,
);
let geometryDisposals = 0,
  materialDisposals = 0;
const geometries = new Set(),
  materials = new Set();
resourceScene.traverse((o) => {
  if (o.isMesh) {
    geometries.add(o.geometry);
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
      materials.add(m),
    );
  }
});
geometries.forEach((g) =>
  g.addEventListener("dispose", () => geometryDisposals++),
);
materials.forEach((m) =>
  m.addEventListener("dispose", () => materialDisposals++),
);
disposeBalloons(resourceScene);
assert.equal(
  geometryDisposals,
  geometries.size,
  "shared geometry disposed exactly once",
);
assert.equal(
  materialDisposals,
  materials.size,
  "shared materials disposed exactly once",
);
const reusable = { x: 0, y: 0, z: 0, scale: 1, rotation: 0 };
assert.equal(
  balloonPose(2, 46, 1450, reusable),
  reusable,
  "frame pose object is reused",
);
assert.equal(TRANSITION_BALLOON_COUNT, 25);
assert.deepEqual(BALLOON_TIMING, { cover: 1450, clear: 3600 });
console.log(
  "Shared resources, single disposal, reusable poses and preserved timing passed.",
);
