import { Component, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { AuthService } from '../../../../services/auth.service';
import { RoleService } from '../../../../services/role.service';
import { TeacherService } from '../../../../services/teacher.service';
import { NotificationService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notification.model';
import { LessonService, TeacherTimeSlot } from '../../../../services/lesson.service';
import { GoalsService } from '../../../../services/goals.service';
import { StudentGoal, ExamLevel } from '../../../../models/student-goal.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { VideoCallService } from '../../../../services/video-call.service';
import { LessonTabsService } from '../../../../services/lesson-tabs.service';
import { MaterialService } from '../../../../services/material.service';
import { HomeworkService, Homework } from '../../../../services/homework.service';

interface Student {
  id: string;
  name: string;
  email?: string;
  studentId?: string;
  nextLessonDate?: string | Date | null;
  photoUrl?: string;
  goals?: string[];
  homework?: Array<{
    title: string;
    status: string;
  }>;
  history?: Array<{
    date: string;
    topic: string;
  }>;
  metadata?: {
    studentName?: string;
  };
  lessons?: unknown[];
  requestDate?: string;
  [key: string]: unknown;
}

interface _BookingRequest {
  id: string;
  type: string;
  status: string;
  message?: string;
  data?: {
    lessonId?: string;
  };
  metadata?: {
    studentName?: string;
    lessonId?: string;
  };
  [key: string]: unknown;
}

interface _Material {
  id: string;
  type: string;
  title?: string;
  [key: string]: unknown;
}

interface _Task {
  id: string;
  title: string;
  createdByRole: string;
  [key: string]: unknown;
}

interface _Question {
  id: string;
  question: string;
  createdByRole: string;
  [key: string]: unknown;
}
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NavigationGuardService } from '../../../../services/navigation-guard.service';
import { catchError, finalize, from, Observable, of, switchMap } from 'rxjs';

@Component({
  selector: 'app-teacher-home',
  templateUrl: './teacher-home.component.html',
  styleUrls: ['./teacher-home.component.css']
})
export class TeacherHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private teacherService: TeacherService,
    private notificationService: NotificationService,
    private lessonService: LessonService,
    private goalsService: GoalsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private ngZone: NgZone,
    private videoCallService: VideoCallService,
    private lessonTabsService: LessonTabsService,
    private materialService: MaterialService,
    private homeworkService: HomeworkService,
    private sanitizer: DomSanitizer,
    private navigationGuard: NavigationGuardService
  ) { }

  // notifications: string[] = [
  //   'Un nouvel avis a été laissé sur votre profil.',
  //   'Votre profil a été mis en avant cette semaine.'
  // ];
  newRequests: Notification[] = [];
  notifications: Notification[] = [];
  untreatedRequests: Notification[] = []; // Новый массив для просроченных unread заявок

  // newRequests = [
  //   { name: 'Claire Martin', date: '21/05/2025' },
  //   { name: 'Julien Lefevre', date: '20/05/2025' }
  // ];

  // Homework properties
  teacherHomework: Homework[] = [];
  homeworksToReview: Homework[] = [];
  loadingHomework = false;
  photoUrl$!: Observable<string>;

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
  confirmedStudents: Student[] = [];
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

  // Новые свойства для управления необработанными заявками
  showMoreUntreatedRequests = false;
  readonly MAX_UNTREATED_REQUESTS = 10;

  // Новые свойства для модалки студента
  selectedStudent: Student | null = null;
  showStudentModal = false;

  // Текущее время для шаблонов
  now = new Date();

  notificationsCollapsed = false;
  homeworkCollapsed = false;

  // Проверяет, что дата урока в будущем (актуальная)
  private isLessonDateValid(notification: Notification): boolean {
    try {
      const scheduledAt = notification.data?.scheduledAt;
      if (!scheduledAt) {
        console.warn('[TeacherHome] scheduledAt не найден в уведомлении:', notification);
        return false;
      }

      const lessonDate = new Date(scheduledAt);
      const now = new Date();

      // Проверяем, что дата урока в будущем
      const isValid = lessonDate > now;

      if (!isValid) {
        console.log('[TeacherHome] Уведомление отфильтровано (дата прошла):', {
          lessonDate: lessonDate.toLocaleString('fr-FR'),
          now: now.toLocaleString('fr-FR'),
          notificationTitle: notification.title
        });
      }

      return isValid;
    } catch (error) {
      console.error('[TeacherHome] Ошибка при проверке даты урока:', error, notification);
      return false;
    }
  }

  private refreshCalendar(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome] refreshCalendar: requesting all confirmed lessons for teacher', userId);
    this.lessonService.getAllConfirmedLessonsForTeacher(userId).subscribe(lessons => {
      console.log('[TeacherHome] Все подтверждённые занятия:', lessons);
      this.upcomingLessons = (lessons as unknown[]).map(lesson => {
        const lessonData = lesson as {
          scheduledAt?: string,
          status?: string,
          studentName?: string,
          id?: string,
          studentId?: string
        };
        return {
          start: new Date(lessonData.scheduledAt || new Date()),
          end: new Date(new Date(lessonData.scheduledAt || new Date()).getTime() + 60 * 60 * 1000),
          title: `${this.getStatusIcon(lessonData.status || '')} ${lessonData.studentName || ''}`,
          color: this.getCalendarColor(lessonData.status || ''),
          allDay: false,
          meta: {
            lessonId: lessonData.id,
            status: lessonData.status,
            studentId: lessonData.studentId,
            studentName: lessonData.studentName
          }
        };
      });
    });
  }

  private refreshNotifications(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome][FRONT] refreshNotifications called for userId:', userId);
    this.notificationService.getNotificationsForUser(userId).subscribe({
      next: (all) => {
        console.log('🔔 [FRONT] Ответ от сервера:', all);
        this.notifications = all.filter(n => n.type !== 'booking_request');

        // Фильтруем новые запросы: только pending и с актуальной датой (в будущем)
        this.newRequests = all.filter(n => {
          if (n.type !== 'booking_request' || n.status !== 'pending') {
            return false;
          }

          // Проверяем актуальность даты урока
          return this.isLessonDateValid(n);
        });

        // Необработанные заявки: unread со просроченной датой
        this.untreatedRequests = all.filter(n => {
          if (n.type !== 'booking_request' || n.status !== 'unread') {
            return false;
          }

          // Проверяем что дата урока уже прошла
          return !this.isLessonDateValid(n);
        });

        this.treatedRequests = all.filter(n => n.type === 'booking_request' && n.status !== 'pending' && n.status !== 'unread');
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
      this.confirmedStudents = students as Student[];
      console.log('[TeacherHome] Обновлён список confirmedStudents:', students);
    });
  }

  private loadTeacherHomework(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.loadingHomework = true;
    console.log('[TeacherHome] Loading homework for teacher:', userId);

    this.homeworkService.getHomeworkForTeacher(userId).subscribe({
      next: (homework: Homework[]) => {
        console.log('[TeacherHome] Loaded teacher homework:', homework);
        this.teacherHomework = homework;

        // Фильтруем homework для проверки (выполненные, но еще не оцененные)
        this.homeworksToReview = homework.filter((hw: Homework) => {
          // Исключаем уже оцененные домашние задания
          if (hw.grade !== null && hw.grade !== undefined) {
            return false;
          }

          // Включаем задания со статусом submitted, completed, или finished с ответом студента
          return hw.status === 'submitted' ||
            hw.status === 'completed' ||
            (hw.status === 'finished' && hw.studentResponse && hw.studentResponse.trim().length > 0) ||
            (hw.status === 'unfinished' && this.isHomeworkOverdue(hw));
        });

        console.log('[TeacherHome] Homework status breakdown:', {
          total: homework.length,
          submitted: homework.filter(hw => hw.status === 'submitted').length,
          completed: homework.filter(hw => hw.status === 'completed').length,
          finished: homework.filter(hw => hw.status === 'finished').length,
          finishedWithResponse: homework.filter(hw => hw.status === 'finished' && hw.studentResponse).length,
          unfinished: homework.filter(hw => hw.status === 'unfinished').length,
          toReview: this.homeworksToReview.length
        });

        console.log('[TeacherHome] Homework to review:', this.homeworksToReview);
        this.loadingHomework = false;
      },
      error: (error: unknown) => {
        console.error('[TeacherHome] Error loading homework:', error);
        this.loadingHomework = false;
      }
    });
  }

  selectedPhotoFile: File | null = null;
  selectedPhotoUrl: string | null = null;
  isUploading = false;
  uploadError = '';

  private loadTeacherPhoto(): void {
    const userId = this.authService.getCurrentUser()?.id;

    if (!userId) return;


    this.photoUrl$ = this.teacherService.getTeacherPhoto(userId).pipe(
      catchError(() => of('assets/default-avatar.png'))
    );
  }

  onImgError(e: Event) {
    const img = e.target as HTMLImageElement;
    // защита от зацикливания, если вдруг плейсхолдер тоже не загрузится
    if (!img.src.includes('assets/default-avatar.png')) {
      img.src = 'assets/default-avatar.png';
    }
  }

  openPhotoPicker(inputEl: HTMLInputElement) {
    inputEl.click();
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    // Примитивная валидация
    if (!file.type.startsWith('image/')) {
      this.uploadError = 'Файл должен быть изображением.';
      return;
    }
    const maxMb = 5;
    if (file.size > maxMb * 1024 * 1024) {
      this.uploadError = `Макс. размер ${maxMb} МБ.`;
      return;
    }

    this.uploadError = '';
    this.selectedPhotoFile = file;

    // Preview: лучше ObjectURL, чем base64
    if (this.selectedPhotoUrl) URL.revokeObjectURL(this.selectedPhotoUrl);
    this.selectedPhotoUrl = URL.createObjectURL(file);
  }

  private fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string); // data:image/...;base64,AAAA
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  uploadSelected() {
    if (!this.selectedPhotoFile) return;
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.isUploading = true;
    this.uploadError = '';

    from(this.fileToDataURL(this.selectedPhotoFile)).pipe(
      // Если бэкенду нужен ЧИСТЫЙ base64 без префикса:
      // map(dataUrl => dataUrl.split(',')[1]),
      switchMap((dataUrl) => this.teacherService.uploadPhoto(userId, dataUrl)),
      finalize(() => (this.isUploading = false))
    ).subscribe({
      next: () => {
        this.loadTeacherPhoto();   // перезагрузим фото с сервера
        this.cleanupSelection();   // очистим превью/файл
        console.log('[Photo] Mise à jour réussie');
      },
      error: (err) => {
        this.uploadError = 'Ошибка загрузки фото.';
        console.error(err);
      },
    });
  }

  cancelSelected() {
    this.cleanupSelection();
  }

  private cleanupSelection() {
    if (this.selectedPhotoUrl) URL.revokeObjectURL(this.selectedPhotoUrl);
    this.selectedPhotoUrl = null;
    this.selectedPhotoFile = null;
  }

  isHomeworkOverdue(homework: Homework): boolean {
    if (!homework.dueDate) return false;
    const now = new Date();
    const dueDate = new Date(homework.dueDate);
    return now > dueDate;
  }

  goToHomeworkReview(homework: Homework): void {
    // Переходим к homework в trainer компоненте со специальными параметрами для преподавателя
    this.router.navigate(['/teacher/trainer'], {
      queryParams: {
        tab: 'homework',
        homeworkId: homework.id,
        mode: 'review' // Специальный режим для преподавателей
      }
    });
  }

  getDaysOverdue(homework: Homework): number {
    if (!homework.dueDate) return 0;
    const now = new Date();
    const dueDate = new Date(homework.dueDate);
    const diffTime = now.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getOverdueCount(): number {
    return this.teacherHomework.filter(hw =>
      hw.status === 'unfinished' && this.isHomeworkOverdue(hw)
    ).length;
  }

  getSubmittedCount(): number {
    return this.teacherHomework.filter(hw =>
      hw.status === 'submitted' ||
      hw.status === 'completed' ||
      (hw.status === 'finished' && hw.studentResponse) // ✨ Включаем finished со studentResponse
    ).length;
  }

  ngOnInit(): void {
    // Проверяем роль пользователя
    if (!this.roleService.isTeacher()) {
      console.warn('[TeacherHome] Access denied: User is not a teacher');
      this.router.navigate(['/unauthorized']);
      return;
    }

    // Активируем защиту навигации для личного кабинета
    this.navigationGuard.enableNavigationGuard();

    this.refreshStudents();

    // Обновляем время каждую минуту
    setInterval(() => {
      this.now = new Date();
    }, 60000);

    // chargement de la photo
    this.loadTeacherPhoto();

    // Загружаем homework для преподавателя
    this.loadTeacherHomework();

    // Подписываемся на обновления homework
    this.homeworkService.onHomeworkUpdated().subscribe(() => {
      console.log('[TeacherHome] Homework updated, reloading...');
      this.loadTeacherHomework();
    });

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

        // Фильтруем новые запросы: только pending и с актуальной датой (в будущем)
        this.newRequests = all.filter(n => {
          if (n.type !== 'booking_request' || n.status !== 'pending') {
            return false;
          }

          // Проверяем актуальность даты урока
          return this.isLessonDateValid(n);
        });

        // Необработанные заявки: unread со просроченной датой
        this.untreatedRequests = all.filter(n => {
          if (n.type !== 'booking_request' || n.status !== 'unread') {
            return false;
          }

          // Проверяем что дата урока уже прошла
          return !this.isLessonDateValid(n);
        });

        this.treatedRequests = all.filter(n => n.type === 'booking_request' && n.status !== 'pending' && n.status !== 'unread');
      },
      error: (err) => {
        console.error('❌ [FRONT] Ошибка при получении уведомлений:', err);
      }
    });

    this.refreshCalendar();
    this.refreshNotifications();
  }

  respondToRequest(request: Notification, accepted: boolean): void {
    const metadata = request.data;
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
      metadata = (this.selectedRequest as { metadata?: { lessonId?: string } }).metadata;
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
  hideNotification(notification: Notification) {
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
  hideTreatedRequest(request: Notification) {
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

  // Методы для управления необработанными заявками
  hideUntreatedRequest(request: Notification) {
    if (request.id) {
      this.notificationService.hideNotification(request.id).subscribe(() => {
        // Удаляем заявку из локального массива
        this.untreatedRequests = this.untreatedRequests.filter(r => r.id !== request.id);
      });
    }
  }

  get visibleUntreatedRequests() {
    return this.showMoreUntreatedRequests
      ? this.untreatedRequests
      : this.untreatedRequests.slice(0, this.MAX_UNTREATED_REQUESTS);
  }

  get hasMoreUntreatedRequests() {
    return this.untreatedRequests.length > this.MAX_UNTREATED_REQUESTS;
  }

  toggleShowMoreUntreatedRequests() {
    this.showMoreUntreatedRequests = !this.showMoreUntreatedRequests;
  }

  // Методы для модалки студента
  openStudentModal(student: Student): void {
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
          } as Student;
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'objectif de l\'étudiant:', error);
          this.selectedStudent = {
            ...this.selectedStudent,
            goalDisplayText: 'Erreur lors du chargement de l\'objectif',
            loadingGoal: false
          } as Student;
        }
      });
    } else {
      (this.selectedStudent as Student & { loadingGoal?: boolean, goalDisplayText?: string })['loadingGoal'] = false;
      (this.selectedStudent as Student & { loadingGoal?: boolean, goalDisplayText?: string })['goalDisplayText'] = 'Aucun objectif défini';
    }
  }

  closeStudentModal(): void {
    this.showStudentModal = false;
    this.selectedStudent = null;
  }

  // Извлечение имени студента из уведомления
  getStudentNameFromNotification(notification: Notification): string {
    return notification.data?.studentName || 'Étudiant';
  }

  // Извлечение ID студента из уведомления
  getStudentIdFromNotification(notification: Notification): string {
    return notification.data?.studentId || '';
  }

  // Обработка клика по уведомлению
  onNotificationClick(event: Event, notification: Notification): void {
    // Проверяем, был ли клик по кликабельному элементу студента
    if (event.target && (event.target as Element).classList?.contains('student-name-clickable')) {
      this.onStudentNameClick(notification);
    }
  }

  // Обработка клика по имени студента в уведомлениях
  onStudentNameClick(notification: Notification): void {
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
  onStudentRequestClick(request: Notification): void {
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
  makeStudentNameClickable(message: string, notification: Notification): SafeHtml {
    const studentName = this.getStudentNameFromNotification(notification);

    // Экранируем входящие данные
    const safeMessage = this.escapeHtml(message);
    const safeTitle = this.escapeHtml(notification.title);
    const safeNotificationId = this.escapeHtml(notification.id);

    if (!studentName || studentName === 'Étudiant') {
      const result = `<strong>${safeTitle}</strong><br><small>${safeMessage}</small>`;
      return this.sanitizer.bypassSecurityTrustHtml(result);
    }

    // Экранируем имя студента и создаем безопасную ссылку
    const safeStudentName = this.escapeHtml(studentName);
    const clickableMessage = safeMessage.replace(
      safeStudentName,
      `<span class="student-name-clickable"
         data-notification-id="${safeNotificationId}"
         style="color: #1976d2; text-decoration: underline; cursor: pointer; font-weight: bold;">
         ${safeStudentName}
       </span>`
    );

    const result = `<strong>${safeTitle}</strong><br><small>${clickableMessage}</small>`;
    return this.sanitizer.bypassSecurityTrustHtml(result);
  }

  private escapeHtml(text: string): string {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  ngAfterViewInit(): void {
    // Больше не нужен глобальный слушатель событий
  }

  ngOnDestroy(): void {
    // Отключаем защиту навигации при уходе с компонента
    this.navigationGuard.disableNavigationGuard();
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

  private async getMaterialsForLesson(lessonId: string): Promise<_Material[]> {
    try {
      console.log('🔍 [TeacherHome] Загружаем материалы для урока:', lessonId);
      const allMaterials = await this.materialService.getMaterials().toPromise();
      console.log('📦 [TeacherHome] Все материалы получены:', allMaterials);

      if (!allMaterials || allMaterials.length === 0) {
        console.warn('⚠️ [TeacherHome] Материалы не найдены или список пуст. Возможно file-service не запущен?');
        return [];
      }

      const filteredMaterials = allMaterials.filter(material => {
        const isAttached = material.attachedLessons && material.attachedLessons.includes(lessonId);
        return isAttached;
      });

      console.log('✅ [TeacherHome] Отфильтрованные материалы для урока:', filteredMaterials);
      return filteredMaterials as unknown as _Material[];
    } catch (error) {
      console.error('❌ [TeacherHome] Ошибка загрузки материалов для урока:', error);
      return [];
    }
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
      this.getMaterialsForLesson(event.meta.lessonId)
    ]);

    // Разделяем задачи и вопросы по ролям
    const tasksArray = (tasks || []) as unknown[];
    const questionsArray = (questions || []) as unknown[];

    const studentTasks = tasksArray.filter((t: unknown) => (t as { createdByRole?: string }).createdByRole === 'student').map((t: unknown) => ({ id: (t as { id?: string }).id || '', title: (t as { title?: string }).title || '' }));
    const teacherTasks = tasksArray.filter((t: unknown) => (t as { createdByRole?: string }).createdByRole === 'teacher').map((t: unknown) => ({ id: (t as { id?: string }).id || '', title: (t as { title?: string }).title || '' }));
    const studentQuestions = questionsArray.filter((q: unknown) => (q as { createdByRole?: string }).createdByRole === 'student').map((q: unknown) => ({ id: (q as { id?: string }).id || '', question: (q as { question?: string }).question || '' }));
    const teacherQuestions = questionsArray.filter((q: unknown) => (q as { createdByRole?: string }).createdByRole === 'teacher').map((q: unknown) => ({ id: (q as { id?: string }).id || '', question: (q as { question?: string }).question || '' }));

    console.log('✅ [TeacherHome] Данные урока подготовлены:', {
      studentTasks,
      teacherTasks,
      studentQuestions,
      teacherQuestions,
      materials: materials.length
    });

    this.lessonTabsService.setCurrentLessonData({
      id: event.meta.lessonId,
      date: event.start,
      teacherTasks: teacherTasks,
      studentTasks: studentTasks,
      studentQuestions: studentQuestions,
      teacherQuestions: teacherQuestions,
      materials: materials,
      texts: materials.filter((m: _Material) => m.type === 'text'),
      audios: materials.filter((m: _Material) => m.type === 'audio'),
      videos: materials.filter((m: _Material) => m.type === 'video'),
      homework: []
    });

    this.router.navigate([`/classroom/${event.meta.lessonId}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  // Получить количество минут до урока
  getMinutesUntilLesson(event: CalendarEvent): number {
    const now = new Date();
    const lessonStart = new Date(event.start);
    const diffInMs = lessonStart.getTime() - now.getTime();
    return Math.round(diffInMs / (1000 * 60));
  }

  getHomeworkStatusText(status: string): string {
    switch (status) {
      case 'submitted': return 'Soumis';
      case 'completed': return 'Complété';
      case 'finished': return 'Terminé';
      case 'unfinished': return 'En cours';
      default: return 'Statut inconnu';
    }
  }

  // Helper методы для selectedStudent goal properties
  getSelectedStudentGoalExamLevel(): string {
    const goal = (this.selectedStudent as { goal?: { examLevel?: string } })?.goal;
    return goal?.examLevel || '';
  }

  getSelectedStudentGoalTargetDate(): string {
    const goal = (this.selectedStudent as { goal?: { targetDate?: string } })?.goal;
    return goal?.targetDate || '';
  }

  getSelectedStudentGoalDescription(): string {
    const goal = (this.selectedStudent as { goal?: { description?: string } })?.goal;
    return goal?.description || '';
  }

  getSelectedStudentLessonId(): string {
    return (this.selectedStudent as { lessonId?: string })?.lessonId || '';
  }

}
