export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
export function sceneInterval(page: number, count: number) {
  const p = clamp(page, 1, count - 1),
    from = Math.min(count - 2, Math.floor(p));
  return { from, to: from + 1, progress: p - from };
}
export function settleIndex(page: number, velocity: number, count: number) {
  // A short projection helps deliberate flicks without skipping chapters.
  return clamp(
    Math.round(page + clamp(velocity * 90, -0.18, 0.18)),
    1,
    count - 1,
  );
}
