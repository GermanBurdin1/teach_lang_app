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
  showModal = false;
  upcomingLessons: CalendarEvent[] = [];
  selectedNewDate: Date | null = null;
  showRescheduleModal = false;
  rescheduleConfirmed = false;


  ngOnInit(): void {
    const tomorrow = new Date();
    tomorrow.setHours(11, 0, 0, 0);

    const inThreeDays = new Date();
    inThreeDays.setDate(inThreeDays.getDate() + 3);
    inThreeDays.setHours(12, 0, 0, 0);

    this.upcomingLessons = [
      {
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        title: 'Cours avec Mme Dupont',
        color: { primary: '#3f51b5', secondary: '#e8eaf6' },
        allDay: false
      },
      {
        start: inThreeDays,
        end: new Date(inThreeDays.getTime() + 60 * 60 * 1000),
        title: 'Cours avec M. Moreau',
        color: { primary: '#3f51b5', secondary: '#e8eaf6' },
        allDay: false
      }
    ];
  }

  onLessonClick(event: CalendarEvent): void {
    this.selectedLesson = event;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedLesson = null;
  }

  openRescheduleModal(): void {
    this.showModal = false;
    this.showRescheduleModal = true;
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal = false;
    this.selectedNewDate = null;
  }

  confirmReschedule(): void {
    if (this.selectedNewDate) {
      // здесь можно отправить запрос на бэкенд
      console.log('Reschedule requested:', this.selectedNewDate);
      this.showRescheduleModal = false;
      this.selectedNewDate = null;
      this.rescheduleConfirmed = true;
    }
  }

}
