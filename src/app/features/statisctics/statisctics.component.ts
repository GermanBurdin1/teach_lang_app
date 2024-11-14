import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-statisctics',
  templateUrl: './statisctics.component.html',
  styleUrl: './statisctics.component.css'
})
export class StatiscticsComponent {

  studentPeriods = ['Сегодня', 'На этой неделе', 'В этом месяце', 'Полгода', 'Год'];
  lessonPeriods = ['Сегодня', 'На этой неделе', 'В этом месяце', 'Полгода', 'Год'];
  selectedStudentPeriod = 'Год';
  selectedLessonPeriod = 'Год';
  currentWeekStart: Date = new Date();
  hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];


  constructor() {
    this.currentWeekStart = this.getStartOfWeek(new Date());
  }

  getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Начало недели - понедельник
    return new Date(start.setDate(diff));
  }

  getWeekDates(): Date[] {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
  }

  isLessonScheduled(day: Date, hour: string): boolean {
    // Логика проверки, запланирован ли урок (можно заменить на вашу)
    return false;
  }
}
