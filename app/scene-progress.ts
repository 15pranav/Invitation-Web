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

// Pixel thresholds distinguish taps from intentional light scene gestures.
export function gestureTarget(
  anchor: number,
  page: number,
  velocityPx: number,
  retreatPx: number,
  count: number,
  height: number,
) {
  const distance = (page - anchor) * height,
    direction = Math.sign(distance);
  const threshold = clamp(height * 0.035, 18, 32);
  const reversed = retreatPx >= 18 && velocityPx * direction <= 0;
  const intent =
    Math.abs(distance) >= threshold ||
    (Math.abs(distance) >= 8 && velocityPx * direction >= 0.25);
  return clamp(anchor + (intent && !reversed ? direction : 0), 1, count - 1);
}

export function gestureInterval(page:number,anchor:number,count:number) {
 const from=clamp(page<anchor?anchor-1:anchor,1,count-2);
 return {from,to:from+1,progress:clamp(page-from,0,1)};
}
