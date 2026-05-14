import { Injectable } from '@angular/core';
import type {
  ArrowElement,
  CanvasElement,
  CircleElement,
  CanvasInnerDocument,
  CanvasSceneNode,
  CanvasScenesFile,
  ParentContextSnapshot,
  ParentFrame,
  RectElement,
  TextElement
} from './canvas-scene.model';
import { tipOnDecoration } from './arrow-decoration.utils';

function emptyInnerDocument(): CanvasInnerDocument {
  return {
    elements: [],
    sheetWidth: 0,
    sheetHeight: 0,
    baseCanvasWidth: 0,
    baseCanvasHeight: 0,
    extraLeft: 0,
    extraRight: 0,
    extraTop: 0,
    extraBottom: 0,
    scale: 1,
    panX: 0,
    panY: 0
  };
}

/** Ensure persisted elements have childSceneIds (migration / defaults). */
export function normalizeCanvasElements(elements: CanvasElement[]): CanvasElement[] {
  return elements.flatMap((el) => {
    let base: CanvasElement = el;
    if (!('childSceneIds' in base) || !Array.isArray((base as CanvasElement & { childSceneIds?: string[] }).childSceneIds)) {
      base = { ...base, childSceneIds: [] } as CanvasElement;
    }

    if (base.type === 'circle') {
      const c = base as CircleElement;
      return [
        {
          ...c,
          r: Math.max(1, Number(c.r) || 14),
          childSceneIds: Array.isArray(c.childSceneIds) ? c.childSceneIds : []
        }
      ];
    }

    if (base.type === 'arrow') {
      const a = base as ArrowElement;
      if (a.endDecoration && a.endAttach) {
        const { endDecoration: _ed, ...rest } = a;
        return [{ ...rest } as CanvasElement];
      }
      if (a.endDecoration && !a.endAttach) {
        const d = a.endDecoration;
        const tid = crypto.randomUUID();
        const { endDecoration: _ed2, ...rest } = a;
        let tail: CanvasElement;
        if (d.kind === 'circle') {
          tail = {
            id: tid,
            type: 'circle',
            cx: d.cx,
            cy: d.cy,
            r: Math.max(2, Number(d.radius) || 14),
            childSceneIds: []
          };
        } else {
          const hw = Math.max(2, Number(d.halfW) || 22);
          const hh = Math.max(2, Number(d.halfH) || 14);
          tail = {
            id: tid,
            type: 'rectangle',
            x: d.cx - hw,
            y: d.cy - hh,
            width: hw * 2,
            height: hh * 2,
            innerText: '',
            childSceneIds: []
          };
        }
        const updated: ArrowElement = {
          ...(rest as ArrowElement),
          endAttach: { elementId: tid },
          end: tipOnDecoration(rest.start, d)
        };
        return [updated, tail];
      }
    }

    if (base.type === 'rectangle') {
      const r = base as RectElement;
      if (typeof r.innerText !== 'string') {
        base = { ...r, innerText: '' } as CanvasElement;
      }
    }

    return [base];
  });
}

function normalizeRectForBounds(el: RectElement): RectElement {
  const x = el.width < 0 ? el.x + el.width : el.x;
  const y = el.height < 0 ? el.y + el.height : el.y;
  const width = Math.abs(el.width);
  const height = Math.abs(el.height);
  return { ...el, x, y, width, height };
}

function worldBoundsForSnapshot(el: CanvasElement): { x: number; y: number; width: number; height: number } {
  if (el.type === 'rectangle') {
    const r = normalizeRectForBounds(el as RectElement);
    return { x: r.x, y: r.y, width: r.width, height: r.height };
  }
  if (el.type === 'circle') {
    const c = el as CircleElement;
    const d = 2 * c.r;
    return { x: c.cx - c.r, y: c.cy - c.r, width: Math.max(d, 1), height: Math.max(d, 1) };
  }
  if (el.type === 'arrow') {
    const a = el as ArrowElement;
    const tip = a.end;
    const minX = Math.min(a.start.x, tip.x);
    const minY = Math.min(a.start.y, tip.y);
    const maxX = Math.max(a.start.x, tip.x);
    const maxY = Math.max(a.start.y, tip.y);
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  }
  const t = el as TextElement;
  const width = Math.max(50, t.text.length * 8);
  const height = 20;
  return { x: t.x, y: t.y - height, width, height };
}

