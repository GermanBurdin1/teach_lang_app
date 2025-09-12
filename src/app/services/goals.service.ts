import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentGoal, CreateGoalDto, ExamLevel } from '../models/student-goal.model';
import { environment as _environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class GoalsService {
  private apiUrl = `http://localhost:3001/goals`; // auth-service

  constructor(private http: HttpClient) {}

  getAvailableExamLevels(): Observable<{ levels: ExamLevel[] }> {
    return this.http.get<{ levels: ExamLevel[] }>(`${this.apiUrl}/exam-levels`);
  }

  createGoal(createGoalDto: CreateGoalDto & { studentId?: string }): Observable<StudentGoal> {
    return this.http.post<StudentGoal>(this.apiUrl, createGoalDto);
  }

  getActiveGoal(studentId: string): Observable<StudentGoal> {
    return this.http.get<StudentGoal>(`${this.apiUrl}/student/${studentId}/active`);
  }

  getAllGoals(studentId: string): Observable<StudentGoal[]> {
    return this.http.get<StudentGoal[]>(`${this.apiUrl}/student/${studentId}`);
  }

  updateGoal(goalId: string, updateData: Partial<CreateGoalDto>): Observable<StudentGoal> {
    return this.http.put<StudentGoal>(`${this.apiUrl}/${goalId}`, updateData);
  }

  deleteGoal(goalId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${goalId}`);
  }

  // Метод для получения локализованного названия уровня экзамена
  getExamLevelDisplayName(level: ExamLevel): string {
    const displayNames: { [_key in ExamLevel]: string } = {
      [ExamLevel._A1]: 'A1 - Débutant',
      [ExamLevel._A2]: 'A2 - Élémentaire',
      [ExamLevel._B1]: 'B1 - Intermédiaire',
      [ExamLevel._B2]: 'B2 - Intermédiaire supérieur',
      [ExamLevel._C1]: 'C1 - Avancé',
      [ExamLevel._C2]: 'C2 - Maîtrise',
      [ExamLevel._DELF_A1]: 'DELF A1',
      [ExamLevel._DELF_A2]: 'DELF A2',
      [ExamLevel._DELF_B1]: 'DELF B1',
      [ExamLevel._DELF_B2]: 'DELF B2',
      [ExamLevel._DALF_C1]: 'DALF C1',
      [ExamLevel._DALF_C2]: 'DALF C2',
      [ExamLevel._TCF]: 'TCF - Test de connaissance du français',
      [ExamLevel._TEF]: 'TEF - Test d\'évaluation de français'
    };

    return displayNames[level] || level;
  }
} 