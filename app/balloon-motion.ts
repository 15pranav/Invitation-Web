export const BALLOON_TIMING = { cover: 1450, clear: 3600 };
export const TRANSITION_BALLOON_COUNT = 25;
export type BalloonPose = {
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number;
};
const mix = (a: number, b: number, q: number) =>
  a + (b - a) * q * q * (3 - 2 * q);
export function balloonPose(
  i: number,
  width: number,
  age: number,
  out: BalloonPose = { x: 0, y: 0, z: 0, scale: 1, rotation: 0 },
) {
  const diameter = Math.max(width * 0.46, 44);
  const size = i % 5 === 0 ? 0.78 : i % 7 === 1 ? 1.19 : 1;
  const offset =
    age < 1450
      ? mix(-240, 0, age / 1450)
      : age < 2050
        ? mix(0, 8, (age - 1450) / 600)
        : mix(8, diameter * 4 + 100, Math.min(1, (age - 2050) / 1550));
  const approach =
    0.84 +
    0.16 * Math.min(1, age / 1450) +
    0.08 * Math.max(0, (age - 2050) / 1550);
  out.x = ((i % 5) / 4 - 0.5) * width + Math.sin(i * 2.4) * width * 0.018;
  out.y = (Math.floor(i / 5) - 2) * diameter * 0.6 + offset;
  out.z = size < 1 ? 0 : size > 1 ? 36 : 18;
  out.scale = (diameter / 1.1) * size * approach;
  out.rotation = Math.sin(i * 1.7 + age * 0.00035) * 0.055;
  return out;
}
