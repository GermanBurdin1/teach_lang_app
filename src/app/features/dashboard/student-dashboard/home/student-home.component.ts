import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { NotificationService } from '../../../../services/notifications.service';
import { AuthService } from '../../../../services/auth.service';
import { LessonSession } from '../../../../models/lesson-session.model';
import { LessonService } from '../../../../services/lesson.service';

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
  now = new Date();
  cancelReason: string | null = null;
  showModifyModal = false;
  actionType: 'reschedule' | 'cancel' | null = null;
  customCancelReason: string = '';
  notifications: { text: string, teacherId?: string, teacherName?: string }[] = [];
  selectedDateOnly: Date | null = null;
  selectedTimeOnly: string = '';

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private lessonService: LessonService
  ) { }

  ngOnInit(): void {
    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    this.notificationService.getNotificationsForUser(studentId).subscribe(res => {
      console.log('[StudentHomeComponent] RAW notifications from backend:', res);
      this.notifications = res
        .filter(n => n.type === 'booking_response')
        .map((n: any) => {
          console.log('[StudentHomeComponent] notification object:', n);
          console.log('[StudentHomeComponent] teacherName in data:', n.data?.teacherName);
          return {
            text: `${n.title}: ${n.message}`,
            teacherId: n.data?.teacherId,
            teacherName: n.data?.teacherName || ''
          };
        });
      console.log('[StudentHomeComponent] notifications for template:', this.notifications);
      
      // Добавляем обновление календаря при получении уведомления
      this.lessonService.getConfirmedLessons(studentId).subscribe(lessons => {
        this.upcomingLessons = lessons.map(lesson => ({
          start: new Date(lesson.scheduledAt),
          end: new Date(new Date(lesson.scheduledAt).getTime() + 60 * 60 * 1000),
          title: `Cours avec ${lesson.teacherName}`,
          color: { primary: '#3f51b5', secondary: '#e8eaf6' },
          allDay: false
        }));
      });
    });

    // Оставляем начальную загрузку календаря как есть
    this.lessonService.getConfirmedLessons(studentId).subscribe(lessons => {
      this.upcomingLessons = lessons.map(lesson => ({
        start: new Date(lesson.scheduledAt),
        end: new Date(new Date(lesson.scheduledAt).getTime() + 60 * 60 * 1000),
        title: `Cours avec ${lesson.teacherName}`,
        color: { primary: '#3f51b5', secondary: '#e8eaf6' },
        allDay: false
      }));
    });

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
    this.now = new Date(); // обновляем текущий момент
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

  canReschedule(): boolean {
    return !!this.selectedLesson?.end && this.selectedLesson.end >= this.now;
  }

  openModifyModal(): void {
    this.showModal = false;
    this.showModifyModal = true;
    this.actionType = null;
    this.cancelReason = null;
    this.selectedDateOnly = null;
    this.selectedTimeOnly = '';
  }

  closeModifyModal(): void {
    this.showModifyModal = false;
    this.selectedNewDate = null;
    this.cancelReason = null;
    this.actionType = null;
    this.selectedDateOnly = null;
    this.selectedTimeOnly = '';
  }

  submitModification(): void {
    if (this.actionType === 'reschedule' && this.selectedDateOnly && this.selectedTimeOnly) {
      const [hours, minutes] = this.selectedTimeOnly.split(':').map(Number);
      const newDate = new Date(this.selectedDateOnly);
      newDate.setHours(hours, minutes);
      
      // Here you would typically call your service to update the lesson
      console.log('Rescheduling to:', newDate);
      this.rescheduleConfirmed = true;
      this.closeModifyModal();
    } else if (this.actionType === 'cancel') {
      const reason = this.cancelReason === 'autre' ? this.customCancelReason : this.cancelReason;
      // Here you would typically call your service to cancel the lesson
      console.log('Cancelling lesson with reason:', reason);
      this.closeModifyModal();
    }
  }

  onBackFromModify(): void {
    this.closeModifyModal();
    this.showModal = true;
  }

  mapSessionsToEvents(sessions: LessonSession[]): CalendarEvent[] {
    return sessions.map(session => {
      let color;
      switch (session.status) {
        case 'confirmed':
          color = { primary: '#4caf50', secondary: '#e8f5e9' }; // зелёный
          break;
        case 'declined':
          color = { primary: '#f44336', secondary: '#ffebee' }; // красный
          break;
        case 'pending':
        default:
          color = { primary: '#9e9e9e', secondary: '#f5f5f5' }; // серый
          break;
      }

      return {
        start: new Date(session.start),
        end: new Date(session.end),
        title: session.title,
        color,
        meta: { sessionId: session.id, status: session.status }
      };
    });
  }

  makeProfesseurLink(text: string, teacherId: string, teacherName?: string): string {
    // Заменяем 'Le professeur' или 'Votre professeur' на ссылку с именем
    const displayName = teacherName ? `Votre professeur ${teacherName}` : 'Votre professeur';
    const link = `<a href="/student/teachers/${teacherId}" title="voir l'information" style="text-decoration: underline; cursor: pointer;">${displayName}</a>`;
    // Заменяем оба варианта
    return text.replace('Votre professeur', link).replace('Le professeur', link);
  }
}
