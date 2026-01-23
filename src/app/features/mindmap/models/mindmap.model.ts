export interface Mindmap {
  id: string;
  title: string;
  type: MindmapType;
  userId: string;
  courseId: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export type MindmapType = 'course' | 'instant' | 'personal';

export interface CreateMindmapDto {
  title: string;
  type: MindmapType;
  courseId?: number | null;
  nodes?: any[];
}
