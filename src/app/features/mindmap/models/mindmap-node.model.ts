// models/mindmap-node.model.ts
export interface MindmapNode {
  id: string;
  parentId: string | null;
  title: string;
  x: number;
  y: number;
  expanded: boolean;
  width: number;
  height: number;
  side?: 'left' | 'right';
  rule?: string;
  exception?: string;
  example?: string;
  exercise?: string;
}

