import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TeacherProfile } from '../features/dashboard/teacher-dashboard/teacher-profile.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ProfilesApiService {
  private baseUrl = 'http://localhost:3002/profiles';

  constructor(private http: HttpClient) { }
  createProfile(profile: TeacherProfile): Observable<any> {
    return this.http.post(`${this.baseUrl}`, profile);
  }

  updateProfile(profile: TeacherProfile): Observable<any> {
    return this.http.put(`${this.baseUrl}/${profile.user_id}`, profile);
  }

  getProfile(userId: string): Observable<TeacherProfile> {
    return this.http.get<TeacherProfile>(`${this.baseUrl}/${userId}`);
  }
}
