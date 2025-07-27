import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StudentGoal, CreateGoalDto, ExamLevel } from '../models/student-goal.model';
import { environment } from '../../../environment';

// TODO : ajouter système de rappels pour les objectifs
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

  // méthode pour obtenir le nom d'affichage localisé du niveau d'examen
  getExamLevelDisplayName(level: ExamLevel): string {
    const displayNames: { [key in ExamLevel]: string } = {
      [ExamLevel.A1]: 'A1 - Débutant',
      [ExamLevel.A2]: 'A2 - Élémentaire',
      [ExamLevel.B1]: 'B1 - Intermédiaire',
      [ExamLevel.B2]: 'B2 - Intermédiaire supérieur',
      [ExamLevel.C1]: 'C1 - Avancé',
      [ExamLevel.C2]: 'C2 - Maîtrise',
      [ExamLevel.DELF_A1]: 'DELF A1',
      [ExamLevel.DELF_A2]: 'DELF A2',
      [ExamLevel.DELF_B1]: 'DELF B1',
      [ExamLevel.DELF_B2]: 'DELF B2',
      [ExamLevel.DALF_C1]: 'DALF C1',
      [ExamLevel.DALF_C2]: 'DALF C2',
      [ExamLevel.TCF]: 'TCF - Test de connaissance du français',
      [ExamLevel.TEF]: 'TEF - Test d\'évaluation de français'
    };

    return displayNames[level] || level;
  }
} 