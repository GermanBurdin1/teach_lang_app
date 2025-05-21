import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TeacherProfile } from './teacher-profile.model';

@Injectable({ providedIn: 'root' })
export class TeacherProfileService {
  private profileSubject = new BehaviorSubject<TeacherProfile | null>(null);

  setProfile(profile: TeacherProfile): void {
    this.profileSubject.next(profile);
    localStorage.setItem('teacher_profile', JSON.stringify(profile));
  }

  getTeacherProfile(): Observable<TeacherProfile | null> {
    const local = localStorage.getItem('teacher_profile');
    if (local && !this.profileSubject.value) {
      this.profileSubject.next(JSON.parse(local));
    }
    return this.profileSubject.asObservable();
  }
}
