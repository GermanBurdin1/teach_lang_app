export interface LessonSession {
  id: string;
  start: Date;
  end: Date;
  title: string;
  status: 'confirmed' | 'declined' | 'pending';
}
