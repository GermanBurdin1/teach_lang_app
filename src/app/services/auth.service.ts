import { Injectable } from '@angular/core';
import { User } from '../features/auth/models/user.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environment';
import { API_ENDPOINTS } from '../core/constants/api.constants';

interface JwtResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user: User | null = null;
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;
  private baseRegisterUrl = `${API_ENDPOINTS.AUTH}/register`;
  private currentRoleSubject = new BehaviorSubject<string | null>(null);
  currentRole$ = this.currentRoleSubject.asObservable();

  constructor(private http: HttpClient) { 
    // Восстанавливаем пользователя из localStorage при инициализации
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const savedAccessToken = localStorage.getItem('access_token');
      const savedRefreshToken = localStorage.getItem('refresh_token');
      
      if (savedUser && savedAccessToken) {
        const user = JSON.parse(savedUser);
        this._user = user;
        this._accessToken = savedAccessToken;
        this._refreshToken = savedRefreshToken;
        this.currentRoleSubject.next(user.currentRole || null);
        if (!environment.production) {
          console.log('[AuthService] User and tokens restored from localStorage:', user);
        }
      }
    } catch (error) {
      if (!environment.production) {
        console.error('[AuthService] Failed to restore user from localStorage:', error);
      }
      this.clearStorage(); // Очищаем поврежденные данные
    }
  }

  private saveUserToStorage(): void {
    try {
      if (this._user && this._accessToken) {
        localStorage.setItem('currentUser', JSON.stringify(this._user));
        localStorage.setItem('access_token', this._accessToken);
        if (this._refreshToken) {
          localStorage.setItem('refresh_token', this._refreshToken);
        }
        if (!environment.production) {
          console.log('[AuthService] User and tokens saved to localStorage');
        }
      } else {
        this.clearStorage();
      }
    } catch (error) {
      if (!environment.production) {
        console.error('[AuthService] Failed to save user to localStorage:', error);
      }
    }
  }

  private clearStorage(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    if (!environment.production) {
      console.log('[AuthService] Storage cleared');
    }
  }

  get user(): User | null {
    return this._user;
  }

  getAllTeachers(): Observable<User[]> {
    return this.http.get<User[]>(`${API_ENDPOINTS.AUTH}/teachers`);
  }

  login(email: string, password: string): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${API_ENDPOINTS.AUTH}/login`, { email, password });
  }

  register(email: string, password: string, roles: string[], name: string, surname: string): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.baseRegisterUrl}/register`, {
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

    if (!environment.production) {
      console.log('[AuthService] User set:', this._user);
    }
    this.currentRoleSubject.next(this._user.currentRole ?? null);
    this.saveUserToStorage(); // Сохраняем в localStorage
  }

  setTokens(jwtResponse: JwtResponse) {
    this._accessToken = jwtResponse.access_token;
    this._refreshToken = jwtResponse.refresh_token;
    this.setUser(jwtResponse.user);
  }

  setActiveRole(role: string) {
    if (this._user?.roles.includes(role)) {
      if (!environment.production) {
        console.log(`[AuthService] Setting active role: ${role}`);
      }
      this._user.currentRole = role;
      this.currentRoleSubject.next(role);
      this.saveUserToStorage(); // Сохраняем изменения
    } else {
      if (!environment.production) {
        console.warn(`[AuthService] Attempted to set unknown role: ${role}`);
      }
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
    this._accessToken = null;
    this._refreshToken = null;
    this.currentRoleSubject.next(null);
    this.clearStorage(); // Очищаем localStorage
    if (!environment.production) {
      console.log('[AuthService] User logged out');
    }
  }

  getUserInitial(): string {
    const email = this._user?.email || '';
    const namePart = email.split('@')[0]; // до собаки
    return namePart.charAt(0).toUpperCase(); // первая буква заглавная
  }

  checkEmailExists(email: string): Observable<{ exists: boolean; roles?: string[] }> {
    return this.http.get<{ exists: boolean; roles?: string[] }>(`${API_ENDPOINTS.AUTH}/check-email?email=${email}`);
  }

  getAccessToken(): string | null {
    return this._accessToken;
  }

  getRefreshToken(): string | null {
    return this._refreshToken;
  }

  getAuthHeaders(): HttpHeaders {
    if (this._accessToken) {
      return new HttpHeaders().set('Authorization', `Bearer ${this._accessToken}`);
    }
    return new HttpHeaders();
  }

  refreshToken(): Observable<{ access_token: string; expires_in: number }> {
    if (!this._refreshToken) {
      throw new Error('No refresh token available');
    }
    
    return this.http.post<{ access_token: string; expires_in: number }>(
      `${API_ENDPOINTS.AUTH}/refresh-token`,
      { refresh_token: this._refreshToken }
    );
  }

  updateAccessToken(newAccessToken: string): void {
    this._accessToken = newAccessToken;
    localStorage.setItem('access_token', newAccessToken);
    if (!environment.production) {
      console.log('[AuthService] Access token updated');
    }
  }
}
