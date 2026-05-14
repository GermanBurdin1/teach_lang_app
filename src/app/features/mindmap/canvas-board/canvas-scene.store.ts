import { Injectable } from '@angular/core';
import type {
  ArrowElement,
  CanvasElement,
  CircleElement,
  CanvasInnerDocument,
  CanvasSceneNode,
  CanvasScenesFile,
  ParentFrame
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

    return [base];
  });
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
    const outlineNumber = this.computeNextOutlineNumber(params.parentSceneId);
    const id = crypto.randomUUID();
    const node: CanvasSceneNode = {
      id,
      title: params.title.trim(),
      outlineNumber,
      parentSceneId: params.parentSceneId,
      parentElementId: params.parentElementId,
      parentFrame: params.parentFrame,
      createdAt: new Date().toISOString(),
      innerDocument: emptyInnerDocument()
    };
    this.scenes.set(id, node);

    const doc = parent.innerDocument;
    const elements = normalizeCanvasElements(doc.elements);
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
      this.scenes.set(id, n);
    }
  }
}
