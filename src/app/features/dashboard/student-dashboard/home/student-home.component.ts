import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';

@Component({
  selector: 'app-student-home',
  templateUrl: './student-home.component.html',
  styleUrls: ['./student-home.component.css']
})
export class StudentHomeComponent implements OnInit {
  goal = 'DALF C1 avant le 15 juillet 2025';

  stats = {
    daysActive: 42,
    lessonsCompleted: 18,
    wordsLearned: 87
  };

  upcomingLessons: CalendarEvent[] = [
    {
      start: new Date(new Date().setDate(new Date().getDate() + 1)),
      title: 'Cours avec Mme Dupont'
    },
    {
      start: new Date(new Date().setDate(new Date().getDate() + 3)),
      title: 'Cours avec M. Moreau'
    }
  ];

  pendingHomework = [
    { title: 'Production écrite #2', dueDate: '2025-05-24' },
    { title: 'Exercice de grammaire B2', dueDate: '2025-05-26' }
  ];

  ngOnInit(): void {
    this.pendingHomework.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }
}
