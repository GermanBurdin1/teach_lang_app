import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

export interface StudentStats {
  lessonsCompleted: number;
  daysActive: number;
  wordsLearned: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private baseUrl = 'http://localhost:3006/statistics';

  constructor(private http: HttpClient) {}

  /**
   * stats pour un étudiant
   */
  getStudentDashboardStats(studentId: string): Observable<StudentStats> {
    return this.http.get<StudentStats>(`${this.baseUrl}/student/${studentId}/dashboard`);
  }

  /**
   * logger l'entrée dans le système
   */
  recordUserLogin(userId: string): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(`${this.baseUrl}/login`, { userId });
  }

  /**
   * avoir la qté de cours complets
   */
  getCompletedLessonsCount(studentId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/${studentId}/lessons/completed`);
  }

  /**
   * qté de jours actifs
   */
  getActiveDaysCount(studentId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/${studentId}/active-days`);
  }

  /**
   * qté de mots appris
   */
  getLearnedWordsCount(studentId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/${studentId}/words/learned`);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * stats d'inscription des utilisateurs par mois
   */
  getAdminUserStats(month?: string): Observable<any> {
    const url = month ? `${this.baseUrl}/admin/users/${month}` : `${this.baseUrl}/admin/users`;
    return this.http.get(url);
  }

  /**
   * stats des cours par mois pour l'admin
   */
  getAdminLessonsStats(month?: string): Observable<any> {
    const url = month ? `${this.baseUrl}/admin/lessons/${month}` : `${this.baseUrl}/admin/lessons`;
    return this.http.get(url);
  }

  /**
   * stats de la plateforme pour l'admin
   */
  getAdminPlatformStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/platform`);
  }
} 