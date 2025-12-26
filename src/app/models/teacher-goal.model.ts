export interface TeacherGoal {
  id: string;
  teacherId: string;
  studentsNumber: number;
  targetDate?: Date;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
