import { Injectable } from '@angular/core';
import { User } from '../features/auth/models/user.model';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user: User | null = null;

  constructor(private http: HttpClient) {}

  login(email: string, password: string) {
    return this.http.post<User>('http://localhost:3002/auth/login', { email, password });
  }

  setUser(user: User) {
    this._user = user;
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
}
