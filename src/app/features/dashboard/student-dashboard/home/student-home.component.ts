import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { NotificationService } from '../../../../services/notifications.service';
import { NotificationService as MatNotificationService } from '../../../../services/notification.service';
import { AuthService } from '../../../../services/auth.service';
import { LessonSession } from '../../../../models/lesson-session.model';
import { LessonService } from '../../../../services/lesson.service';
import { GoalsService } from '../../../../services/goals.service';
import { StudentGoal, ExamLevel, CreateGoalDto } from '../../../../models/student-goal.model';
import { Router } from '@angular/router';
import { VideoCallService } from '../../../../services/video-call.service';
import { TeacherService } from '../../../../services/teacher.service';
import { HomeworkService, Homework } from '../../../../services/homework.service';
import { LessonTabsService } from '../../../../services/lesson-tabs.service';

@Component({
  selector: 'app-student-home',
  templateUrl: './student-home.component.html',
  styleUrls: ['./student-home.component.css']
})
export class StudentHomeComponent implements OnInit {
  goal = 'DALF C1 avant le 15 juillet 2025';
  
  // Свойства для целей
  currentGoal: StudentGoal | null = null;
  showGoalModal = false;
  availableExamLevels: ExamLevel[] = [];
  selectedExamLevel: ExamLevel | null = null;
  selectedTargetDate: Date | null = null;
  goalDescription: string = '';
  loadingGoals = false;

  stats = {
    daysActive: 42,
    lessonsCompleted: 18,
    wordsLearned: 87
  };

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

  studentHomework: Homework[] = [];

  constructor(
    private notificationService: NotificationService,
    private matNotificationService: MatNotificationService,
    private authService: AuthService,
    private lessonService: LessonService,
    private goalsService: GoalsService,
    private router: Router,
    private videoCallService: VideoCallService,
    private teacherService: TeacherService,
    private homeworkService: HomeworkService,
    private lessonTabsService: LessonTabsService
  ) { }

  ngOnInit(): void {
    // Обновляем время каждую минуту
    setInterval(() => {
      this.now = new Date();
    }, 60000);

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

    // Загружаем цели студента
    this.loadStudentGoal(studentId);
    this.loadAvailableExamLevels();

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

    // Загрузка реальных домашних заданий
    this.homeworkService.getHomeworkForStudent(studentId).subscribe({
      next: (homework) => {
        this.studentHomework = homework;
        console.log('[StudentHome] Загружены реальные домашние задания:', homework);
      },
      error: (err) => {
        console.error('[StudentHome] Ошибка загрузки домашних заданий:', err);
        this.studentHomework = [];
      }
    });
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
        this.matNotificationService.info(mockResponse.message);
        
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
        this.matNotificationService.success(response.message || 'Урок успешно отменен');
        
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
        this.matNotificationService.error('Erreur lors de l\'annulation du cours: ' + (error.error?.message || error.message));
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



  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЦЕЛЯМИ ====================

  private loadStudentGoal(studentId: string): void {
    this.loadingGoals = true;
    this.goalsService.getActiveGoal(studentId).subscribe({
      next: (goal) => {
        this.currentGoal = goal;
        if (goal) {
          this.goal = `${this.goalsService.getExamLevelDisplayName(goal.examLevel)}${goal.targetDate ? ' avant le ' + new Date(goal.targetDate).toLocaleDateString('fr-FR') : ''}`;
        }
        this.loadingGoals = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la cible:', error);
        this.loadingGoals = false;
      }
    });
  }

  private loadAvailableExamLevels(): void {
    this.goalsService.getAvailableExamLevels().subscribe({
      next: (response) => {
        this.availableExamLevels = response.levels;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des niveaux d\'examen:', error);
      }
    });
  }

  openGoalModal(): void {
    if (this.currentGoal) {
      this.selectedExamLevel = this.currentGoal.examLevel;
      this.selectedTargetDate = this.currentGoal.targetDate ? new Date(this.currentGoal.targetDate) : null;
      this.goalDescription = this.currentGoal.description || '';
    } else {
      this.selectedExamLevel = null;
      this.selectedTargetDate = null;
      this.goalDescription = '';
    }
    this.showGoalModal = true;
  }

