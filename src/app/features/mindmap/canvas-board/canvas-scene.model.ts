/** World-space AABB of the portal on the parent canvas (snapshot at child creation). */
export interface ParentFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ParentFrame {
  parentSceneId: string;
  parentElementId: string;
  /** Optional label (e.g. parent scene title) for debugging / future UI. */
  parentSceneTitle?: string;
  rect: ParentFrameRect;
}

/**
 * Frozen view of the parent canvas around what was visible at capture time:
 * world-space viewport (`bounds`) matching the context widget aspect, and elements intersecting it.
 */
export interface ParentContextSnapshot {
  version: 1;
  /** World-space copies in the parent scene coordinate system at capture time. */
  elements: CanvasElement[];
  /** World-space rectangle shown in the preview (center = viewport center on the parent). */
  bounds: { x: number; y: number; width: number; height: number };
  /** When the snapshot was taken (ISO). */
  capturedAt: string;
}

export interface Point {
  x: number;
  y: number;
}

/** Persisted canvas primitives; every variant may act as a portal. */
export interface RectElement {
  id: string;
  type: 'rectangle';
  x: number;
  y: number;
  width: number;
  height: number;
  /** Multi-line text shown inside the rectangle (world-space, clipped to bounds). */
  innerText?: string;
  childSceneIds: string[];
}

export interface CircleElement {
  id: string;
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
  childSceneIds: string[];
}

/** Legacy embedded tip shape (JSON v1); migrated to separate circle/rect + endAttach. */
export interface ArrowEndDecoration {
  kind: 'circle' | 'rectangle';
  cx: number;
  cy: number;
  radius: number;
  halfW: number;
  halfH: number;
}

export interface ArrowAttachRef {
  elementId: string;
}

export interface ArrowElement {
  id: string;
  type: 'arrow';
  start: Point;
  end: Point;
  childSceneIds: string[];
  /** Arrow start snaps to anchor on this element (rect / text / circle). */
  startAttach?: ArrowAttachRef;
  /** Arrow end snaps to boundary of this element toward start. */
  endAttach?: ArrowAttachRef;
  /** @deprecated Migrated to separate element + endAttach */
  endDecoration?: ArrowEndDecoration;
}

export interface TextElement {
  id: string;
  type: 'text';
  x: number;
  y: number;
  text: string;
  childSceneIds: string[];
}

export type CanvasElement = RectElement | CircleElement | ArrowElement | TextElement;

export interface CanvasInnerDocument {
  elements: CanvasElement[];
  /** Full bitmap size (matches HTML canvas width/height). */
  sheetWidth: number;
  sheetHeight: number;
  baseCanvasWidth: number;
  baseCanvasHeight: number;
  extraLeft: number;
  extraRight: number;
  extraTop: number;
  extraBottom: number;
  scale: number;
  panX: number;
  panY: number;
  /** Show diagram grid (draw.io-style). */
  gridEnabled?: boolean;
  /** Grid cell size in typographic pt (converted to world px at render). */
  gridSizePt?: number;
  /** CSS color for grid lines. */
  gridColor?: string;
  /** Sheet background fill behind the grid. */
  sheetBackgroundColor?: string;
}

export interface CanvasSceneNode {
  id: string;
  title: string;
  outlineNumber: string;
  parentSceneId: string | null;
  parentElementId: string | null;
  parentFrame: ParentFrame | null;
  /** Optional: portal neighborhood on the parent (for embedded preview in the child scene). */
  parentContextSnapshot?: ParentContextSnapshot | null;
  createdAt: string;
  innerDocument: CanvasInnerDocument;
}

export interface CanvasScenesFile {
  version: 1;
  rootIds: string[];
  scenes: Record<string, CanvasSceneNode>;
}
