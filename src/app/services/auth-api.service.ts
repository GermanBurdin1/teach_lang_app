import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private baseRegisterUrl = 'http://localhost:3002/auth';

  constructor(private http: HttpClient) {}

  register(data: { email: string; password: string; roles: string[] }): Observable<any> {
  console.log('[AuthApiService] POST /auth/register', data);
  return this.http.post(`${this.baseRegisterUrl}/register`, data);
}


}
