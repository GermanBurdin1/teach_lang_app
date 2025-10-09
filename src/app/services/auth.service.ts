import { Injectable, Injector } from '@angular/core';
import { User } from '../features/auth/models/user.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, timeout } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
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
  private _activeRole: string | null = null;
  private baseRegisterUrl = `${API_ENDPOINTS.AUTH}/register`;
  private currentRoleSubject = new BehaviorSubject<string | null>(null);
  currentRole$ = this.currentRoleSubject.asObservable();
  private _refreshInProgress = false;

  private get http(): HttpClient {
    return this.injector.get(HttpClient);
  }

  constructor(private injector: Injector) {
    // Восстанавливаем пользователя из localStorage при инициализации
    this.loadUserFromStorage();

    // НЕ загружаем роли в конструкторе - это будет сделано лениво при необходимости
  }

  private loadUserFromStorage(): void {
    try {
      const savedUser = localStorage.getItem('currentUser');
      const savedAccessToken = localStorage.getItem('access_token');
      const savedRefreshToken = localStorage.getItem('refresh_token');

      console.log('[AuthService] loadUserFromStorage - savedUser exists:', !!savedUser);
      console.log('[AuthService] loadUserFromStorage - savedAccessToken exists:', !!savedAccessToken);
      console.log('[AuthService] loadUserFromStorage - savedRefreshToken exists:', !!savedRefreshToken);
      console.log('[AuthService] loadUserFromStorage - savedAccessToken value:', savedAccessToken ? savedAccessToken.substring(0, 20) + '...' : 'null');
      console.log('[AuthService] loadUserFromStorage - savedRefreshToken value:', savedRefreshToken ? savedRefreshToken.substring(0, 20) + '...' : 'null');

      if (savedUser && savedAccessToken) {
        const userData = JSON.parse(savedUser);
        // Восстанавливаем только базовые данные пользователя
        this._user = {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          surname: userData.surname,
          initials: userData.initials,
          roles: [] // Роли будут загружены с backend
        };
        this._accessToken = savedAccessToken;
        this._refreshToken = savedRefreshToken;

        console.log('[AuthService] User and tokens restored from localStorage');
        console.log('[AuthService] Restored access token:', this._accessToken ? this._accessToken.substring(0, 20) + '...' : 'null');
        console.log('[AuthService] Restored refresh token:', this._refreshToken ? this._refreshToken.substring(0, 20) + '...' : 'null');

        // Роли и активная роль будут загружены с backend
        this._activeRole = null;
        this.currentRoleSubject.next(null);

        if (!environment.production) {
          console.log('[AuthService] User data and tokens restored from localStorage');
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
        // Сохраняем только безопасные данные пользователя
        const userData = {
          id: this._user.id,
          email: this._user.email,
          name: this._user.name,
          surname: this._user.surname,
          initials: this._user.initials
          // НЕ сохраняем roles и currentRole - получаем с backend
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('access_token', this._accessToken);
        if (this._refreshToken) {
          localStorage.setItem('refresh_token', this._refreshToken);
          console.log('[AuthService] Refresh token saved to localStorage');
        } else {
          console.log('[AuthService] No refresh token to save to localStorage');
        }
        console.log('[AuthService] User data and tokens saved to localStorage');
        console.log('[AuthService] Saved access token:', this._accessToken ? this._accessToken.substring(0, 20) + '...' : 'null');
        console.log('[AuthService] Saved refresh token:', this._refreshToken ? this._refreshToken.substring(0, 20) + '...' : 'null');
      } else {
        console.log('[AuthService] Cannot save to storage - missing user or access token');
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

    // Если активная роль не установлена, устанавливаем первую роль из массива roles
    if (!this._activeRole && this._user.roles && this._user.roles.length > 0) {
      this._activeRole = this._user.roles[0];
    }

    if (!environment.production) {
      console.log('[AuthService] User set with roles:', this._user.roles);
    }
    this.currentRoleSubject.next(this._activeRole ?? null);
    this.saveUserToStorage(); // Сохраняем только безопасные данные в localStorage
  }

  setTokens(jwtResponse: JwtResponse) {
    console.log('[AuthService] setTokens called with response:', {
      hasAccessToken: !!jwtResponse.access_token,
      hasRefreshToken: !!jwtResponse.refresh_token,
      hasUser: !!jwtResponse.user
    });
    console.log('[AuthService] Access token value:', jwtResponse.access_token ? jwtResponse.access_token.substring(0, 20) + '...' : 'null');
    console.log('[AuthService] Refresh token value:', jwtResponse.refresh_token ? jwtResponse.refresh_token.substring(0, 20) + '...' : 'null');

    this._accessToken = jwtResponse.access_token;
    this._refreshToken = jwtResponse.refresh_token;
    this.setUser(jwtResponse.user);

    console.log('[AuthService] Tokens set successfully');
    console.log('[AuthService] Internal access token:', this._accessToken ? this._accessToken.substring(0, 20) + '...' : 'null');
    console.log('[AuthService] Internal refresh token:', this._refreshToken ? this._refreshToken.substring(0, 20) + '...' : 'null');
  }

  setActiveRole(role: string) {
    if (this._user?.roles.includes(role)) {
      if (!environment.production) {
        console.log(`[AuthService] Setting active role: ${role}`);
      }
      this._activeRole = role;

      this.currentRoleSubject.next(role);
      this.saveUserToStorage(); // Сохраняем изменения
    } else {
      if (!environment.production) {
        console.warn(`[AuthService] Attempted to set unknown role: ${role}`);
      }
    }
  }

  get currentRole(): string | null {
    return this._activeRole || null;
  }

  getCurrentUser(): User | null {
    return this._user;
  }

  logout(): void {
    this._user = null;
    this._accessToken = null;
    this._refreshToken = null;
    this._activeRole = null;
    this._refreshInProgress = false; // Сбрасываем флаг обновления токена
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
    console.log('[AuthService] getAccessToken called, token exists:', !!this._accessToken);
    console.log('[AuthService] getAccessToken value:', this._accessToken ? this._accessToken.substring(0, 20) + '...' : 'null');
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
    console.log('[AuthService] refreshToken called, refresh token exists:', !!this._refreshToken);
    console.log('[AuthService] refresh token value:', this._refreshToken ? this._refreshToken.substring(0, 20) + '...' : 'null');
    console.log('[AuthService] refresh in progress:', this._refreshInProgress);

    if (!this._refreshToken) {
      console.error('[AuthService] No refresh token available for refresh');
      throw new Error('No refresh token available');
    }

    if (this._refreshInProgress) {
      console.log('[AuthService] Refresh already in progress, skipping duplicate request');
      throw new Error('Token refresh already in progress');
    }

    this._refreshInProgress = true;
    console.log('[AuthService] Attempting token refresh with refresh token:', this._refreshToken.substring(0, 20) + '...');

    const requestBody = { refresh_token: this._refreshToken };
    console.log('[AuthService] Request body:', requestBody);

    return this.http.post<{ access_token: string; expires_in: number }>(
      `${API_ENDPOINTS.AUTH}/refresh-token`,
      requestBody
    ).pipe(
      timeout(10000), // 10 секунд таймаут
      tap((response) => {
        console.log('[AuthService] Token refresh successful:', {
          hasNewAccessToken: !!response.access_token,
          expiresIn: response.expires_in
        });
        this._refreshInProgress = false;
      }),
      catchError((error) => {
        console.error('[AuthService] Token refresh failed:', {
          status: error.status,
          statusText: error.statusText,
          error: error.error,
          url: error.url,
          name: error.name,
          message: error.message
        });
        this._refreshInProgress = false;
        return throwError(() => error);
      })
    );
  }

  updateAccessToken(newAccessToken: string): void {
    console.log('[AuthService] updateAccessToken called with:', newAccessToken ? newAccessToken.substring(0, 20) + '...' : 'null');
    this._accessToken = newAccessToken;
    localStorage.setItem('access_token', newAccessToken);
    console.log('[AuthService] Access token updated in memory and localStorage');
    console.log('[AuthService] Current access token in memory:', this._accessToken ? this._accessToken.substring(0, 20) + '...' : 'null');
  }

  // Получение email пользователя по ID
  getUserEmail(userId: string): Observable<{ id: string; email: string; name: string; surname: string }> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this._accessToken}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<{ id: string; email: string; name: string; surname: string }>(
      `${API_ENDPOINTS.AUTH}/email/user/${userId}`,
      { headers }
    );
  }

  // Получение актуальных данных пользователя с backend (включая роли)
  getCurrentUserFromBackend(): Observable<User> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this._accessToken}`,
      'Content-Type': 'application/json'
    });

    return this.http.get<User>(`${API_ENDPOINTS.AUTH}/profile`, { headers });
  }

  // Обновление данных пользователя с backend
  refreshUserFromBackend(): void {
    if (!this._accessToken) {
      console.warn('[AuthService] No access token available for user refresh');
      return;
    }

    this.getCurrentUserFromBackend().subscribe({
      next: (updatedUser: User) => {
        console.log('[AuthService] User data refreshed from backend:', updatedUser);

        // Обновляем пользователя с актуальными данными
        this.setUser(updatedUser);
      },
      error: (error) => {
        console.error('[AuthService] Failed to refresh user from backend:', error);
        // В случае ошибки, оставляем текущего пользователя
      }
    });
  }

  // Принудительная загрузка ролей с backend
  loadUserRoles(): void {
    if (!this._accessToken) {
      console.warn('[AuthService] No access token available for roles loading');
      return;
    }

    this.getCurrentUserFromBackend().subscribe({
      next: (userWithRoles: User) => {
        if (this._user) {
          // Обновляем только роли, сохраняя остальные данные
          this._user.roles = userWithRoles.roles;

          // Устанавливаем первую роль как активную, если нет активной роли
          if (!this._activeRole && userWithRoles.roles.length > 0) {
            this._activeRole = userWithRoles.roles[0];
            this.currentRoleSubject.next(this._activeRole);
          }

          if (!environment.production) {
            console.log('[AuthService] User roles loaded from backend:', userWithRoles.roles);
          }
        }
      },
      error: (error) => {
        console.error('[AuthService] Failed to load user roles from backend:', error);
      }
    });
  }

  // Проверка роли пользователя (синхронная)
  hasRole(role: string): boolean {
    return this._user?.roles?.includes(role) || false;
  }

  // Проверка текущей активной роли
  hasCurrentRole(role: string): boolean {
    return this._activeRole === role;
  }
}
