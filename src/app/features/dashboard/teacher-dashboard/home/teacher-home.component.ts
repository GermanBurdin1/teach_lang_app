import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { AuthService } from '../../../../services/auth.service';
import { TeacherService } from '../../../../services/teacher.service';
import { NotificationService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notification.model';
import { LessonService } from '../../../../services/lesson.service';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-teacher-home',
  templateUrl: './teacher-home.component.html',
  styleUrls: ['./teacher-home.component.css']
})
export class TeacherHomeComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private teacherService: TeacherService,
    private notificationService: NotificationService,
    private lessonService: LessonService,
    private snackBar: MatSnackBar
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

  upcomingLessons: CalendarEvent[] = [];

  shownRequests = 5;

  REJECTION_REASONS = [
    'Je ne suis pas disponible à cette date',
    'Ce créneau ne correspond pas à mon emploi du temps régulier',
    'Je préfère discuter avant d\'accepter une première leçon',
    'Je n\'enseigne pas actuellement à ce niveau',
    'Autre'
  ];
  selectedRequest: Notification | null = null;
  selectedReason = '';
  customReason = '';
  showRefuseDialog = false;
  treatedRequests: Notification[] = [];
  confirmedStudents: any[] = [];
  selectedRefusalMode: 'refuse' | 'propose' = 'refuse';
  selectedAlternativeDate?: Date;
  selectedAlternativeTime?: string;

  // Новые свойства для управления уведомлениями (как в student-home)
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 10;

  private refreshCalendar(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome] refreshCalendar: requesting all confirmed lessons for teacher', userId);
    this.lessonService.getAllConfirmedLessonsForTeacher(userId).subscribe(lessons => {
      console.log('[TeacherHome] Все подтверждённые занятия:', lessons);
      this.upcomingLessons = lessons.map(lesson => ({
        start: new Date(lesson.scheduledAt),
        title: `Занятие с ${lesson.studentName}`,
      }));
      console.log('[TeacherHome] upcomingLessons для календаря:', this.upcomingLessons);
    });
  }

  private refreshNotifications(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome][FRONT] refreshNotifications called for userId:', userId);
    this.notificationService.getNotificationsForUser(userId).subscribe({
      next: (all) => {
        console.log('[TeacherHome][FRONT] notifications from backend:', all);
        this.notifications = all.filter(n => n.type !== 'booking_request');
        this.newRequests = all.filter(n => n.type === 'booking_request' && n.status === 'pending');
        this.treatedRequests = all.filter(n => n.type === 'booking_request' && n.status !== 'pending');
        console.log('[TeacherHome][FRONT] newRequests:', this.newRequests);
        console.log('[TeacherHome][FRONT] treatedRequests:', this.treatedRequests);
      },
      error: (err) => {
        console.error('❌ [FRONT] Ошибка при получении уведомлений:', err);
      }
    });
  }

  private refreshStudents(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    this.lessonService.getConfirmedStudentsForTeacher(userId).subscribe(students => {
      this.confirmedStudents = students;
      console.log('[TeacherHome] Обновлён список confirmedStudents:', students);
    });
  }

  ngOnInit(): void {
    this.refreshStudents();
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
          message: '...pour apparaître dans les résultats de recherche.',
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

    this.refreshCalendar();
    this.refreshNotifications();
  }

  respondToRequest(request: Notification, accepted: boolean): void {
    const metadata = (request as any).data;
    if (!metadata?.lessonId) {
      console.error('❌ Données de requête invalides (lessonId manquant)');
      return;
    }

    console.log('[TeacherHome][FRONT] respondToRequest called for request:', request, 'accepted:', accepted);
    if (accepted) {
      this.lessonService.respondToBooking(metadata.lessonId, accepted).subscribe(() => {
        console.log('[TeacherHome][FRONT] Booking accepted, refreshing notifications, calendar, and students');
        this.refreshStudents();
        this.refreshCalendar();
        this.refreshNotifications();
      });
    } else {
      this.selectedRequest = request;
      this.selectedReason = '';
      this.customReason = '';
      this.showRefuseDialog = true;
    }
  }

  loadMore(): void {
    this.shownRequests = Math.min(this.shownRequests + 5, this.newRequests.length);
  }

  reduce(): void {
    this.shownRequests = 5;
  }

  parseMetadata(content: string): { lessonId: string } | null {
    try {
      const parsed = JSON.parse(content);
      if (parsed.lessonId) return parsed;
    } catch {
      return null;
    }
    return null;
  }

  confirmRefusal(): void {
    if (!this.selectedRequest) return;
    let metadata = this.selectedRequest.data;
    if (!metadata && 'metadata' in this.selectedRequest) {
      metadata = (this.selectedRequest as any).metadata;
    }
    if (!metadata || !metadata.lessonId) return;

    if (this.selectedRefusalMode === 'refuse') {
      const reason = this.selectedReason === 'Autre' ? this.customReason.trim() : this.selectedReason;
      if (!reason) return;
      this.lessonService.respondToBooking(metadata.lessonId, false, reason, false).subscribe(() => {
        this.showRefuseDialog = false;
        this.selectedReason = '';
        this.customReason = '';
        this.selectedRefusalMode = 'refuse';
        this.snackBar.open('Студенту отправлено уведомление об отказе', 'OK', { duration: 3000 });
        this.refreshNotifications();
      });
    } else if (this.selectedRefusalMode === 'propose') {
      if (!this.selectedAlternativeDate || !this.selectedAlternativeTime) return;
      const [hours, minutes] = this.selectedAlternativeTime.split(':').map(Number);
      const proposedDateTime = new Date(this.selectedAlternativeDate);
      proposedDateTime.setHours(hours, minutes, 0, 0);
      this.lessonService.respondToBooking(metadata.lessonId, false, '', true, proposedDateTime.toISOString()).subscribe(() => {
        this.showRefuseDialog = false;
        this.selectedAlternativeDate = undefined;
        this.selectedAlternativeTime = undefined;
        this.selectedRefusalMode = 'refuse';
        this.snackBar.open('Студенту отправлено предложение нового времени', 'OK', { duration: 3000 });
        this.refreshNotifications();
      });
    }
  }

  // Методы для управления уведомлениями (как в student-home)
  hideNotification(notification: any) {
    if (notification.id) {
      this.notificationService.hideNotification(notification.id).subscribe(() => {
        // Удаляем уведомление из локального массива
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
      });
    }
  }

  get visibleNotifications() {
    return this.showMoreNotifications 
      ? this.notifications 
      : this.notifications.slice(0, this.MAX_NOTIFICATIONS);
  }

  get hasMoreNotifications() {
    return this.notifications.length > this.MAX_NOTIFICATIONS;
  }

  toggleShowMore() {
    this.showMoreNotifications = !this.showMoreNotifications;
  }
}
