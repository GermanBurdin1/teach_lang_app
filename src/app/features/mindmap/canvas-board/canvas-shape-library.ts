import type { ArrowElement, CanvasElement, CircleElement, RectElement, TextElement } from './canvas-scene.model';
import type { Point } from './canvas-scene.model';

/** Kinds shown in the double-click insert palette (draw.io-style). */
export type ShapeInsertKind =
  | 'text'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'rounded-rectangle'
  | 'parallelogram'
  | 'trapezoid'
  | 'hexagon'
  | 'chevron'
  | 'process'
  | 'triangle'
  | 'document'
  | 'cloud'
  | 'cylinder'
  | 'arrow-right'
  | 'arrow-bidirectional'
  | 'connector-dot'
  | 'arrow-line'
  | 'arrow-orthogonal';

export interface ShapeInsertItem {
  kind: ShapeInsertKind;
  title: string;
}

/** 4×5 grid like diagrams.net shape picker (supported kinds create real elements). */
export const SHAPE_INSERT_LIBRARY: ShapeInsertItem[] = [
  { kind: 'text', title: 'Texte' },
  { kind: 'rectangle', title: 'Rectangle' },
  { kind: 'ellipse', title: 'Ellipse' },
  { kind: 'diamond', title: 'Losange' },
  { kind: 'rounded-rectangle', title: 'Rectangle arrondi' },
  { kind: 'parallelogram', title: 'Parallélogramme' },
  { kind: 'trapezoid', title: 'Trapèze' },
  { kind: 'hexagon', title: 'Hexagone' },
  { kind: 'chevron', title: 'Processus' },
  { kind: 'process', title: 'Sous-programme' },
  { kind: 'triangle', title: 'Triangle' },
  { kind: 'document', title: 'Document' },
  { kind: 'cylinder', title: 'Données' },
  { kind: 'cloud', title: 'Nuage' },
  { kind: 'arrow-right', title: 'Flèche' },
  { kind: 'connector-dot', title: 'Point' },
  { kind: 'arrow-line', title: 'Ligne' },
  { kind: 'arrow-bidirectional', title: 'Double flèche' },
  { kind: 'arrow-orthogonal', title: 'Connexion' }
];

export function createLibraryShapeAt(kind: ShapeInsertKind, center: Point): CanvasElement {
  const id = crypto.randomUUID();
  switch (kind) {
    case 'text':
      return {
        id,
        type: 'text',
        x: center.x,
        y: center.y,
        text: 'Texte',
        childSceneIds: []
      };
    case 'ellipse':
    case 'connector-dot':
      return { id, type: 'circle', cx: center.x, cy: center.y, r: 18, childSceneIds: [] };
    case 'arrow-line':
    case 'arrow-bidirectional':
    case 'arrow-right':
    case 'arrow-orthogonal': {
      const len = 72;
      const arrow: ArrowElement = {
        id,
        type: 'arrow',
        start: { x: center.x - len / 2, y: center.y },
        end: { x: center.x + len / 2, y: center.y },
        childSceneIds: []
      };
      if (kind === 'arrow-orthogonal') {
        arrow.end = { x: center.x + len / 2, y: center.y + 40 };
      }
      if (kind === 'arrow-bidirectional') {
        arrow.start = { x: center.x - len / 2, y: center.y };
        arrow.end = { x: center.x + len / 2, y: center.y };
      }
      return arrow;
    }
    case 'diamond':
      return rectAt(id, center.x - 20, center.y - 20, 40, 40);
    case 'rounded-rectangle':
      return rectAt(id, center.x - 44, center.y - 28, 88, 56);
    case 'parallelogram':
      return rectAt(id, center.x - 48, center.y - 24, 96, 48);
    case 'trapezoid':
      return rectAt(id, center.x - 40, center.y - 22, 80, 44);
    case 'hexagon':
    case 'chevron':
    case 'process':
    case 'triangle':
    case 'document':
    case 'cloud':
    case 'cylinder':
    case 'rectangle':
    default:
      return rectAt(id, center.x - 44, center.y - 28, 88, 56);
  }
}

function rectAt(id: string, x: number, y: number, width: number, height: number): RectElement {
  return { id, type: 'rectangle', x, y, width, height, innerText: '', childSceneIds: [] };
}
