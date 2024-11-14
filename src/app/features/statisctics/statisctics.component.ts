import { Component, OnInit } from '@angular/core';
import { Chart, registerables } from 'chart.js';

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
  schedule: any[] = []; // Тип изменён на any[]

  chart: Chart | null = null;

  constructor() {
    this.currentWeekStart = this.getStartOfWeek(new Date());
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.createStudentsChart();
    this.createLessonsChart();
  }

  createStudentsChart(): void {
    new Chart('studentsChart', {
      type: 'line',
      data: {
        labels: Array.from({ length: 12 }, (_, i) => `Месяц ${i + 1}`),
        datasets: [{
          label: 'Учеников',
          data: [0, 2, 4, 3, 5, 2, 0, 3, 1, 0, 2, 4],
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  createLessonsChart(): void {
    new Chart('lessonsChart', {
      type: 'line',
      data: {
        labels: Array.from({ length: 12 }, (_, i) => `Месяц ${i + 1}`),
        datasets: [{
          label: 'Уроков',
          data: [1, 1, 2, 0, 3, 0, 1, 4, 2, 0, 1, 0],
          borderColor: 'rgba(153, 102, 255, 1)',
          borderWidth: 2,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    });
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
