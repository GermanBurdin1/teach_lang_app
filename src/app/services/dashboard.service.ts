import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// TODO : ajouter gestion d'état pour les préférences du tableau de bord
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // === Tableau de bord école ou étudiant ===
  private isSchoolDashboard = new BehaviorSubject<boolean>(
    JSON.parse(localStorage.getItem('isSchoolDashboard') || 'true')
  );
  currentDashboard = this.isSchoolDashboard.asObservable();

  // === Tableau de bord enseignant ===
  private isTeacherDashboard = new BehaviorSubject<boolean>(
    JSON.parse(localStorage.getItem('isTeacherDashboard') || 'false')
  );
  currentTeacherDashboard = this.isTeacherDashboard.asObservable();

  // === Méthodes de basculement ===

  switchToSchoolDashboard(): void {
    localStorage.setItem('isSchoolDashboard', JSON.stringify(true));
    localStorage.setItem('isTeacherDashboard', JSON.stringify(false));
    this.isSchoolDashboard.next(true);
    this.isTeacherDashboard.next(false);
  }

  switchToStudentDashboard(): void {
    localStorage.setItem('isSchoolDashboard', JSON.stringify(false));
    localStorage.setItem('isTeacherDashboard', JSON.stringify(false));
    this.isSchoolDashboard.next(false);
    this.isTeacherDashboard.next(false);
  }

  switchToTeacherDashboard(): void {
    localStorage.setItem('isSchoolDashboard', JSON.stringify(false));
    localStorage.setItem('isTeacherDashboard', JSON.stringify(true));
    this.isSchoolDashboard.next(false);
    this.isTeacherDashboard.next(true);
  }
}
