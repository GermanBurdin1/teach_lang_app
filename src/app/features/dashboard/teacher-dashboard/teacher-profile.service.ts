import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TeacherProfile } from './teacher-profile.model';
import { MOCK_TEACHER_PROFILE } from './mock-teacher-profile';

@Injectable({
  providedIn: 'root'
})
export class TeacherProfileService {
  getTeacherProfile(): Observable<TeacherProfile> {
    return of(MOCK_TEACHER_PROFILE);
  }
}
