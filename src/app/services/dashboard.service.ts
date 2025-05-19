import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // === Кабинет школы или ученика ===
  private isSchoolDashboard = new BehaviorSubject<boolean>(
    JSON.parse(localStorage.getItem('isSchoolDashboard') || 'true')
  );
  currentDashboard = this.isSchoolDashboard.asObservable();

  // === Кабинет преподавателя ===
  private isTeacherDashboard = new BehaviorSubject<boolean>(
    JSON.parse(localStorage.getItem('isTeacherDashboard') || 'false')
  );
  currentTeacherDashboard = this.isTeacherDashboard.asObservable();

  // === Методы переключения ===

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
