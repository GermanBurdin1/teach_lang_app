import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';

@Component({
  selector: 'app-teacher-home',
  templateUrl: './teacher-home.component.html',
  styleUrls: ['./teacher-home.component.css']
})
export class TeacherHomeComponent implements OnInit {
  notifications: string[] = [
    'Un nouvel avis a été laissé sur votre profil.',
    'Votre profil a été mis en avant cette semaine.'
  ];

  newRequests = [
    { name: 'Claire Martin', date: '21/05/2025' },
    { name: 'Julien Lefevre', date: '20/05/2025' }
  ];

  homeworksToReview = [
    { student: 'Alice Dupont', title: 'Exercice B2', dueDate: '2025-05-23' },
    { student: 'Marc Petit', title: 'Rédaction C1', dueDate: '2025-05-22' }
  ];

  upcomingLessons: CalendarEvent[] = [
    {
      start: new Date(new Date().setDate(new Date().getDate() + 1)),
      title: 'Cours avec Alice Dupont'
    },
    {
      start: new Date(new Date().setDate(new Date().getDate() + 2)),
      title: 'Cours avec Thomas Moreau'
    }
  ];

  ngOnInit(): void {
    // Возможна загрузка с backend позже
    this.homeworksToReview.sort((a, b) =>
      a.dueDate.localeCompare(b.dueDate)
    );
  }
}