  closeGoalModal(): void {
    this.showGoalModal = false;
    this.selectedExamLevel = null;
    this.selectedTargetDate = null;
    this.goalDescription = '';
  }

  saveGoal(): void {
    if (!this.selectedExamLevel) {
      console.error('Niveau d\'examen requis');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.id;
    
    if (!studentId) {
      console.error('Student ID not found');
      return;
    }

    const goalData: CreateGoalDto & { studentId: string } = {
      examLevel: this.selectedExamLevel,
      targetDate: this.selectedTargetDate ? this.selectedTargetDate.toISOString() : undefined,
      description: this.goalDescription.trim() || undefined,
      studentId: studentId
    };

    this.loadingGoals = true;
    this.goalsService.createGoal(goalData).subscribe({
      next: (newGoal) => {
        this.currentGoal = newGoal;
        this.goal = `${this.goalsService.getExamLevelDisplayName(newGoal.examLevel)}${newGoal.targetDate ? ' avant le ' + new Date(newGoal.targetDate).toLocaleDateString('fr-FR') : ''}`;
        this.closeGoalModal();
        this.loadingGoals = false;
        console.log('Objectif sauvegardé avec succès:', newGoal);
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde de l\'objectif:', error);
        this.loadingGoals = false;
      }
    });
  }

  getExamLevelDisplayName(level: ExamLevel): string {
    return this.goalsService.getExamLevelDisplayName(level);
  }

  // Получить ближайший урок
  getNextLesson(): CalendarEvent | null {
    const now = new Date();
    const confirmedLessons = this.upcomingLessons.filter(lesson => 
      lesson.meta?.status === 'confirmed' && 
      lesson.start > now
    );
    
    if (confirmedLessons.length === 0) return null;
    
    return confirmedLessons.sort((a, b) => 
      a.start.getTime() - b.start.getTime()
    )[0];
  }

  // Проверка можно ли войти в класс (в день занятия)
  canEnterClass(event: CalendarEvent): boolean {
    const status = event.meta?.status;
    if (status === 'confirmed') {
      // Старое поведение: только в день урока
      const now = new Date();
      const lessonTime = event.start;
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lessonDate = new Date(lessonTime.getFullYear(), lessonTime.getMonth(), lessonTime.getDate());
      return nowDate.getTime() === lessonDate.getTime();
    }
    // Новое: разрешить вход только если статус in_progress
    return status === 'in_progress';
  }

  // Вход в виртуальный класс
  async enterVirtualClass(event: CalendarEvent): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId || !event.meta?.lessonId) return;

    // Устанавливаем данные урока в VideoCallService
    this.videoCallService.setLessonData(event.meta.lessonId, currentUserId);

    // Загружаем задачи, вопросы и материалы для урока
    const [tasks, questions, materials] = await Promise.all([
      this.lessonService.getTasksForLesson(event.meta.lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(event.meta.lessonId).toPromise(),
      this.lessonService.getLessonDetails(event.meta.lessonId).toPromise().then(l => l.materials || [])
    ]);

    // Разделяем задачи и вопросы по ролям
    const studentTasks = (tasks || []).filter((t: any) => t.createdByRole === 'student').map((t: any) => t.title);
    const teacherTasks = (tasks || []).filter((t: any) => t.createdByRole === 'teacher').map((t: any) => t.title);
    const studentQuestions = (questions || []).filter((q: any) => q.createdByRole === 'student').map((q: any) => q.question);
    const teacherQuestions = (questions || []).filter((q: any) => q.createdByRole === 'teacher').map((q: any) => q.question);

    this.lessonTabsService.setCurrentLessonData({
      id: event.meta.lessonId,
      date: event.start,
      teacherTasks: teacherTasks,
      studentTasks: studentTasks,
      studentQuestions: studentQuestions,
      teacherQuestions: teacherQuestions,
      materials: materials,
      texts: materials.filter((m: any) => m.type === 'text'),
      audios: materials.filter((m: any) => m.type === 'audio'),
      videos: materials.filter((m: any) => m.type === 'video'),
      homework: []
    });

    this.router.navigate([`/classroom/${event.meta.lessonId}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  // Получить количество минут до урока
  getMinutesUntilLesson(event: CalendarEvent): number {
    const diffInMs = event.start.getTime() - this.now.getTime();
    return Math.round(diffInMs / (1000 * 60));
  }

}
