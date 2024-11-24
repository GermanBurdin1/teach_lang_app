import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // Инициализируем значение из localStorage
  private isSchoolDashboard = new BehaviorSubject<boolean>(
    JSON.parse(localStorage.getItem('isSchoolDashboard') || 'true') // По умолчанию true
  );

  currentDashboard = this.isSchoolDashboard.asObservable();

  switchToSchoolDashboard(): void {
    localStorage.setItem('isSchoolDashboard', JSON.stringify(true)); // Сохраняем в localStorage
    this.isSchoolDashboard.next(true); // Переключаем на кабинет школы
  }

  switchToStudentDashboard(): void {
    localStorage.setItem('isSchoolDashboard', JSON.stringify(false)); // Сохраняем в localStorage
    this.isSchoolDashboard.next(false); // Переключаем на кабинет ученика
  }
}
