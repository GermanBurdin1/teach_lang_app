export interface MindmapNode {
  height: number;
  width: number;
  id: string;
  parentId: string | null;
  title: string;
  content?: string;
  children?: MindmapNode[];
  x: number;
  y: number;
  expanded?: boolean;
}
