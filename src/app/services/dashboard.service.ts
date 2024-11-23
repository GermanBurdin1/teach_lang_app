import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private isSchoolDashboard = new BehaviorSubject<boolean>(true); // По умолчанию - кабинет школы
  currentDashboard = this.isSchoolDashboard.asObservable();

  switchToSchoolDashboard(): void {
    this.isSchoolDashboard.next(true); // Переключаем на кабинет школы
  }

  switchToStudentDashboard(): void {
    this.isSchoolDashboard.next(false); // Переключаем на кабинет ученика
  }
}
