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
}

export interface CanvasSceneNode {
  id: string;
  title: string;
  outlineNumber: string;
  parentSceneId: string | null;
  parentElementId: string | null;
  parentFrame: ParentFrame | null;
  createdAt: string;
  innerDocument: CanvasInnerDocument;
}

export interface CanvasScenesFile {
  version: 1;
  rootIds: string[];
  scenes: Record<string, CanvasSceneNode>;
}
