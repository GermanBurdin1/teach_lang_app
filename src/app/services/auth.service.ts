import { Injectable } from '@angular/core';
import { User } from '../features/auth/models/user.model';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user: User | null = null;
  private baseRegisterUrl = 'http://localhost:3002/auth';
  private currentRoleSubject = new BehaviorSubject<string | null>(null);
  currentRole$ = this.currentRoleSubject.asObservable();

  constructor(private http: HttpClient) { }

  get user(): User | null {
    return this._user;
  }

  getAllTeachers(): Observable<User[]> {
    return this.http.get<User[]>('http://localhost:3002/auth/teachers');
  }

  login(email: string, password: string) {
    return this.http.post<User>('http://localhost:3002/auth/login', { email, password });
  }

  register(data: { email: string; password: string; roles: string[] }): Observable<any> {
    console.log('[AuthApiService] POST /auth/register', data);
    return this.http.post(`${this.baseRegisterUrl}/register`, data);
  }

  setUser(user: User) {
    this._user = user;
    if (!this._user.currentRole && this._user.roles.length > 0) {
      this._user.currentRole = this._user.roles[0];
    }

    console.log('[AuthService] User set:', this._user);
    this.currentRoleSubject.next(this._user.currentRole ?? null);
    // 💥 добавь это!
  }




  setActiveRole(role: string) {
    if (this._user?.roles.includes(role)) {
      console.log(`[AuthService] Setting active role: ${role}`);
      this._user.currentRole = role;
      this.currentRoleSubject.next(role); // 💥 уведомляем подписчиков
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

  checkEmailExists(email: string): Observable<{ exists: boolean; roles?: string[] }> {
    return this.http.get<{ exists: boolean; roles?: string[] }>(`http://localhost:3002/auth/check-email?email=${email}`);
  }

  getUserInitial(): string {
    const email = this._user?.email || '';
    const namePart = email.split('@')[0]; // до собаки
    return namePart.charAt(0).toUpperCase(); // первая буква заглавная
  }



}
