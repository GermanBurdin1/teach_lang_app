import type { ArrowElement, CanvasElement, CircleElement, Point, RectElement, TextElement } from './canvas-scene.model';

function normalizeRect(el: RectElement): RectElement {
  const x = el.width < 0 ? el.x + el.width : el.x;
  const y = el.height < 0 ? el.y + el.height : el.y;
  const width = Math.abs(el.width);
  const height = Math.abs(el.height);
  return { ...el, x, y, width, height };
}

function drawArrow(ctx: CanvasRenderingContext2D, start: Point, end: Point): void {
  const headLength = 12;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle - Math.PI / 6), end.y - headLength * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - headLength * Math.cos(angle + Math.PI / 6), end.y - headLength * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

/** Renders snapshot elements in world space (caller sets transform and clears the bitmap). */
export function drawParentContextSnapshotWorld(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  clipWorld: { x: number; y: number; width: number; height: number } | null = null
): void {
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#2563eb';
  ctx.fillStyle = '#0f172a';
  ctx.setLineDash([]);

  if (clipWorld && clipWorld.width > 0 && clipWorld.height > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipWorld.x, clipWorld.y, clipWorld.width, clipWorld.height);
    ctx.clip();
  }

  for (const element of elements) {
    ctx.save();
    if (element.type === 'rectangle') {
      const norm = normalizeRect(element as RectElement);
      ctx.strokeRect(norm.x, norm.y, norm.width, norm.height);
      const raw = norm.innerText ?? '';
      if (raw.trim()) {
        const pad = 6;
        ctx.font = '12px Inter, system-ui, sans-serif';
        ctx.textBaseline = 'top';
        const label = raw.trim().split(/\r?\n/)[0] ?? '';
        const maxW = Math.max(1, norm.width - pad * 2);
        let t = label;
        while (t.length > 1 && ctx.measureText(t + '…').width > maxW) {
          t = t.slice(0, -1);
        }
        if (ctx.measureText(label).width > maxW && t.length > 0) {
          t = t.slice(0, -1) + '…';
        }
        ctx.fillText(t, norm.x + pad, norm.y + pad);
      }
    } else if (element.type === 'circle') {
      const c = element as CircleElement;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, c.r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (element.type === 'arrow') {
      const a = element as ArrowElement;
      drawArrow(ctx, a.start, a.end);
    } else {
      const t = element as TextElement;
      const label = typeof t.text === 'string' ? t.text : '';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText(label, t.x, t.y);
    }
    ctx.restore();
  }

  if (clipWorld && clipWorld.width > 0 && clipWorld.height > 0) {
    ctx.restore();
  }
}
