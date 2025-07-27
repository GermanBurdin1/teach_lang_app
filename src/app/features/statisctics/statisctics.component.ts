import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-statisctics',
  templateUrl: './statisctics.component.html',
  styleUrl: './statisctics.component.css'
})
export class StatiscticsComponent {

  studentPeriods = ['Aujourd\'hui', 'Cette semaine', 'Ce mois-ci', '6 mois', 'Année'];
  lessonPeriods = ['Aujourd\'hui', 'Cette semaine', 'Ce mois-ci', '6 mois', 'Année'];
  selectedStudentPeriod = 'Année';
  selectedLessonPeriod = 'Année';
  currentWeekStart: Date = new Date();
  hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
}
