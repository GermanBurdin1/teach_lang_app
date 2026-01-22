export interface Mindmap {
  id: string;
  title?: string;
	userId: string;
	createdAt: string;
	updatedAt: string;
}

export type MindmapType = 'course' | 'instant' | 'personal';

export interface CreateMindmapDto {
  title: string;
  type: MindmapType;
  courseId?: number | null;
  nodes?: any[]; // если нужно — типизируй MindmapNodeDto[]
}
