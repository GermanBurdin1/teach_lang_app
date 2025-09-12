export enum ExamLevel {
  _A1 = 'A1',
  _A2 = 'A2',
  _B1 = 'B1',
  _B2 = 'B2',
  _C1 = 'C1',
  _C2 = 'C2',
  _DELF_A1 = 'DELF A1',
  _DELF_A2 = 'DELF A2',
  _DELF_B1 = 'DELF B1',
  _DELF_B2 = 'DELF B2',
  _DALF_C1 = 'DALF C1',
  _DALF_C2 = 'DALF C2',
  _TCF = 'TCF',
  _TEF = 'TEF'
}

export interface StudentGoal {
  id: string;
  studentId: string;
  examLevel: ExamLevel;
  targetDate?: Date;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGoalDto {
  examLevel: ExamLevel;
  targetDate?: string;
  description?: string;
} 