function unionWorldBounds(boxes: { x: number; y: number; width: number; height: number }[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (!boxes.length) {
    return { x: 0, y: 0, width: 1, height: 1 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const b of boxes) {
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

function collectOutgoingPortalNeighborhoodIds(elements: CanvasElement[], portalId: string): Set<string> {
  const ids = new Set<string>();
  const byId = new Map(elements.map((e) => [e.id, e]));
  if (!byId.has(portalId)) {
    return ids;
  }
  ids.add(portalId);
  for (const e of elements) {
    if (e.type !== 'arrow') {
      continue;
    }
    const a = e as ArrowElement;
    /** Only arrows that *leave* the portal (`startAttach`), not incoming (`endAttach` only). */
    if (a.startAttach?.elementId !== portalId) {
      continue;
    }
    ids.add(a.id);
    if (a.endAttach?.elementId && a.endAttach.elementId !== portalId) {
      ids.add(a.endAttach.elementId);
    }
  }
  return ids;
}

/** Subset of elements: portal + outgoing arrows + their far-end shapes (same rule as parent snapshot). */
export function pickOutgoingNeighborhoodElements(elements: CanvasElement[], portalId: string): CanvasElement[] {
  const norm = normalizeCanvasElements(elements);
  const idSet = collectOutgoingPortalNeighborhoodIds(norm, portalId);
  return norm.filter((e) => idSet.has(e.id));
}

function stripChildSceneIds(elements: CanvasElement[]): CanvasElement[] {
  return elements.map((e) => ({ ...e, childSceneIds: [] as string[] }));
}

/**
 * Portal + arrows that **start** on the portal (`startAttach`) + far-end shapes of those arrows.
 * Incoming arrows (`endAttach` only) are excluded so unrelated nearby shapes are not pulled in.
 */
export function buildParentContextSnapshot(elements: CanvasElement[], portalId: string): ParentContextSnapshot | null {
  const normalized = normalizeCanvasElements(elements);
  const idSet = collectOutgoingPortalNeighborhoodIds(normalized, portalId);
  if (!idSet.size) {
    return null;
  }
  const picked = normalized.filter((e) => idSet.has(e.id));
  const stripped = stripChildSceneIds(picked);
  const cloned = JSON.parse(JSON.stringify(stripped)) as CanvasElement[];
  const again = normalizeCanvasElements(cloned);
  const bounds = unionWorldBounds(again.map(worldBoundsForSnapshot));
  return {
    version: 1,
    elements: again,
    bounds,
    capturedAt: new Date().toISOString()
  };
}

@Injectable({ providedIn: 'root' })
export class CanvasSceneStore {
  private readonly scenes = new Map<string, CanvasSceneNode>();
  private rootIds: string[] = [];

  getScene(id: string): CanvasSceneNode | undefined {
    return this.scenes.get(id);
  }

  listRootIds(): string[] {
    return [...this.rootIds];
  }

  listChildren(parentSceneId: string): CanvasSceneNode[] {
    return [...this.scenes.values()].filter((n) => n.parentSceneId === parentSceneId);
  }

  getBreadcrumb(sceneId: string): { id: string; title: string; outlineNumber: string }[] {
    const chain: { id: string; title: string; outlineNumber: string }[] = [];
    let cur: CanvasSceneNode | undefined = this.scenes.get(sceneId);
    while (cur) {
      chain.push({ id: cur.id, title: cur.title, outlineNumber: cur.outlineNumber });
      cur = cur.parentSceneId ? this.scenes.get(cur.parentSceneId) : undefined;
    }
    return chain.reverse();
  }

  /** Next outline string for a new child of parentSceneId (null = new root). */
  previewNextOutlineNumber(parentSceneId: string | null): string {
    return this.computeNextOutlineNumber(parentSceneId);
  }

  private computeNextOutlineNumber(parentSceneId: string | null): string {
    if (parentSceneId === null) {
      let max = 0;
      for (const id of this.rootIds) {
        const n = this.scenes.get(id);
        if (!n) continue;
        const v = parseInt(n.outlineNumber, 10);
        if (!Number.isNaN(v)) max = Math.max(max, v);
      }
      return String(max + 1 || 1);
    }
    const parent = this.scenes.get(parentSceneId);
    if (!parent) return '1';
    const prefix = `${parent.outlineNumber}.`;
    let maxK = 0;
    for (const n of this.scenes.values()) {
      if (n.parentSceneId !== parentSceneId) continue;
      if (!n.outlineNumber.startsWith(prefix)) continue;
      const rest = n.outlineNumber.slice(prefix.length);
      const k = parseInt(rest, 10);
      if (!Number.isNaN(k)) maxK = Math.max(maxK, k);
    }
    return `${parent.outlineNumber}.${maxK + 1}`;
  }

  /**
   * Ensures at least one root scene exists; returns its id.
   */
  ensureDefaultRootScene(): string {
    if (this.rootIds.length > 0) {
      const first = this.rootIds[0];
      if (this.scenes.has(first)) return first;
    }
    const id = crypto.randomUUID();
    const node: CanvasSceneNode = {
      id,
      title: 'Canvas',
      outlineNumber: '1',
      parentSceneId: null,
      parentElementId: null,
      parentFrame: null,
      createdAt: new Date().toISOString(),
      innerDocument: emptyInnerDocument()
    };
    this.scenes.set(id, node);
    this.rootIds = [id];
    return id;
  }

  createChildScene(params: {
    parentSceneId: string;
    parentElementId: string;
    title: string;
    parentFrame: ParentFrame;
  }): CanvasSceneNode {
    const parent = this.scenes.get(params.parentSceneId);
    if (!parent) {
      throw new Error('Parent scene not found');
    }
    const doc = parent.innerDocument;
    const elements = normalizeCanvasElements(doc.elements);
    const outlineNumber = this.computeNextOutlineNumber(params.parentSceneId);
    const id = crypto.randomUUID();
    const snapshot = buildParentContextSnapshot(elements, params.parentElementId);
    const node: CanvasSceneNode = {
      id,
      title: params.title.trim(),
      outlineNumber,
      parentSceneId: params.parentSceneId,
      parentElementId: params.parentElementId,
      parentFrame: params.parentFrame,
      parentContextSnapshot: snapshot,
      createdAt: new Date().toISOString(),
      innerDocument: emptyInnerDocument()
    };
    this.scenes.set(id, node);

    const el = elements.find((e) => e.id === params.parentElementId);
    if (el) {
      const ids = [...el.childSceneIds, id];
      const updated = elements.map((e) => (e.id === params.parentElementId ? { ...e, childSceneIds: ids } : e));
      parent.innerDocument = { ...doc, elements: updated };
    }
    this.scenes.set(params.parentSceneId, parent);
    return node;
  }

  patchSceneInnerDocument(sceneId: string, patch: Partial<CanvasInnerDocument>): void {
    const n = this.scenes.get(sceneId);
    if (!n) return;
    n.innerDocument = { ...n.innerDocument, ...patch };
    if (patch.elements) {
      n.innerDocument.elements = normalizeCanvasElements(patch.elements);
    }
    this.scenes.set(sceneId, n);
  }

  exportJson(): string {
    const file: CanvasScenesFile = {
      version: 1,
      rootIds: [...this.rootIds],
      scenes: Object.fromEntries(this.scenes)
    };
    return JSON.stringify(file, null, 2);
  }

  importJson(json: string): void {
    const data = JSON.parse(json) as CanvasScenesFile;
    if (data.version !== 1 || !data.scenes || !Array.isArray(data.rootIds)) {
      throw new Error('Invalid scenes file');
    }
    this.scenes.clear();
    this.rootIds = [...data.rootIds];
    for (const [id, node] of Object.entries(data.scenes)) {
      const n = node as CanvasSceneNode;
      const inner = n.innerDocument;
      n.innerDocument = {
        elements: normalizeCanvasElements(inner?.elements ?? []),
        sheetWidth: inner?.sheetWidth ?? 0,
        sheetHeight: inner?.sheetHeight ?? 0,
        baseCanvasWidth: inner?.baseCanvasWidth ?? 0,
        baseCanvasHeight: inner?.baseCanvasHeight ?? 0,
        extraLeft: inner?.extraLeft ?? 0,
        extraRight: inner?.extraRight ?? 0,
        extraTop: inner?.extraTop ?? 0,
        extraBottom: inner?.extraBottom ?? 0,
        scale: inner?.scale && inner.scale > 0 ? inner.scale : 1,
        panX: inner?.panX ?? 0,
        panY: inner?.panY ?? 0
      };
      const snap = n.parentContextSnapshot;
      if (snap && snap.version === 1 && Array.isArray(snap.elements)) {
        n.parentContextSnapshot = {
          ...snap,
          elements: normalizeCanvasElements(snap.elements)
        };
      } else if (snap && (!Array.isArray(snap.elements) || snap.version !== 1)) {
        n.parentContextSnapshot = null;
      }
      this.scenes.set(id, n);
    }
  }
}
