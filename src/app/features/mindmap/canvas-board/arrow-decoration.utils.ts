import type { ArrowEndDecoration, Point } from './canvas-scene.model';

/** AABB of decoration in world space. */
export function decorationBounds(d: ArrowEndDecoration): { x: number; y: number; width: number; height: number } {
  if (d.kind === 'circle') {
    const r = d.radius;
    return { x: d.cx - r, y: d.cy - r, width: Math.max(r * 2, 1), height: Math.max(r * 2, 1) };
  }
  return {
    x: d.cx - d.halfW,
    y: d.cy - d.halfH,
    width: Math.max(d.halfW * 2, 1),
    height: Math.max(d.halfH * 2, 1)
  };
}

export function pointInDecoration(p: Point, d: ArrowEndDecoration, tol: number): boolean {
  if (d.kind === 'circle') {
    return Math.hypot(p.x - d.cx, p.y - d.cy) <= d.radius + tol;
  }
  const b = decorationBounds(d);
  return (
    p.x >= b.x - tol &&
    p.x <= b.x + b.width + tol &&
    p.y >= b.y - tol &&
    p.y <= b.y + b.height + tol
  );
}

/** First |dir|=1 ray hit from `start` into `dir` on circle boundary (approaching cx,cy). */
export function rayCircleFirstHit(start: Point, dir: Point, cx: number, cy: number, r: number): Point {
  const ux = start.x - cx;
  const uy = start.y - cy;
  const B = 2 * (ux * dir.x + uy * dir.y);
  const Ceq = ux * ux + uy * uy - r * r;
  const disc = B * B - 4 * Ceq;
  const eps = 1e-4;
  if (disc < 0) {
    const ang = Math.atan2(start.y - cy, start.x - cx);
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang) };
  }
  const s = Math.sqrt(disc);
  const tA = (-B - s) / 2;
  const tB = (-B + s) / 2;
  const candidates = [tA, tB].filter((t) => t > eps);
  const t = candidates.length ? Math.min(...candidates) : Math.max(tA, tB);
  return { x: start.x + dir.x * t, y: start.y + dir.y * t };
}

/** Smallest t >= 0 where start + t*dir hits axis-aligned box (dir must be unit). */
export function rayAabbFirstHit(
  start: Point,
  dir: Point,
  box: { x: number; y: number; width: number; height: number }
): number | null {
  const eps = 1e-6;
  const x0 = box.x;
  const x1 = box.x + box.width;
  const y0 = box.y;
  const y1 = box.y + box.height;
  let tMin = 0;
  let tMax = Infinity;

  const slab = (o: number, d: number, min: number, max: number): boolean => {
    if (Math.abs(d) < eps) {
      if (o < min || o > max) return false;
      return true;
    }
    let t1 = (min - o) / d;
    let t2 = (max - o) / d;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax + eps;
  };

  if (!slab(start.x, dir.x, x0, x1) || !slab(start.y, dir.y, y0, y1)) return null;
  if (tMax < 0) return null;
  const t = tMin >= 0 ? tMin : tMax >= 0 ? tMax : null;
  return t === null || !Number.isFinite(t) ? null : t;
}

export function tipOnDecoration(start: Point, dec: ArrowEndDecoration): Point {
  const dx = dec.cx - start.x;
  const dy = dec.cy - start.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) {
    return { x: start.x, y: start.y };
  }
  const dir = { x: dx / len, y: dy / len };
  if (dec.kind === 'circle') {
    return rayCircleFirstHit(start, dir, dec.cx, dec.cy, dec.radius);
  }
  const box = decorationBounds(dec);
  const t = rayAabbFirstHit(start, dir, box);
  if (t === null || t < 0) {
    return rayCircleFirstHit(start, dir, dec.cx, dec.cy, Math.max(dec.halfW, dec.halfH));
  }
  return { x: start.x + dir.x * t, y: start.y + dir.y * t };
}

/** Tip where a ray from `start` first hits a world-axis-aligned rectangle. */
export function tipOnRectWorld(
  start: Point,
  rect: { x: number; y: number; width: number; height: number }
): Point {
  return tipOnDecoration(start, {
    kind: 'rectangle',
    cx: rect.x + rect.width / 2,
    cy: rect.y + rect.height / 2,
    radius: 0,
    halfW: rect.width / 2,
    halfH: rect.height / 2
  });
}

/** Tip where a ray from `start` first hits a circle boundary toward (cx,cy). */
export function tipOnCircleWorld(start: Point, cx: number, cy: number, r: number): Point {
  return tipOnDecoration(start, { kind: 'circle', cx, cy, radius: r, halfW: 0, halfH: 0 });
}
