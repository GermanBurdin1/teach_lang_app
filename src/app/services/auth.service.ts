import { Injectable } from '@angular/core';
import { User } from '../features/auth/models/user.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user: User | null = null;
  private baseRegisterUrl = 'http://localhost:3002/auth';

  constructor(private http: HttpClient) { }

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
      this._user.currentRole = this._user.roles[0]; // первая роль по умолчанию
    }
  }
  
  get user(): User | null {
    return this._user;
  }

  setActiveRole(role: string) {
    if (this._user?.roles.includes(role)) {
      this._user.currentRole = role;
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


}
