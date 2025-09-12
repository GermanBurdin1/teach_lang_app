import { Component } from '@angular/core';

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
}
