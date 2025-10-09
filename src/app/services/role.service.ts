import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  constructor(private authService: AuthService) {}

  // Проверка роли пользователя (синхронная) - проверяет массив roles
  hasRole(role: string): boolean {
    const user = this.authService.getCurrentUser();
    return user?.roles?.includes(role) || false;
  }

  // Проверка текущей активной роли (синхронная)
  hasCurrentRole(role: string): boolean {
    return this.authService.hasCurrentRole(role);
  }

  // Проверка роли пользователя (асинхронная) - проверяет массив roles
  hasRoleAsync(role: string): Observable<boolean> {
    return this.authService.currentRole$.pipe(
      map(currentRole => {
        const user = this.authService.getCurrentUser();
        return user?.roles?.includes(role) || false;
      })
    );
  }

  // Проверка текущей активной роли (асинхронная)
  hasCurrentRoleAsync(role: string): Observable<boolean> {
    return this.authService.currentRole$.pipe(
      map(currentRole => currentRole === role)
    );
  }

  // Проверка, является ли пользователь учителем
  isTeacher(): boolean {
    return this.hasCurrentRole('teacher');
  }

  // Проверка, является ли пользователь студентом
  isStudent(): boolean {
    return this.hasCurrentRole('student') || !this.authService.currentRole;
  }

  // Проверка, является ли пользователь админом
  isAdmin(): boolean {
    return this.hasCurrentRole('admin');
  }

  // Проверка, является ли пользователь учителем (асинхронная)
  isTeacherAsync(): Observable<boolean> {
    return this.hasCurrentRoleAsync('teacher');
  }

  // Проверка, является ли пользователь студентом (асинхронная)
  isStudentAsync(): Observable<boolean> {
    return this.authService.currentRole$.pipe(
      map(currentRole => currentRole === 'student' || !currentRole)
    );
  }

  // Проверка, является ли пользователь админом (асинхронная)
  isAdminAsync(): Observable<boolean> {
    return this.hasCurrentRoleAsync('admin');
  }

  // Получение всех ролей пользователя
  getUserRoles(): string[] {
    return this.authService.getCurrentUser()?.roles || [];
  }

  // Получение текущей активной роли
  getCurrentRole(): string | null {
    return this.authService.currentRole;
  }

  // Проверка, имеет ли пользователь хотя бы одну из указанных ролей
  hasAnyRole(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.some(role => userRoles.includes(role));
  }

  // Проверка, имеет ли пользователь все указанные роли
  hasAllRoles(roles: string[]): boolean {
    const userRoles = this.getUserRoles();
    return roles.every(role => userRoles.includes(role));
  }
}
