import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // === Кабинет школы или ученика ===
  private isSchoolDashboard = new BehaviorSubject<boolean>(false);
  currentDashboard = this.isSchoolDashboard.asObservable();

  // === Кабинет преподавателя ===
  private isTeacherDashboard = new BehaviorSubject<boolean>(false);
  currentTeacherDashboard = this.isTeacherDashboard.asObservable();

  constructor(private authService: AuthService) {
    // Подписываемся на изменения роли пользователя
    this.authService.currentRole$.subscribe(role => {
      this.updateDashboardFlags(role);
    });
  }

  private updateDashboardFlags(role: string | null): void {
    const isAdmin = role === 'admin';
    const isTeacher = role === 'teacher';
    const isStudent = role === 'student' || !role;

    this.isSchoolDashboard.next(isAdmin);
    this.isTeacherDashboard.next(isTeacher);
  }

  // === Методы переключения (теперь основаны на ролях с backend) ===

  switchToSchoolDashboard(): void {
    // Переключаем роль на admin
    this.authService.setActiveRole('admin');
  }

  switchToStudentDashboard(): void {
    // Переключаем роль на student
    this.authService.setActiveRole('student');
  }

  switchToTeacherDashboard(): void {
    // Переключаем роль на teacher
    this.authService.setActiveRole('teacher');
  }

  // Получение текущего типа dashboard на основе роли
  getCurrentDashboardType(): 'admin' | 'teacher' | 'student' {
    const currentRole = this.authService.currentRole;
    return currentRole as 'admin' | 'teacher' | 'student' || 'student';
  }
}
