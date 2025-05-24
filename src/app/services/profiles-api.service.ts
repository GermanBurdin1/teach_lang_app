import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TeacherProfile } from '../features/dashboard/teacher-dashboard/teacher-profile.model';
import { StudentProfile } from '../features/dashboard/student-dashboard/student-profile.model';
import { Observable } from 'rxjs';
import { AdminProfile } from '../features/dashboard/school-dashboard/admin-profile.model';

type TeacherOrStudentProfile = TeacherProfile | StudentProfile | AdminProfile;

@Injectable({
  providedIn: 'root'
})
export class ProfilesApiService {
  private baseUrl = 'http://localhost:3002/profiles';

  constructor(private http: HttpClient) { }
  createProfile(profile: TeacherOrStudentProfile): Observable<any> {
    return this.http.post(`${this.baseUrl}`, profile);
  }

  updateProfile(profile: TeacherOrStudentProfile): Observable<any> {
    return this.http.put(`${this.baseUrl}/${profile.user_id}`, profile);
  }

  getProfile<T extends TeacherOrStudentProfile>(userId: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${userId}`);
  }
}
