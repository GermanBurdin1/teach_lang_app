/** Typographic pt → world pixels at 96 DPI (same basis as draw.io grid spacing). */
export function gridPtToWorld(pt: number): number {
  return pt * (96 / 72);
}

export interface CanvasGridStyle {
  enabled: boolean;
  sizePt: number;
  color: string;
  /** Draw a thicker major line every N minor cells (draw.io-style). */
  majorEvery?: number;
}

/** Draws minor + major grid lines in world space; `ctx` must already have pan/zoom transform. */
export function drawWorldGrid(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  panX: number,
  panY: number,
  style: CanvasGridStyle
): void {
  if (!style.enabled || style.sizePt < 1) {
    return;
  }
  const step = gridPtToWorld(style.sizePt);
  if (step < 0.5) {
    return;
  }
  const majorEvery = style.majorEvery ?? 10;

  const screenToWorld = (p: { x: number; y: number }) => ({
    x: (p.x - panX) / scale,
    y: (p.y - panY) / scale
  });

  const tl = screenToWorld({ x: 0, y: 0 });
  const br = screenToWorld({ x: canvasWidth, y: canvasHeight });
  const left = Math.min(tl.x, br.x);
  const right = Math.max(tl.x, br.x);
  const top = Math.min(tl.y, br.y);
  const bottom = Math.max(tl.y, br.y);

  const xStart = Math.floor(left / step) * step;
  const yStart = Math.floor(top / step) * step;

  const minorW = 1 / Math.max(scale, 0.05);
  const majorW = 1.75 / Math.max(scale, 0.05);

  const strokeMinor = () => {
    ctx.strokeStyle = style.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = minorW;
    ctx.beginPath();
    let i = 0;
    for (let x = xStart; x <= right + step * 0.001; x += step, i++) {
      if (i % majorEvery === 0) continue;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    i = 0;
    for (let y = yStart; y <= bottom + step * 0.001; y += step, i++) {
      if (i % majorEvery === 0) continue;
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();
  };

  const strokeMajor = () => {
    ctx.strokeStyle = style.color;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = majorW;
    ctx.beginPath();
    let i = 0;
    for (let x = xStart; x <= right + step * 0.001; x += step, i++) {
      if (i % majorEvery !== 0) continue;
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    i = 0;
    for (let y = yStart; y <= bottom + step * 0.001; y += step, i++) {
      if (i % majorEvery !== 0) continue;
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.stroke();
  };

  ctx.save();
  ctx.setLineDash([]);
  strokeMinor();
  strokeMajor();
  ctx.globalAlpha = 1;
  ctx.restore();
}
