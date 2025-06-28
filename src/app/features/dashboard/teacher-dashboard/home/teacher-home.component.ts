import { Component, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { AuthService } from '../../../../services/auth.service';
import { TeacherService } from '../../../../services/teacher.service';
import { NotificationService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notification.model';
import { LessonService, TeacherTimeSlot } from '../../../../services/lesson.service';
import { GoalsService } from '../../../../services/goals.service';
import { StudentGoal, ExamLevel } from '../../../../models/student-goal.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { VideoCallService } from '../../../../services/video-call.service';

@Component({
  selector: 'app-teacher-home',
  templateUrl: './teacher-home.component.html',
  styleUrls: ['./teacher-home.component.css']
})
export class TeacherHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private authService: AuthService,
    private teacherService: TeacherService,
    private notificationService: NotificationService,
    private lessonService: LessonService,
    private goalsService: GoalsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private ngZone: NgZone,
    private videoCallService: VideoCallService
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
  teacherAlternativeSchedule: TeacherTimeSlot[] = [];

  // Новые свойства для управления уведомлениями (как в student-home)
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 10;

  // Новые свойства для управления обработанными заявками
  showMoreTreatedRequests = false;
  readonly MAX_TREATED_REQUESTS = 10;

  // Новые свойства для модалки студента
  selectedStudent: any = null;
  showStudentModal = false;

  // Текущее время для шаблонов
  now = new Date();

  private refreshCalendar(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome] refreshCalendar: requesting all confirmed lessons for teacher', userId);
    this.lessonService.getAllConfirmedLessonsForTeacher(userId).subscribe(lessons => {
      console.log('[TeacherHome] Все подтверждённые занятия:', lessons);
      this.upcomingLessons = lessons.map(lesson => ({
        start: new Date(lesson.scheduledAt),
        end: new Date(new Date(lesson.scheduledAt).getTime() + 60 * 60 * 1000),
        title: `${this.getStatusIcon(lesson.status)} ${lesson.studentName}`,
        color: this.getCalendarColor(lesson.status),
        allDay: false,
        meta: { 
          lessonId: lesson.id,
          status: lesson.status,
          studentId: lesson.studentId,
          studentName: lesson.studentName
        }
              }));
    });
  }



  private refreshNotifications(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome][FRONT] refreshNotifications called for userId:', userId);
    this.notificationService.getNotificationsForUser(userId).subscribe({
      next: (all) => {
        console.log('[TeacherHome][FRONT] notifications from backend:', all);
        // Фильтруем уведомления: исключаем booking_request, но включаем lesson_cancelled_by_student
        this.notifications = all.filter(n => 
          n.type !== 'booking_request'
        );
        this.newRequests = all.filter(n => n.type === 'booking_request' && n.status === 'pending');
        this.treatedRequests = all.filter(n => n.type === 'booking_request' && n.status !== 'pending');
        console.log('[TeacherHome][FRONT] notifications:', this.notifications);
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
    
    // Обновляем время каждую минуту
    setInterval(() => {
      this.now = new Date();
    }, 60000);
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

    // Добавляем мок-уведомления об отмене для демонстрации
    const mockCancellationNotifications: Notification[] = [
      {
        id: 'mock-cancel-1',
        user_id: userId,
        title: '❌ Pierre Martin a annulé le cours',
        message: 'Pierre Martin a annulé le cours prévu le 15/01/2025 à 14:00. Raison: Je suis malade (remboursement prévu)',
        type: 'lesson_cancelled_by_student',
        status: 'unread',
        data: {
          lessonId: 'lesson-123',
          studentId: 'student-456',
          studentName: 'Pierre Martin',
          refundAvailable: true,
          reason: 'Je suis malade'
        }
      },
      {
        id: 'mock-cancel-2',
        user_id: userId,
        title: '⚠️ Sophie Dubois a annulé le cours',
        message: 'Sophie Dubois a annulé le cours prévu le 16/01/2025 à 10:00. Raison: Urgence personnelle (pas de remboursement)',
        type: 'lesson_cancelled_by_student',
        status: 'unread',
        data: {
          lessonId: 'lesson-789',
          studentId: 'student-101',
          studentName: 'Sophie Dubois',
          refundAvailable: false,
          reason: 'Urgence personnelle'
        }
      }
    ];

    this.notifications = [...mockCancellationNotifications, ...this.notifications];

    this.notificationService.getNotificationsForUser(userId).subscribe({
      next: (all) => {
        console.log('🔔 [FRONT] Ответ от сервера:', all);
        // Объединяем реальные уведомления с мок-уведомлениями об отмене
        const realNotifications = all.filter(n => n.type !== 'booking_request');
        this.notifications = [...mockCancellationNotifications, ...realNotifications];
        this.newRequests = all.filter(n => n.type === 'booking_request' && n.status === 'pending');
        this.treatedRequests = all.filter(n => n.type === 'booking_request' && n.status !== 'pending');
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

  onAlternativeDateChange() {
    this.selectedAlternativeTime = '';
    this.loadAvailableSlots();
  }

  loadAvailableSlots() {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId || !this.selectedAlternativeDate) return;
    
    const dateStr = this.selectedAlternativeDate.toISOString().split('T')[0];
    this.lessonService.getAvailableSlots(teacherId, dateStr).subscribe({
      next: (slots) => {
        // Фильтруем прошедшие слоты
        const now = new Date();
        if (!this.selectedAlternativeDate) {
          this.teacherAlternativeSchedule = slots;
          return;
        }
        
        const currentDate = this.selectedAlternativeDate.toDateString();
        const todayDate = now.toDateString();
        
        if (currentDate === todayDate) {
          // Если выбран сегодняшний день, фильтруем прошедшие часы
          this.teacherAlternativeSchedule = slots.filter(slot => {
            const [hours, minutes] = slot.time.split(':').map(Number);
            const slotDateTime = new Date(
              this.selectedAlternativeDate!.getFullYear(),
              this.selectedAlternativeDate!.getMonth(),
              this.selectedAlternativeDate!.getDate(),
              hours,
              minutes
            );
            return slotDateTime > now;
          });
        } else {
          // Если выбран не сегодняшний день, показываем все слоты
          this.teacherAlternativeSchedule = slots;
        }
        
        console.log('✅ Planning alternatif du professeur chargé (filtré):', this.teacherAlternativeSchedule);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du planning alternatif:', error);
        this.teacherAlternativeSchedule = [];
      }
    });
  }

  selectAlternativeTimeSlot(time: string) {
    this.selectedAlternativeTime = time;
  }

  // Методы для шаблона альтернативного времени
  hasNoAlternativeSlots(): boolean {
    return this.teacherAlternativeSchedule.length > 0 && !this.teacherAlternativeSchedule.some(s => s.available);
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
        this.teacherAlternativeSchedule = [];
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

  // Методы для управления обработанными заявками
  hideTreatedRequest(request: any) {
    if (request.id) {
      this.notificationService.hideNotification(request.id).subscribe(() => {
        // Удаляем заявку из локального массива
        this.treatedRequests = this.treatedRequests.filter(r => r.id !== request.id);
      });
    }
  }

  get visibleTreatedRequests() {
    return this.showMoreTreatedRequests 
      ? this.treatedRequests 
      : this.treatedRequests.slice(0, this.MAX_TREATED_REQUESTS);
  }

  get hasMoreTreatedRequests() {
    return this.treatedRequests.length > this.MAX_TREATED_REQUESTS;
  }

  toggleShowMoreTreatedRequests() {
    this.showMoreTreatedRequests = !this.showMoreTreatedRequests;
  }

  // Методы для модалки студента
  openStudentModal(student: any): void {
    this.selectedStudent = { ...student, loadingGoal: true };
    this.showStudentModal = true;
    
    // Загружаем информацию о целях студента
    if (student.id) {
      this.goalsService.getActiveGoal(student.id).subscribe({
        next: (goal: StudentGoal | null) => {
          this.selectedStudent = {
            ...this.selectedStudent,
            goal: goal,
            goalDisplayText: goal ? this.getGoalDisplayText(goal) : 'Aucun objectif défini',
            loadingGoal: false
          };
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'objectif de l\'étudiant:', error);
          this.selectedStudent = {
            ...this.selectedStudent,
            goalDisplayText: 'Erreur lors du chargement de l\'objectif',
            loadingGoal: false
          };
        }
      });
    } else {
      this.selectedStudent.loadingGoal = false;
      this.selectedStudent.goalDisplayText = 'Aucun objectif défini';
    }
  }

  closeStudentModal(): void {
    this.showStudentModal = false;
    this.selectedStudent = null;
  }

  // Извлечение имени студента из уведомления
  getStudentNameFromNotification(notification: any): string {
    return notification.data?.studentName || 'Étudiant';
  }

  // Извлечение ID студента из уведомления
  getStudentIdFromNotification(notification: any): string {
    return notification.data?.studentId || '';
  }

  // Обработка клика по уведомлению
  onNotificationClick(event: any, notification: any): void {
    // Проверяем, был ли клик по кликабельному элементу студента
    if (event.target && event.target.classList.contains('student-name-clickable')) {
      this.onStudentNameClick(notification);
    }
  }

  // Обработка клика по имени студента в уведомлениях
  onStudentNameClick(notification: any): void {
    const studentInfo = {
      id: this.getStudentIdFromNotification(notification),
      name: this.getStudentNameFromNotification(notification),
      lessonId: notification.data?.lessonId,
      // Дополнительные данные из уведомления
      ...notification.data
    };
    this.openStudentModal(studentInfo);
  }

  // Обработка клика по студенту в заявках
  onStudentRequestClick(request: any): void {
    const studentInfo = {
      id: request.data?.studentId || '',
      name: request.data?.studentName || request.title,
      lessonId: request.data?.lessonId,
      ...request.data
    };
    this.openStudentModal(studentInfo);
  }

  // Навигация к уроку
  navigateToLesson(lessonId: string): void {
    this.router.navigate(['/lessons/teacher'], { 
      queryParams: { 
        lessonId: lessonId,
        tab: 'upcoming' 
      } 
    });
  }

  // Обработка клика по событию календаря
  onCalendarEventClick(event: CalendarEvent): void {
    if (event.meta?.lessonId) {
      this.navigateToLesson(event.meta.lessonId);
    }
  }

  // Создание кликабельных имен студентов в уведомлениях
  makeStudentNameClickable(message: string, notification: any): string {
    const studentName = this.getStudentNameFromNotification(notification);
    
    if (!studentName || studentName === 'Étudiant') {
      return `<strong>${notification.title}</strong><br><small>${message}</small>`;
    }
    
    // Создаем кликабельный элемент для имени студента
    const clickableMessage = message.replace(
      studentName, 
      `<span class="student-name-clickable" 
         data-notification-id="${notification.id}"
         style="color: #1976d2; text-decoration: underline; cursor: pointer; font-weight: bold;">
         ${studentName}
       </span>`
    );
    
    return `<strong>${notification.title}</strong><br><small>${clickableMessage}</small>`;
  }

  ngAfterViewInit(): void {
    // Больше не нужен глобальный слушатель событий
  }

  ngOnDestroy(): void {
    // Больше не нужно удалять слушатель
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

  private getGoalDisplayText(goal: StudentGoal): string {
    const examLevel = this.goalsService.getExamLevelDisplayName(goal.examLevel);
    const targetDate = goal.targetDate ? ` avant le ${new Date(goal.targetDate).toLocaleDateString('fr-FR')}` : '';
    return `${examLevel}${targetDate}`;
  }

  // Методы для отображения в модальном окне
  getExamLevelDisplay(examLevel: string): string {
    return this.goalsService.getExamLevelDisplayName(examLevel as ExamLevel);
  }

  formatTargetDate(targetDate: string): string {
    return new Date(targetDate).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    if (event.meta?.status !== 'confirmed') return false;
    
    const now = new Date();
    const lessonTime = event.start;
    
    // Проверяем что урок в тот же день
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lessonDate = new Date(lessonTime.getFullYear(), lessonTime.getMonth(), lessonTime.getDate());
    
    return nowDate.getTime() === lessonDate.getTime();
  }

  // Вход в виртуальный класс
  enterVirtualClass(event: CalendarEvent): void {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId || !event.meta?.lessonId) return;

    // Устанавливаем данные урока в VideoCallService
    this.videoCallService.setLessonData(event.meta.lessonId, currentUserId);
    
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
