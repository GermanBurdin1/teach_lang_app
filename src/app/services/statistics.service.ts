import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment as _environment } from '../../../environment';

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
   * Получить полную статистику для студента
   */
  getStudentDashboardStats(studentId: string): Observable<StudentStats> {
    return this.http.get<StudentStats>(`${this.baseUrl}/student/${studentId}/dashboard`);
  }

  /**
   * Записать вход пользователя в систему
   */
  recordUserLogin(userId: string): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(`${this.baseUrl}/login`, { userId });
  }

  /**
   * Получить количество завершенных уроков
   */
  getCompletedLessonsCount(studentId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/${studentId}/lessons/completed`);
  }

  /**
   * Получить количество активных дней
   */
  getActiveDaysCount(studentId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/${studentId}/active-days`);
  }

  /**
   * Получить количество изученных слов
   */
  getLearnedWordsCount(studentId: string): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/${studentId}/words/learned`);
  }

  // ==================== ADMIN METHODS ====================

  /**
   * Получить статистику регистрации пользователей по месяцам
   */
  getAdminUserStats(month?: string): Observable<any> {
    const url = month ? `${this.baseUrl}/admin/users/${month}` : `${this.baseUrl}/admin/users`;
    return this.http.get(url);
  }

  /**
   * Получить статистику уроков по месяцам
   */
  getAdminLessonsStats(month?: string): Observable<any> {
    const url = month ? `${this.baseUrl}/admin/lessons/${month}` : `${this.baseUrl}/admin/lessons`;
    return this.http.get(url);
  }

  /**
   * Получить общую статистику платформы
   */
  getAdminPlatformStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/platform`);
  }
} 