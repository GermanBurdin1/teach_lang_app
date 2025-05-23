import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StudentProfile } from './student-profile.model';
import { AuthService } from '../../../services/auth.service';
import { ProfilesApiService } from '../../../services/profiles-api.service';

@Injectable({ providedIn: 'root' })
export class StudentProfileService {
  constructor(private profilesApi: ProfilesApiService,private authService: AuthService) {}
  private profileSubject = new BehaviorSubject<StudentProfile | null>(null);

  setProfile(profile: StudentProfile): void {
    this.profileSubject.next(profile);
    localStorage.setItem('teacher_profile', JSON.stringify(profile));
  }

   getStudentProfile(): Observable<StudentProfile> {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      throw new Error('[TeacherProfileService] Aucun ID utilisateur disponible');
    }
    return this.profilesApi.getProfile(userId);
  }
}
