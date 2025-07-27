export enum ExamLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2',
  DELF_A1 = 'DELF A1',
  DELF_A2 = 'DELF A2',
  DELF_B1 = 'DELF B1',
  DELF_B2 = 'DELF B2',
  DALF_C1 = 'DALF C1',
  DALF_C2 = 'DALF C2',
  TCF = 'TCF',
  TEF = 'TEF'
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

// TODO : ajouter validation pour les dates cibles et description 