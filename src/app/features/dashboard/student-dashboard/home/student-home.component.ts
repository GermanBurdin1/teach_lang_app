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

  pendingHomework = [
    { title: 'Production écrite #2', dueDate: '2025-05-24' },
    { title: 'Exercice de grammaire B2', dueDate: '2025-05-26' }
  ];

  selectedLesson: CalendarEvent | null = null;
  upcomingLessons: CalendarEvent[] = [];

  ngOnInit(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);

    this.upcomingLessons = [
      {
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        title: 'Cours avec Mme Dupont',
        allDay: false
      },
      {
        start: inThreeDays,
        end: new Date(inThreeDays.getTime() + 60 * 60 * 1000),
        title: 'Cours avec M. Moreau',
        allDay: false
      }
    ];

    console.log('[StudentHomeComponent] upcomingLessons:', this.upcomingLessons);
    this.pendingHomework.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }

  onLessonClick(event: CalendarEvent): void {
    console.log('[StudentHomeComponent] clicked lesson:', event);
    this.selectedLesson = event;
  }
}
