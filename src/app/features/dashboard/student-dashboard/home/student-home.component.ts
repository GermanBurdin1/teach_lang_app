import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { NotificationService } from '../../../../services/notifications.service';
import { AuthService } from '../../../../services/auth.service';
import { LessonSession } from '../../../../models/lesson-session.model';
import { LessonService } from '../../../../services/lesson.service';
import { Router } from '@angular/router';

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
  notifications: any[] = [];
  selectedDateOnly: Date | null = null;
  selectedTimeOnly: string = '';

  // Новые свойства для управления уведомлениями
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 10;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private lessonService: LessonService,
    private router: Router
  ) { }

  ngOnInit(): void {
    // Проверяем авторизацию
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.id;
    
    console.log('[StudentHome] ngOnInit called, currentUser:', currentUser, 'studentId:', studentId);
    
    if (!studentId) {
      console.warn('[StudentHome] No studentId available, waiting for authentication...');
      // Пробуем через секунду
      setTimeout(() => {
        const retryUser = this.authService.getCurrentUser();
        const retryStudentId = retryUser?.id;
        if (retryStudentId) {
          console.log('[StudentHome] User loaded on retry:', retryUser);
          this.initializeComponent(retryStudentId);
        } else {
          console.error('[StudentHome] Still no user after retry');
        }
      }, 1000);
      return;
    }

    this.initializeComponent(studentId);
  }

  private initializeComponent(studentId: string): void {
    console.log('[StudentHome] Initializing with studentId:', studentId);

    this.notificationService.getNotificationsForUser(studentId).subscribe(res => {
      console.log('[StudentHomeComponent] RAW notifications from backend:', res);
      this.notifications = res
        .filter(n => n.type === 'booking_response' || n.type === 'booking_proposal')
        .map((n: any) => {
          if (n.type === 'booking_proposal') {
            console.log('[StudentHomeComponent] Processing booking_proposal:', n);
            const teacherName = n.data?.teacherName;
            const displayText = teacherName 
              ? `Votre professeur ${teacherName} vous propose ${n.data?.proposedTime ? (new Date(n.data.proposedTime)).toLocaleString('fr-FR') : ''}` 
              : `Le professeur vous propose ${n.data?.proposedTime ? (new Date(n.data.proposedTime)).toLocaleString('fr-FR') : ''}`;
              
            return {
              text: displayText,
              type: n.type,
              lessonId: n.data?.lessonId,
              proposedTime: n.data?.proposedTime,
              teacherId: n.data?.teacherId,
              teacherName: n.data?.teacherName || '',
              accepted: n.data?.accepted || false,
              refused: n.data?.refused || false,
              notification: n
            };
          }
          return {
            text: `${n.title}: ${n.message}`,
            type: n.type,
            teacherId: n.data?.teacherId,
            teacherName: n.data?.teacherName || '',
            notification: n
          };
        });
      console.log('[StudentHomeComponent] notifications for template:', this.notifications);
    });

    // ==================== ЗАГРУЗКА ВСЕХ ЗАЯВОК ДЛЯ КАЛЕНДАРЯ ====================
    this.loadAllLessonsForCalendar(studentId);
  }

  onLessonClick(event: CalendarEvent): void {
    // Если урок подтвержден, переходим к lesson-management
    if (event.meta?.status === 'confirmed' && event.meta?.lessonId) {
      this.router.navigate(['/lessons/student'], { 
        queryParams: { 
          lessonId: event.meta.lessonId,
          tab: 'upcoming' 
        } 
      });
      return;
    }
    
    // Для других статусов показываем модалку с деталями
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
      if (!reason || !this.selectedLesson?.meta?.lessonId) {
        console.error('❌ Raison manquante ou ID de leçon manquant');
        return;
      }
      this.cancelLesson(this.selectedLesson.meta.lessonId, reason);
    }
  }

  canCancelLesson(): boolean {
    if (!this.selectedLesson?.start || !this.selectedLesson?.meta?.status) {
      return false;
    }

    // Можно отменить только подтвержденные уроки
    if (this.selectedLesson.meta.status !== 'confirmed') {
      return false;
    }

    // Проверяем, что урок в будущем
    return this.selectedLesson.start > this.now;
  }

  isCancellationTooLate(): boolean {
    if (!this.selectedLesson?.start) {
      return false;
    }

    const now = new Date();
    const twoHoursBeforeLesson = new Date(this.selectedLesson.start.getTime() - 2 * 60 * 60 * 1000);
    return now > twoHoursBeforeLesson;
  }

  cancelLesson(lessonId: string, reason: string): void {
    // Проверяем, является ли это мок-уроком
    if (lessonId.startsWith('mock-lesson-')) {
      // Мок-имплементация для тестирования
      const isWithinTwoHours = this.isCancellationTooLate();
      const mockResponse = {
        success: true,
        status: isWithinTwoHours ? 'cancelled_by_student_no_refund' : 'cancelled_by_student',
        refundAvailable: !isWithinTwoHours,
        message: isWithinTwoHours 
          ? 'Cours annulé. Comme l\'annulation a eu lieu moins de 2 heures avant le début, aucun remboursement ne sera effectué.'
          : 'Cours annulé. Le remboursement sera effectué dans un délai de 3-5 jours ouvrés.'
      };
      
      setTimeout(() => {
        console.log('✅ [MOCK] Урок отменен:', mockResponse);
        alert(mockResponse.message);
        
        // Удаляем урок из календаря
        this.upcomingLessons = this.upcomingLessons.filter(
          lesson => lesson.meta?.lessonId !== lessonId
        );
        
        this.closeModifyModal();
      }, 500); // Имитируем задержку API
      
      return;
    }

    // Реальный API вызов
    this.lessonService.cancelLesson(lessonId, reason).subscribe({
      next: (response) => {
        console.log('✅ Урок отменен:', response);
        
        // Показываем сообщение пользователю
        alert(response.message || 'Урок успешно отменен');
        
        // Обновляем календарь
        const studentId = this.authService.getCurrentUser()?.id;
        if (studentId) {
          this.lessonService.getConfirmedLessons(studentId).subscribe(lessons => {
            this.upcomingLessons = lessons.map(lesson => ({
              start: new Date(lesson.scheduledAt),
              end: new Date(new Date(lesson.scheduledAt).getTime() + 60 * 60 * 1000),
              title: `Cours avec ${lesson.teacherName}`,
              color: { primary: '#3f51b5', secondary: '#e8eaf6' },
              allDay: false,
              meta: { 
                lessonId: lesson.id, 
                status: lesson.status,
                teacherId: lesson.teacherId,
                teacherName: lesson.teacherName
              }
            }));
          });
        }
        
        this.closeModifyModal();
      },
      error: (error) => {
        console.error('❌ Ошибка при отмене урока:', error);
        alert('Erreur lors de l\'annulation du cours: ' + (error.error?.message || error.message));
      }
    });
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
    // Заменяем 'Le professeur' или 'Votre professeur ИМЯ' на ссылку с именем
    const displayName = teacherName ? `Votre professeur ${teacherName}` : 'Votre professeur';
    const link = `<a href="/student/teachers/${teacherId}" title="voir l'information" style="text-decoration: underline; cursor: pointer;">${displayName}</a>`;
    
    // Сначала заменяем полное совпадение "Votre professeur ИМЯ"
    if (teacherName) {
      const fullMatch = `Votre professeur ${teacherName}`;
      if (text.includes(fullMatch)) {
        return text.replace(fullMatch, link);
      }
    }
    
    // Затем заменяем базовые варианты
    return text.replace('Votre professeur', link).replace('Le professeur', link);
  }

  acceptProposal(notif: any) {
    console.log('[acceptProposal] notif:', notif);
    this.lessonService.studentRespondToProposal({
      lessonId: notif.lessonId,
      accepted: true
    }).subscribe((res) => {
      console.log('[acceptProposal] ответ от сервера:', res);
      notif.accepted = true;
      notif.refused = false;
      // Не вызываем ngOnInit для мгновенного эффекта
    });
  }

  refuseProposal(notif: any) {
    this.lessonService.studentRespondToProposal({
      lessonId: notif.lessonId,
      accepted: false
    }).subscribe((res) => {
      console.log('[refuseProposal] ответ от сервера:', res);
      notif.accepted = false;
      notif.refused = true;
      // Не вызываем ngOnInit для мгновенного эффекта
    });
  }

  hideNotification(notification: any) {
    if (notification.notification?.id) {
      this.notificationService.hideNotification(notification.notification.id).subscribe(() => {
        // Удаляем уведомление из локального массива
        this.notifications = this.notifications.filter(n => n.notification?.id !== notification.notification.id);
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

  // ==================== ЗАГРУЗКА ВСЕХ ЗАЯВОК ДЛЯ КАЛЕНДАРЯ ====================
  
  private loadAllLessonsForCalendar(studentId: string): void {
    // Загружаем отправленные заявки студента для отображения в календаре
    this.lessonService.getStudentSentRequests(studentId).subscribe(requests => {
      console.log('📅 Загружаем все заявки для календаря:', requests);
      
      this.upcomingLessons = requests.map(request => {
        const lessonTime = new Date(request.scheduledAt);
        const endTime = new Date(lessonTime.getTime() + 60 * 60 * 1000);
        
        return {
          start: lessonTime,
          end: endTime,
          title: `${this.getStatusIcon(request.status)} ${request.teacherName}`,
          color: this.getCalendarColor(request.status),
          allDay: false,
          meta: { 
            lessonId: request.lessonId, 
            status: request.status,
            teacherId: request.teacherId,
            teacherName: request.teacherName,
            createdAt: request.createdAt,
            proposedTime: request.proposedTime,
            studentConfirmed: request.studentConfirmed,
            studentRefused: request.studentRefused
          }
        };
      });
      
      // Добавляем тестовые уроки для демонстрации
      this.addMockLessonsForDemo();
      
      console.log('📅 Календарь обновлен:', this.upcomingLessons);
    });
  }

  private getCalendarColor(status: string): { primary: string, secondary: string } {
    switch (status) {
      case 'confirmed': 
        return { primary: '#4caf50', secondary: '#e8f5e9' }; // Зеленый
      case 'rejected': 
        return { primary: '#f44336', secondary: '#ffebee' }; // Красный
      case 'pending': 
        return { primary: '#ff9800', secondary: '#fff3e0' }; // Желтый/оранжевый
      case 'cancelled_by_student':
      case 'cancelled_by_student_no_refund':
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // Серый для отмененных
      case 'in_progress':
        return { primary: '#2196f3', secondary: '#e3f2fd' }; // Синий
      case 'completed':
        return { primary: '#9c27b0', secondary: '#f3e5f5' }; // Фиолетовый
      default: 
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // Серый
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'cancelled_by_student': return '🚫';
      case 'cancelled_by_student_no_refund': return '⛔';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  }

  private addMockLessonsForDemo(): void {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);

    const soonLesson = new Date();
    soonLesson.setHours(soonLesson.getHours() + 1);

    const verySoonLesson = new Date();
    verySoonLesson.setMinutes(verySoonLesson.getMinutes() + 30);

    const mockLessons = [
      {
        start: soonLesson,
        end: new Date(soonLesson.getTime() + 60 * 60 * 1000),
        title: '✅ Mme Dupont (Test - dans 1h)',
        color: { primary: '#4caf50', secondary: '#e8f5e9' },
        allDay: false,
        meta: { 
          lessonId: 'mock-lesson-1', 
          status: 'confirmed',
          teacherId: 'teacher-1',
          teacherName: 'Mme Dupont'
        }
      },
      {
        start: verySoonLesson,
        end: new Date(verySoonLesson.getTime() + 60 * 60 * 1000),
        title: '⏳ M. Moreau (Test - dans 30min)',
        color: { primary: '#ff9800', secondary: '#fff3e0' },
        allDay: false,
        meta: { 
          lessonId: 'mock-lesson-2', 
          status: 'pending',
          teacherId: 'teacher-2',
          teacherName: 'M. Moreau'
        }
      },
      {
        start: tomorrow,
        end: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        title: '❌ Mme Martin (Test - refusé)',
        color: { primary: '#f44336', secondary: '#ffebee' },
        allDay: false,
        meta: { 
          lessonId: 'mock-lesson-3', 
          status: 'rejected',
          teacherId: 'teacher-3',
          teacherName: 'Mme Martin'
        }
      }
    ];

    this.upcomingLessons = [...this.upcomingLessons, ...mockLessons];
  }

}
