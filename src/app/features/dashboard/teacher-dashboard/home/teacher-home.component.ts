import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { AuthService } from '../../../../services/auth.service';
import { TeacherService } from '../../../../services/teacher.service';
import { NotificationService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notification.model';
@Component({
  selector: 'app-teacher-home',
  templateUrl: './teacher-home.component.html',
  styleUrls: ['./teacher-home.component.css']
})
export class TeacherHomeComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private teacherService: TeacherService,
    private notificationService: NotificationService
  ) { }

  // notifications: string[] = [
  //   'Un nouvel avis a été laissé sur votre profil.',
  //   'Votre profil a été mis en avant cette semaine.'
  // ];
  newRequests: Notification[] = [];
  notifications: Notification[] = [];

  // newRequests = [
  //   { name: 'Claire Martin', date: '21/05/2025' },
  //   { name: 'Julien Lefevre', date: '20/05/2025' }
  // ];

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

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherById(userId).subscribe(profile => {
      if (!profile.bio || !profile.price || !profile.experienceYears ||
        !profile.specializations.length || !profile.certificates.length) {
        this.notifications.unshift({
          id: 'warning-missing-profile',
          user_id: userId,
          title: '⚠️ Veuillez compléter votre profil',
          content: '...pour apparaître dans les résultats de recherche.',
          type: 'info',
          status: 'pending'
        });
      }
    });

    this.notificationService.getNotificationsForUser(userId).subscribe({
      next: (all) => {
        console.log('🔔 [FRONT] Ответ от сервера:', all);
        this.notifications = all.filter(n => n.type !== 'booking_request');
        this.newRequests = all.filter(n => n.type === 'booking_request' && n.status === 'pending');
      },
      error: (err) => {
        console.error('❌ [FRONT] Ошибка при получении уведомлений:', err);
      }
    });

  }

  respondToRequest(id: string, accepted: boolean) {
    const status = accepted ? 'accepted' : 'rejected';
    this.notificationService.updateNotificationStatus(id, status).subscribe(() => {
      this.newRequests = this.newRequests.filter(req => req.id !== id);
    });
  }

}
