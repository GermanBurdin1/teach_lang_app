import { Injectable } from '@angular/core';
import { User } from '../features/auth/models/user.model';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user: User | null = null;
  private baseRegisterUrl = 'http://localhost:3001/auth';
  private currentRoleSubject = new BehaviorSubject<string | null>(null);
  currentRole$ = this.currentRoleSubject.asObservable();

  constructor(private http: HttpClient) { 
    // Восстанавливаем пользователя из localStorage при инициализации
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        this._user = user;
        this.currentRoleSubject.next(user.currentRole || null);
        console.log('[AuthService] User restored from localStorage:', user);
      }
    } catch (error) {
      console.error('[AuthService] Failed to restore user from localStorage:', error);
      localStorage.removeItem('currentUser'); // Очищаем поврежденные данные
    }
  }

  private saveUserToStorage(): void {
    try {
      if (this._user) {
        localStorage.setItem('currentUser', JSON.stringify(this._user));
        console.log('[AuthService] User saved to localStorage');
      } else {
        localStorage.removeItem('currentUser');
        console.log('[AuthService] User removed from localStorage');
      }
    } catch (error) {
      console.error('[AuthService] Failed to save user to localStorage:', error);
    }
  }

  get user(): User | null {
    return this._user;
  }

  getAllTeachers(): Observable<User[]> {
    return this.http.get<User[]>('http://localhost:3001/auth/teachers');
  }

  login(email: string, password: string) {
    return this.http.post<User>('http://localhost:3001/auth/login', { email, password });
  }

  register(email: string, password: string, roles: string[], name: string, surname: string): Observable<User> {
    return this.http.post<User>(`${this.baseRegisterUrl}/register`, {
      email,
      password,
      roles,
      name,
      surname
    });
  }

  setUser(user: User) {
    this._user = user;
    if (!this._user.currentRole && this._user.roles.length > 0) {
      this._user.currentRole = this._user.roles[0];
    }

    console.log('[AuthService] User set:', this._user);
    this.currentRoleSubject.next(this._user.currentRole ?? null);
    this.saveUserToStorage(); // Сохраняем в localStorage
  }

  setActiveRole(role: string) {
    if (this._user?.roles.includes(role)) {
      console.log(`[AuthService] Setting active role: ${role}`);
      this._user.currentRole = role;
      this.currentRoleSubject.next(role);
      this.saveUserToStorage(); // Сохраняем изменения
    } else {
      console.warn(`[AuthService] Attempted to set unknown role: ${role}`);
    }
  }

  get currentRole(): string | null {
    return this._user?.currentRole || null;
  }

  getCurrentUser(): User | null {
    return this._user;
  }

  logout(): void {
    this._user = null;
    this.currentRoleSubject.next(null);
    this.saveUserToStorage(); // Очищаем localStorage
    console.log('[AuthService] User logged out');
  }

  getUserInitial(): string {
    const email = this._user?.email || '';
    const namePart = email.split('@')[0]; // до собаки
    return namePart.charAt(0).toUpperCase(); // первая буква заглавная
  }

  checkEmailExists(email: string): Observable<{ exists: boolean; roles?: string[] }> {
    return this.http.get<{ exists: boolean; roles?: string[] }>(`http://localhost:3001/auth/check-email?email=${email}`);
  }
}
