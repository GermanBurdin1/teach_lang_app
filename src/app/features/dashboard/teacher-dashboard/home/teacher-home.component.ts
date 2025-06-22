import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { AuthService } from '../../../../services/auth.service';
import { TeacherService } from '../../../../services/teacher.service';
import { NotificationService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notification.model';
import { LessonService } from '../../../../services/lesson.service';
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
    private lessonService: LessonService
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
  }

  respondToRequest(request: Notification, accepted: boolean): void {
    // 🔍 Используем data вместо content
    const metadata = (request as any).data;
    if (!metadata?.lessonId) {
      console.error('❌ Données de requête invalides (lessonId manquant)');
      return;
    }

    if (accepted) {
      this.lessonService.respondToBooking(metadata.lessonId, accepted).subscribe(() => {
        const processed = this.newRequests.find(r => r.id === request.id);
        if (processed) {
          this.treatedRequests.unshift({ ...processed, status: accepted ? 'accepted' : 'rejected' });
        }
        this.newRequests = this.newRequests.filter(r => r.id !== request.id);
        this.refreshCalendar();
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
    const reason = this.selectedReason === 'Autre' ? this.customReason.trim() : this.selectedReason;
    if (!reason || !this.selectedRequest) return;

    const metadata = this.parseMetadata(this.selectedRequest.message);
    if (!metadata) return;

    this.lessonService.respondToBooking(metadata.lessonId, false, reason).subscribe(() => {
      console.log('📤 [FRONT] Rejet envoyé avec raison:', reason);
      this.newRequests = this.newRequests.filter(r => r.id !== this.selectedRequest!.id);
      this.selectedRequest = null;
      this.showRefuseDialog = false;
    });

  }


}
