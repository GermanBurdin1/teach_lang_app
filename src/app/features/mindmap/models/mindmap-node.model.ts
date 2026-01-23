// models/mindmap-node.model.ts
export interface MindmapNode {
  id: string;
  mindmapId: string | null; // лучше string, но у тебя nullable на бэке
  userId?: string;          // можно не хранить, но приходит с бэка
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

