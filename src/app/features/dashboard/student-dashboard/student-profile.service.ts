import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StudentProfile } from './student-profile.model';
import { AuthService } from '../../../services/auth.service';
import { ProfilesApiService } from '../../../services/profiles-api.service';

// TODO : ajouter cache pour les profils étudiants
@Injectable({ providedIn: 'root' })
export class StudentProfileService {
  constructor(private profilesApi: ProfilesApiService,private authService: AuthService) {}
  private profileSubject = new BehaviorSubject<StudentProfile | null>(null);

  // TODO : corriger la clé localStorage (devrait être 'student_profile')
  setProfile(profile: StudentProfile): void {
    this.profileSubject.next(profile);
    localStorage.setItem('teacher_profile', JSON.stringify(profile));
  }

   getStudentProfile(): Observable<StudentProfile> {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      throw new Error('[StudentProfileService] Aucun ID utilisateur disponible');
    }
    return this.profilesApi.getProfile(userId);
  }

  // TODO : ajouter méthodes pour gestion des objectifs d'apprentissage
}
