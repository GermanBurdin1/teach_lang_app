import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';
import { environment as _environment } from '../../../environment';

export interface StudentStats {
  lessonsCompleted: number;
  daysActive: number;
  wordsLearned: number;
}

export interface TeacherStats {
  lessonsCompleted: number;
  daysActive: number;
  wordsLearned: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatisticsService {
  private baseUrl = API_ENDPOINTS.STATISTICS;

  constructor(private http: HttpClient) {}

  /**
   * Получить полную статистику для студента
   */
  getStudentDashboardStats(): Observable<StudentStats> {
    return this.http.get<StudentStats>(`${this.baseUrl}/student/dashboard`);
  }

  /**
   * Записать вход пользователя в систему
   */
  recordUserLogin(): Observable<{success: boolean}> {
    return this.http.post<{success: boolean}>(`${this.baseUrl}/login`, {});
  }

  /**
   * Получить количество завершенных уроков
   */
  getCompletedLessonsCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/lessons/completed`);
  }

  /**
   * Получить количество активных дней
   */
  getActiveDaysCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/active-days`);
  }

  /**
   * Получить количество изученных слов
   */
  getLearnedWordsCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.baseUrl}/student/words/learned`);
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
