import type { ArrowElement, CanvasElement, RectElement } from './canvas-scene.model';
import type { Point } from './canvas-scene.model';

export type QuickConnectDirection = 'north' | 'south' | 'east' | 'west';
export type QuickConnectShapeKind = 'rectangle' | 'rounded-rectangle' | 'circle' | 'diamond';

export const QUICK_CONNECT_DIRECTIONS: QuickConnectDirection[] = ['north', 'south', 'east', 'west'];

export const QUICK_CONNECT_SHAPES: { kind: QuickConnectShapeKind; title: string }[] = [
  { kind: 'rectangle', title: 'Rectangle' },
  { kind: 'rounded-rectangle', title: 'Rectangle arrondi' },
  { kind: 'circle', title: 'Cercle' },
  { kind: 'diamond', title: 'Losange' }
];

export function isQuickConnectSource(el: CanvasElement): boolean {
  return el.type === 'rectangle' || el.type === 'circle' || el.type === 'text';
}

export interface QuickConnectPlacement {
  tail: CanvasElement;
  arrow: ArrowElement;
}

export function createQuickConnectedPair(
  sourceId: string,
  sourceBounds: { x: number; y: number; width: number; height: number },
  direction: QuickConnectDirection,
  shapeKind: QuickConnectShapeKind,
  stackIndex: number
): QuickConnectPlacement {
  const gap = 88;
  const stackPitch = 36;
  const lateral = stackIndex * stackPitch;
  const bx = sourceBounds.x;
  const by = sourceBounds.y;
  const bw = sourceBounds.width;
  const bh = sourceBounds.height;
  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  const tailId = crypto.randomUUID();
  const arrowId = crypto.randomUUID();
  let tail: CanvasElement;
  let start: Point;
  let end: Point;

  const rectTail = (centerX: number, centerY: number, w: number, h: number): RectElement => ({
    id: tailId,
    type: 'rectangle',
    x: centerX - w / 2,
    y: centerY - h / 2,
    width: w,
    height: h,
    innerText: '',
    childSceneIds: []
  });

  if (direction === 'north') {
    const th = shapeKind === 'diamond' ? 36 : 28;
    const tw = shapeKind === 'diamond' ? 36 : 44;
    const centerY = by - gap - th / 2;
    const centerX = cx + lateral;
    tail = shapeKind === 'circle' ? { id: tailId, type: 'circle', cx: centerX, cy: centerY, r: 14, childSceneIds: [] } : rectTail(centerX, centerY, tw, th);
    start = { x: cx + lateral, y: by };
    end = { x: centerX, y: centerY + (shapeKind === 'circle' ? 14 : th / 2) };
  } else if (direction === 'south') {
    const th = shapeKind === 'diamond' ? 36 : 28;
    const tw = shapeKind === 'diamond' ? 36 : 44;
    const centerY = by + bh + gap + th / 2;
    const centerX = cx + lateral;
    tail = shapeKind === 'circle' ? { id: tailId, type: 'circle', cx: centerX, cy: centerY, r: 14, childSceneIds: [] } : rectTail(centerX, centerY, tw, th);
    start = { x: cx + lateral, y: by + bh };
    end = { x: centerX, y: centerY - (shapeKind === 'circle' ? 14 : th / 2) };
  } else if (direction === 'east') {
    const tw = shapeKind === 'diamond' ? 36 : 44;
    const th = shapeKind === 'diamond' ? 36 : 28;
    const centerX = bx + bw + gap + tw / 2;
    const centerY = cy + lateral;
    tail = shapeKind === 'circle' ? { id: tailId, type: 'circle', cx: centerX, cy: centerY, r: 14, childSceneIds: [] } : rectTail(centerX, centerY, tw, th);
    start = { x: bx + bw, y: cy + lateral };
    end = { x: centerX - (shapeKind === 'circle' ? 14 : tw / 2), y: centerY };
  } else {
    const tw = shapeKind === 'diamond' ? 36 : 44;
    const th = shapeKind === 'diamond' ? 36 : 28;
    const centerX = bx - gap - tw / 2;
    const centerY = cy + lateral;
    tail = shapeKind === 'circle' ? { id: tailId, type: 'circle', cx: centerX, cy: centerY, r: 14, childSceneIds: [] } : rectTail(centerX, centerY, tw, th);
    start = { x: bx, y: cy + lateral };
    end = { x: centerX + (shapeKind === 'circle' ? 14 : tw / 2), y: centerY };
  }

  const arrow: ArrowElement = {
    id: arrowId,
    type: 'arrow',
    start,
    end,
    childSceneIds: [],
    startAttach: { elementId: sourceId },
    endAttach: { elementId: tailId }
  };

  return { tail, arrow };
}

/** Place a detached shape centered at a world point (drag-drop from palette). */
export function createQuickConnectTailAt(
  shapeKind: QuickConnectShapeKind,
  world: Point
): CanvasElement {
  const id = crypto.randomUUID();
  if (shapeKind === 'circle') {
    return { id, type: 'circle', cx: world.x, cy: world.y, r: 14, childSceneIds: [] };
  }
  const size = shapeKind === 'diamond' ? 36 : shapeKind === 'rounded-rectangle' ? 44 : 44;
  const h = shapeKind === 'diamond' ? 36 : 28;
  return {
    id,
    type: 'rectangle',
    x: world.x - size / 2,
    y: world.y - h / 2,
    width: size,
    height: h,
    innerText: '',
    childSceneIds: []
  };
}
