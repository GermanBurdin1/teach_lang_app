import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { TeacherProfile } from './teacher-profile.model';
import { AuthService } from '../../../services/auth.service';
import { ProfilesApiService } from '../../../services/profiles-api.service';

// TODO : ajouter cache pour les profils enseignants
@Injectable({ providedIn: 'root' })
export class TeacherProfileService {
  constructor(private profilesApi: ProfilesApiService,private authService: AuthService) {}
  private profileSubject = new BehaviorSubject<TeacherProfile | null>(null);

  // TODO : optimiser la gestion du cache localStorage
  setProfile(profile: TeacherProfile): void {
    this.profileSubject.next(profile);
    localStorage.setItem('teacher_profile', JSON.stringify(profile));
  }

   getTeacherProfile(): Observable<TeacherProfile> {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) {
      throw new Error('[TeacherProfileService] Aucun ID utilisateur disponible');
    }
    return this.profilesApi.getProfile(userId);
  }

  // TODO : ajouter méthodes pour mise à jour des compétences
}
