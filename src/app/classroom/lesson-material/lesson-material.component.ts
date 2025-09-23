import { Component, OnDestroy, OnInit, HostListener, Output, EventEmitter, Input } from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoCallService } from '../../services/video-call.service';
import { WebSocketService } from '../../services/web-socket.service';
import { AuthService } from '../../services/auth.service';
import { HomeworkService } from '../../services/homework.service';
import { LessonService } from '../../services/lesson.service';
import { MaterialService } from '../../services/material.service';
import { LessonNotesService } from '../../services/lesson-notes.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LessonNotesModalComponent } from './lesson-notes-modal/lesson-notes-modal.component';
import { HomeworkModalComponent } from './homework-modal/homework-modal.component';
import { CreateClassDialogComponent, CreateClassDialogData, CreateClassDialogResult } from './create-class-dialog.component';
import { ExitConfirmationDialogComponent } from './exit-confirmation-dialog.component';
import { GroupClassService,  GroupClass } from '../../services/group-class.service';
import { Meta, Title } from '@angular/platform-browser';
import { AnalyticsService } from '../../services/analytics.service';
import { StructuredDataService } from '../../services/structured-data.service';
import { environment } from '../../../../environment';

@Component({
  selector: 'app-lesson-material',
  templateUrl: './lesson-material.component.html',
  styleUrls: ['./lesson-material.component.css'],
})
export class LessonMaterialComponent implements OnInit, OnDestroy {
  // Helper function for development-only logging
  private devLog(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.log(message, ...args);
    }
  }

  // Student-specific properties
  studentClassInfo: any = null;
  teacherInfo: any = null;
  
  // Class invitation properties
  pendingClassInvitations: any[] = [];
  showInvitationDialog = false;
  currentInvitation: any = null;
  hideNotificationUntilReload = false; // Временно скрыть уведомление
  backgroundStyle: string = '';
  private backgroundSubscription: Subscription | undefined;
  private isVideoCallStarted = false;
  showBoard = false;
  currentLesson: unknown = null;
  userRole: 'student' | 'teacher' = 'student';
  newStudentTask = '';
  newStudentQuestion = '';
  newTeacherTask = '';
  newTeacherQuestion = '';
  hoveredQuestion: string | null = null;
  hoveredItem: string | null = null;
  hoveredPosition: 'above' | 'below' = 'below';
  
  // Реальные данные урока
  lessonTasks: unknown[] = [];
  lessonQuestions: unknown[] = [];
  lessonMaterials: unknown[] = [];
  isLoadingData = false;
  
  // Сохраненные домашние задания
  homeworkItems: unknown[] = [];
  coveredInClass = new Set<string>();

  @Output() itemResolved = new EventEmitter<{ item: string, type: 'task' | 'question' }>();
  @Input() addHomeworkExternal?: (item: string) => void;

  // Улучшенная логика для кнопок действий
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private isHoveringActions = false;

  countdown = 3000; // 3000 секунд
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Управление классом
  showClassManagement = false;
  isClassManagementCollapsed = false; // Сворачивание панели при запуске видео
  currentClass: GroupClass | null = null;
  allTeacherClasses: GroupClass[] = []; // Все классы преподавателя
  showStudentsList = false;
  availableStudents: { id?: string; name?: string; email?: string; level?: string }[] = []; // Подтвержденные студенты для добавления
  selectedLevelFilter: string | null = null; // Фильтр по уровню

  // Управление уроком и видеозвонками
  lessonStarted = false;
  lessonEnded = false;
  lessonTimer = 30; // 30 секунд для демо
  private lessonTimerInterval: ReturnType<typeof setInterval> | null = null;
  
  // WebSocket и участники
  wsConnected = false;
  groupRoomActive = false;
  groupParticipants: string[] = [];
  remoteUsersCount = 0;
  
  // Состояние студентов в видеозвонке
  studentCallStates: { [studentId: string]: 'calling' | 'connected' | 'declined' } = {};
  connectedStudents: string[] = [];

  constructor(
    private backgroundService: BackgroundService, 
    public lessonTabsService: LessonTabsService, 
    private router: Router, 
    private route: ActivatedRoute, 
    public videoService: VideoCallService,
    private wsService: WebSocketService,
    private authService: AuthService, 
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private materialService: MaterialService,
    private lessonNotesService: LessonNotesService,
    private dialog: MatDialog,
    private groupClassService: GroupClassService,
    private meta: Meta,
    private title: Title,
    private analyticsService: AnalyticsService,
    private structuredDataService: StructuredDataService,
    private snackBar: MatSnackBar
  ) { }

  trackByIndex(index: number, item: string): number {
    return index;
  }

  ngOnInit(): void {
    this.devLog('✅ LessonMaterialComponent загружен');
    this.authService.currentRole$.subscribe(role => {
      if (role === 'student' || role === 'teacher') {
        this.userRole = role;
        this.devLog('👤 Роль пользователя:', role);
        
        // Если преподаватель зашел в компонент, автоматически показываем управление классом
        if (role === 'teacher') {
          this.showClassManagement = true;
          this.loadTeacherClasses();
          this.initializeTeacherWebSocketListeners();
        } else if (role === 'student') {
          this.devLog('🎯 Загружаем информацию о классе для студента');
          this.loadStudentClassInfo();
          this.loadUnreadInvitations();
          this.initializeStudentWebSocketListeners();
          // Уведомления теперь постоянные в панели
        }
      }
    });

    this.backgroundSubscription = this.backgroundService.background$.subscribe(
      (newBackground) => {
        this.backgroundStyle = newBackground;
      }
    );

    // Инициализация WebSocket и отслеживания участников
    this.initializeWebSocket();
    this.initializeVideoTracking();
    this.initializeLessonInvitations();

    this.lessonTabsService.contentView$.subscribe((value) => {
      this.devLog('🔍 Observed contentView:', value);
    });

    // ВИДЕО-ИНИЦИАЛИЗАЦИЯ ВРЕМЕННО ЗАКОММЕНТИРОВАНА
    /*
    // Восстанавливаем обычное видео при возврате в класс
    if (this.videoService.getRegularVideoActive()) {
      console.log('🎥 Восстанавливаем обычное видео после возврата в класс');
      this.videoService.startVideoCall(); // Запускаем обычное видео
    }

    // Выключаем Floating Video при возврате в класс
    this.videoService.setFloatingVideoActive(false);
    this.videoService.toggleFloatingVideo(false);

    this.route.queryParams.subscribe(params => {
      console.log('📍 Получены queryParams:', params);

      if (params['startCall'] === 'true') {
        console.log('🎥 Старт видеозвонка по параметру URL');
        this.videoService.startVideoCall();
      }
    });

    this.videoService.resetVideoSize();
    */

    console.log('📍 ActivatedRoute snapshot:', this.route.snapshot.paramMap.keys);
    console.log('📍 ActivatedRoute param id:', this.route.snapshot.paramMap.get('id'));

    this.route.paramMap.subscribe(async params => {
      console.log('📍 paramMap содержит:', params.keys);
      const lessonId = params.get('id');
      if (lessonId) {
        console.log(`🔄 Обновляем lessonId: ${lessonId}`);
        this.lessonTabsService.setCurrentLessonId(lessonId);
        this.loadLessonData(lessonId);
        await this.lessonNotesService.initNotesForLesson(lessonId);
      }
    });

    //this.videoService.resetVideoSize(); // TODO ВИДЕО-ВЫЗОВЫ ВРЕМЕННО ЗАКОММЕНТИРОВАНЫ

    // Подписываемся на данные урока (реальные данные будут загружены в loadLessonData)
    this.lessonTabsService.currentLessonData$.subscribe((lesson) => {
      if (lesson) {
        this.currentLesson = lesson;
        console.log('🎓 Получены данные урока:', lesson);
        this.updateMetaTags(lesson);
      }
    });
  }

  private updateMetaTags(lesson: unknown): void {
    // Dynamic metadata for SEO and Open Graph (English audience)
    const lessonObj = lesson as { title?: string; description?: string; id?: string };
    const lessonTitle = lessonObj?.title || 'French Lesson';
    const lessonDescription = lessonObj?.description || 'Learn French with our interactive and personalized online courses for DELF and DALF exam preparation';
    const baseUrl = 'https://linguaconnect.com';
    const currentUrl = `${baseUrl}/classroom/${lessonObj?.id || 'lesson'}`;
    
    // Meta Title
    this.title.setTitle(`${lessonTitle} - LINGUACONNECT | Online French DELF/DALF Courses`);
    
    // Meta Description
    this.meta.updateTag({ name: 'description', content: lessonDescription });
    
    // Open Graph Meta Tags
    this.meta.updateTag({ property: 'og:title', content: `${lessonTitle} - LINGUACONNECT` });
    this.meta.updateTag({ property: 'og:description', content: lessonDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:url', content: currentUrl });
    this.meta.updateTag({ property: 'og:image', content: `${baseUrl}/assets/images/lesson-og-image.jpg` });
    this.meta.updateTag({ property: 'og:site_name', content: 'LINGUACONNECT' });
    this.meta.updateTag({ property: 'og:locale', content: 'en_US' });
    
    // Twitter Card Meta Tags
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: `${lessonTitle} - LINGUACONNECT` });
    this.meta.updateTag({ name: 'twitter:description', content: lessonDescription });
    this.meta.updateTag({ name: 'twitter:image', content: `${baseUrl}/assets/images/lesson-og-image.jpg` });
    
    // Additional SEO Meta Tags
    this.meta.updateTag({ name: 'keywords', content: 'french, courses, DELF, DALF, learning, language, teacher, student, online, exam preparation, native speaker' });
    this.meta.updateTag({ name: 'author', content: 'LINGUACONNECT' });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    
    // Canonical URL
    this.meta.updateTag({ rel: 'canonical', href: currentUrl });
    
    console.log('📊 Meta tags updated for lesson:', lessonTitle);
  }

  async loadLessonData(lessonId: string) {
    this.isLoadingData = true;
    console.log('🔄 Используем данные для урока:', lessonId);
    
    // ИСПОЛЬЗУЕМ ДАННЫЕ ПЕРЕДАННЫЕ ИЗ LESSON-MANAGEMENT ЧЕРЕЗ LessonTabsService
    console.log('✅ Данные урока уже переданы через LessonTabsService из lesson-management');
    
    // Загружаем сохраненные домашние задания
    this.loadHomeworkItems(lessonId);
    
    this.isLoadingData = false;
  }

  // Загрузка сохраненных домашних заданий из localStorage
  private loadHomeworkItems(lessonId: string) {
    const savedHomework = localStorage.getItem(`homework_${lessonId}`);
    const savedCovered = localStorage.getItem(`covered_${lessonId}`);
    
    if (savedHomework) {
      this.homeworkItems = JSON.parse(savedHomework);
      console.log('📋 Загружены сохраненные домашние задания:', this.homeworkItems);
    }
    
    if (savedCovered) {
      this.coveredInClass = new Set(JSON.parse(savedCovered));
      console.log('✅ Загружены задания, разобранные в классе:', Array.from(this.coveredInClass));
    }
  }

  // Сохранение домашних заданий в localStorage
  private saveHomeworkItems() {
    const lessonId = this.lessonTabsService.getCurrentLessonId();
    if (lessonId) {
      localStorage.setItem(`homework_${lessonId}`, JSON.stringify(this.homeworkItems));
      localStorage.setItem(`covered_${lessonId}`, JSON.stringify(Array.from(this.coveredInClass)));
      console.log('💾 Домашние задания сохранены в localStorage');
    }
  }

  ngOnDestroy(): void {
    if (this.backgroundSubscription) {
      console.log('📢 Отписка от backgroundSubscription');
      this.backgroundSubscription.unsubscribe();
    }

    // Очищаем таймер если он существует
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Очищаем таймер урока
    if (this.lessonTimerInterval) {
      clearInterval(this.lessonTimerInterval);
      this.lessonTimerInterval = null;
    }

    if (this.countdownInterval) {
      if (this.countdownInterval) clearInterval(this.countdownInterval);
    }

    // ❌ НЕ СБРАСЫВАЕМ ВИДЕО, ЧТОБЫ ОНО НЕ ПРОПАДАЛО
    console.log(`🎥 Перед удалением компонента showVideoCall$ = ${this.videoService.showVideoCallSubject.getValue()}`);
  }

  // стилизация
  highlight: string | null = null;

  highlightCard(card: string) {
    this.highlight = card;
  }

  resetCard(card: string) {
    if (this.highlight === card) {
      this.highlight = null;
    }
  }

  //
  showLanguageModal: boolean = false; // Отображение модального окна
  selectedLanguage: string = ''; // Выбранный язык

  // Открытие интерактивной доски
  openInteractiveBoard(): void {
    console.log('🔗 Навигация к', `${this.lessonTabsService.getCurrentLessonId()}/board`);
    this.showBoard = true;

    // ВИДЕО-ВЫЗОВЫ ВРЕМЕННО ЗАКОММЕНТИРОВАНЫ
    /*
    this.videoService.setRegularVideoActive(false);
    this.videoService.setFloatingVideoActive(true);
    this.videoService.setFloatingVideoSize(320, 180);
    */
  }


  set showVideoCall(value: boolean) {
    console.log('🔄 showVideoCall изменён:', value);
    this._showVideoCall = value;
  }

  get showVideoCall(): boolean {
    return this._showVideoCall;
  }

  private _showVideoCall = false;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    // ВИДЕО-ВЫЗОВЫ ВРЕМЕННО ЗАКОММЕНТИРОВАНЫ
    // this.videoService.onResize(event);
  }

  @HostListener('window:popstate', ['$event'])
  onPopState(event: PopStateEvent): void {
    // Если идет видеозвонок, показываем подтверждение
    if (this.lessonStarted) {
      event.preventDefault();
      this.showExitConfirmation();
    }
  }

  startDrag(event: MouseEvent): void {
    // ВИДЕО-ВЫЗОВЫ ВРЕМЕННО ЗАКОММЕНТИРОВАНЫ
    // this.videoService.startResize(event);
  }

  showGabarit = false;

  toggleGabarit(): void {
    this.showGabarit = !this.showGabarit;
    if (this.showGabarit) {
      this.showBoard = false;
      this.showClassManagement = false; // Скрываем панель управления классом
    }
  }

  selectView(view: 'board' | 'materials') {
    if (view === 'board') {
      this.showBoard = true;
      this.showGabarit = false;
      this.showClassManagement = false;
    } else {
      this.showBoard = false;
      this.showGabarit = true;
      this.showClassManagement = false;
    }
  }

  tasksCollapsed = false;

  toggleTasksCollapsed() {
    this.tasksCollapsed = !this.tasksCollapsed;
  }

  toggleBoard(): void {
    this.showBoard = !this.showBoard;
    if (this.showBoard) {
      this.showGabarit = false;
      this.showClassManagement = false; // Скрываем панель управления классом
    }
  }

  resolvedItems = new Set<string>();

  toggleResolved(item: string, type: 'task' | 'question') {
    if (this.resolvedItems.has(item)) {
      this.resolvedItems.delete(item);
    } else {
      this.resolvedItems.add(item);
    }

    this.itemResolved.emit({ item, type });
  }

  isResolved(item: string): boolean {
    return this.resolvedItems.has(item);
  }

  // Проверка, добавлено ли задание в домашнее задание
  isAddedToHomework(itemId: string): boolean {
    return this.homeworkItems.some(item => (item as { itemId?: string }).itemId === itemId);
  }

  // Проверка, разобрано ли задание в классе
  isCoveredInClass(itemId: string): boolean {
    return this.coveredInClass.has(itemId);
  }

  addStudentTask() {
    if (this.newStudentTask.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const lessonId = (this.currentLesson as { id?: string }).id;
      if (!lessonId) return;

      const taskData = {
        lessonId,
        title: this.newStudentTask.trim(),
        description: null,
        createdBy: currentUser.id,
        createdByRole: 'student' as const
      };

      this.lessonService.addTaskToLesson(taskData).subscribe({
        next: (newTask) => {
          const lesson = this.currentLesson as { studentTasks?: unknown[] };
          if (!lesson.studentTasks) {
            lesson.studentTasks = [];
          }
          lesson.studentTasks.push(newTask);
          console.log('✅ Задача студента добавлена в БД:', newTask);
          console.log('studentTasks после добавления:', lesson.studentTasks);
          this.newStudentTask = '';
        },
        error: (error) => {
          console.error('❌ Ошибка добавления задачи студента:', error);
        }
      });
    }
  }

  addStudentQuestion() {
    if (this.newStudentQuestion.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const lessonId = (this.currentLesson as { id?: string }).id;
      if (!lessonId) return;

      const questionData = {
        lessonId,
        question: this.newStudentQuestion.trim(),
        createdBy: currentUser.id,
        createdByRole: 'student' as const
      };

      this.lessonService.addQuestionToLesson(questionData).subscribe({
        next: (newQuestion) => {
          if (this.currentLesson) {
            // Добавляем вопрос в локальный массив
            const lesson = this.currentLesson as { studentQuestions?: unknown[] };
            if (!lesson.studentQuestions) {
              lesson.studentQuestions = [];
            }
            lesson.studentQuestions.push(newQuestion);
          }
          this.newStudentQuestion = '';
          console.log('✅ Вопрос студента добавлен в БД:', newQuestion);
        },
        error: (error) => {
          console.error('❌ Ошибка добавления вопроса студента:', error);
        }
      });
    }
  }

  addTeacherTask() {
    if (this.newTeacherTask.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const lessonId = (this.currentLesson as { id?: string }).id;
      if (!lessonId) return;

      const taskData = {
        lessonId,
        title: this.newTeacherTask.trim(),
        description: null,
        createdBy: currentUser.id,
        createdByRole: 'teacher' as const
      };

      this.lessonService.addTaskToLesson(taskData).subscribe({
        next: (newTask) => {
          if (this.currentLesson) {
            const lesson = this.currentLesson as { teacherTasks?: unknown[] };
            if (!lesson.teacherTasks) {
              lesson.teacherTasks = [];
            }
            lesson.teacherTasks.push(newTask);
          }
          this.newTeacherTask = '';
          console.log('✅ Задача преподавателя добавлена в БД:', newTask);
        },
        error: (error) => {
          console.error('❌ Ошибка добавления задачи преподавателя:', error);
        }
      });
    }
  }

  addTeacherQuestion() {
    if (this.newTeacherQuestion.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const lessonId = (this.currentLesson as { id?: string }).id;
      if (!lessonId) return;

      const questionData = {
        lessonId,
        question: this.newTeacherQuestion.trim(),
        createdBy: currentUser.id,
        createdByRole: 'teacher' as const
      };

      this.lessonService.addQuestionToLesson(questionData).subscribe({
        next: (newQuestion) => {
          if (this.currentLesson) {
            const lesson = this.currentLesson as { teacherQuestions?: unknown[] };
            if (!lesson.teacherQuestions) {
              lesson.teacherQuestions = [];
            }
            lesson.teacherQuestions.push(newQuestion);
          }
          this.newTeacherQuestion = '';
          console.log('✅ Вопрос преподавателя добавлен в БД:', newQuestion);
        },
        error: (error) => {
          console.error('❌ Ошибка добавления вопроса преподавателя:', error);
        }
      });
    }
  }

  // Новые методы для работы с конспектом
  openNotes(section: 'tasks' | 'questions' | 'materials', itemId: string, itemText: string) {
    const dialogRef = this.dialog.open(LessonNotesModalComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        lessonId: this.lessonTabsService.getCurrentLessonId(),
        section,
        itemId,
        itemText,
        lessonData: {
          studentTasks: (this.currentLesson as { studentTasks?: unknown[] })?.studentTasks || [],
          teacherTasks: (this.currentLesson as { teacherTasks?: unknown[] })?.teacherTasks || [],
          studentQuestions: (this.currentLesson as { studentQuestions?: unknown[] })?.studentQuestions || [],
          teacherQuestions: (this.currentLesson as { teacherQuestions?: unknown[] })?.teacherQuestions || [],
          materials: (this.currentLesson as { materials?: unknown[] })?.materials || []
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('📝 Конспект сохранен:', result);
      }
    });
  }

  // Обработчики событий от gabarit-page
  onGabaritOpenNotes(event: {section: 'materials', itemId: string, itemText: string}) {
    this.openNotes(event.section, event.itemId, event.itemText);
  }

  onGabaritAddToHomework(event: {type: string, materialTitle: string, materialId: string}) {
    this.addToHomework('material', event.materialTitle, event.materialId);
  }

  // Метод для добавления в домашнее задание
  addToHomework(type: 'task' | 'question' | 'material', title: string, itemId: string) {
    const dialogRef = this.dialog.open(HomeworkModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: {
        type,
        title,
        itemId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('📋 Домашнее задание создано:', result);
        
        const currentUser = this.authService.getCurrentUser();
        const lessonId = this.lessonTabsService.getCurrentLessonId();
        
        if (!currentUser || !lessonId) {
          console.error('❌ Нет данных пользователя или урока');
          return;
        }

        // Создаем домашнее задание через обновленный сервис
        const homeworkData = {
          lessonId: lessonId,
          title: result.title || title,
          description: result.description || '',
          dueDate: result.dueDate ? new Date(result.dueDate) : new Date(),
          assignedBy: currentUser.id,
          assignedTo: (this.currentLesson as { studentId?: string })?.studentId || currentUser.id,
          sourceType: type,
          sourceItemId: itemId,
          sourceItemText: title,
          materialIds: type === 'material' ? [itemId] : []
        };

        this.homeworkService.createHomeworkFromLesson(homeworkData).subscribe({
          next: (homework) => {
            console.log('✅ Домашнее задание сохранено в БД:', homework);
            
            // Добавляем в локальный массив для немедленного отображения
            const homeworkItem = {
              id: homework.id || Date.now().toString(),
              type,
              title: homework.title || title,
              description: homework.description || '',
              dueDate: homework.dueDate || new Date().toISOString(),
              status: homework.status || 'unfinished',
              itemId,
              createdAt: homework.assignedAt ? homework.assignedAt.toString() : new Date().toISOString(),
              lessonId: homework.lessonId || lessonId,
              createdInClass: homework.createdInClass !== undefined ? homework.createdInClass : true
            };
            
            this.homeworkItems.push(homeworkItem);
            
            // Помечаем как разобранное в классе если это задание/вопрос
            if (type === 'task' || type === 'question') {
              this.coveredInClass.add(itemId);
            }
            
            // Сохраняем в localStorage для совместимости
            this.saveHomeworkItems();
            
            console.log('✅ Домашнее задание добавлено локально:', homeworkItem);
          },
          error: (error) => {
            console.error('❌ Ошибка создания домашнего задания:', error);
            
            // Fallback: сохраняем локально если сервер недоступен
            const homeworkItem = {
              id: Date.now().toString(),
              type,
              title: result.title || title,
              description: result.description || '',
              dueDate: result.dueDate || new Date().toISOString(),
              status: 'unfinished',
              itemId,
              createdAt: new Date().toISOString(),
              lessonId: lessonId,
              createdInClass: true
            };
            
            this.homeworkItems.push(homeworkItem);
            this.coveredInClass.add(itemId);
            this.saveHomeworkItems();
          }
        });
      }
    });
  }

  // Закомментированные методы для будущей реализации
  postponeQuestion(question: string): void {
    console.log('⏭ Переносим вопрос на следующий урок:', question);
    // TODO: Реализовать перенос вопроса на следующий урок
  }

  goToMindmap(item: string) {
    console.log('🧠 Переход к mindmap для:', item);
    // TODO: Реализовать переход к mindmap
    // this.router.navigate(['/mindmap'], { queryParams: { item: item } });
  }

  goToDictionary(item: string) {
    console.log('📘 Переход к словарю для:', item);
    // TODO: Реализовать переход к словарю
    // this.router.navigate(['/vocabulary'], { queryParams: { search: item } });
  }

  postpone(item: string): void {
    console.log('⏭ Переносим на следующий урок:', item);
    // TODO: Реализовать перенос задания на следующий урок
  }

  onHover(item: string, event: MouseEvent) {
    // Отменяем любой существующий таймер скрытия
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    this.hoveredItem = item;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const windowHeight = window.innerHeight;
    this.hoveredPosition = rect.bottom + 200 > windowHeight ? 'above' : 'below';
  }

  onLeaveItem() {
    // Задержка перед скрытием кнопок
    this.hideTimeout = setTimeout(() => {
      if (!this.isHoveringActions) {
        this.hoveredItem = null;
      }
    }, 300); // 300ms задержка
  }

  onEnterActions() {
    // Отменяем скрытие при наведении на кнопки
    this.isHoveringActions = true;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  onLeaveActions() {
    // Скрываем кнопки при уходе с них
    this.isHoveringActions = false;
    this.hideTimeout = setTimeout(() => {
      this.hoveredItem = null;
    }, 100); // Более короткая задержка при уходе с кнопок
  }

  getMaterialIcon(materialType: string): string {
    switch (materialType) {
      case 'text': return '📄';
      case 'audio': return '🎧';
      case 'video': return '🎬';
      case 'pdf': return '📔';
      case 'image': return '🖼️';
      default: return '📎';
    }
  }

  getStudentMaterials(): unknown[] {
    const lesson = this.currentLesson as { materials?: unknown[]; studentId?: string };
    if (!lesson?.materials) return [];
    return lesson.materials.filter((m: unknown) => (m as { createdBy?: string }).createdBy === lesson?.studentId);
  }

  getTeacherMaterials(): unknown[] {
    const lesson = this.currentLesson as { materials?: unknown[]; teacherId?: string };
    if (!lesson?.materials) return [];
    return lesson.materials.filter((m: unknown) => (m as { createdBy?: string }).createdBy === lesson?.teacherId);
  }

  newHomeworkEntry = '';

  submitHomework(): void {
    if (this.newHomeworkEntry.trim()) {
      const lesson = this.currentLesson as { homework?: unknown[] };
      if (!lesson.homework) lesson.homework = [];
      lesson.homework.push(this.newHomeworkEntry.trim());
      this.newHomeworkEntry = '';
    }
  }

  // Обработчики событий от gabarit-page


  // Отметка домашнего задания как выполненного
  markHomeworkAsCompleted(homeworkId: string) {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('Пользователь не авторизован');
      return;
    }

    this.homeworkService.completeHomeworkItem(homeworkId, currentUser.id).subscribe({
      next: (completedHomework) => {
        console.log('✅ Домашнее задание отмечено как выполненное:', completedHomework);
        
        // Обновляем локальный статус
        const homeworkIndex = this.homeworkItems.findIndex(item => (item as { id?: string }).id === homeworkId);
        if (homeworkIndex >= 0) {
          const homeworkItem = this.homeworkItems[homeworkIndex] as { status?: string; isCompleted?: boolean; completedAt?: string };
          homeworkItem.status = 'finished';
          homeworkItem.isCompleted = true;
          homeworkItem.completedAt = new Date().toISOString();
          this.saveHomeworkItems();
        }
      },
      error: (error) => {
        console.error('❌ Ошибка при отметке домашнего задания как выполненного:', error);
      }
    });
  }

  // Отметка задачи как выполненной
  markTaskAsCompleted(taskId: string) {
    console.log('🟢 markTaskAsCompleted вызван с:', taskId);
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('Пользователь не авторизован');
      return;
    }
    this.homeworkService.completeTask(taskId, currentUser.id).subscribe({
      next: (completedTask) => {
        console.log('✅ Задача отмечена как выполненная:', completedTask);
        
        // Обновляем локальное состояние
        this.resolvedItems.add(taskId);
        
        // Если это задача из домашнего задания, обновляем и её
        const relatedHomework = this.homeworkItems.find(item => {
          const itemObj = item as { itemId?: string; type?: string };
          return itemObj.itemId === taskId && itemObj.type === 'task';
        });
        if (relatedHomework) {
          const homeworkObj = relatedHomework as { status?: string; isCompleted?: boolean; completedAt?: string };
          homeworkObj.status = 'finished';
          homeworkObj.isCompleted = true;
          homeworkObj.completedAt = new Date().toISOString();
          this.saveHomeworkItems();
        }
      },
      error: (error) => {
        console.error('❌ Ошибка при отметке задачи как выполненной:', error);
      }
    });
  }

  // Отметка вопроса как выполненного
  markQuestionAsCompleted(questionId: string) {
    console.log('🟣 markQuestionAsCompleted вызван с:', questionId);
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('Пользователь не авторизован');
      return;
    }
    this.homeworkService.completeQuestion(questionId, currentUser.id).subscribe({
      next: (completedQuestion) => {
        console.log('✅ Вопрос отмечен как выполненный:', completedQuestion);
        this.resolvedItems.add(questionId);
      },
      error: (error) => {
        console.error('❌ Ошибка при отметке вопроса как выполненного:', error);
      }
    });
  }

  // Force recompilation - angular cache fix

  // Методы управления классом
  toggleClassManagement(): void {
    this.showClassManagement = !this.showClassManagement;
    if (this.showClassManagement) {
      this.showBoard = false;
      this.showGabarit = false;
    }
  }

  openCreateClassDialog(): void {
    console.log('📝 Ouverture du dialogue de création de classe');
    
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) {
      alert('Erreur: utilisateur non authentifié');
      return;
    }

    const dialogData: CreateClassDialogData = {
      teacherId: teacherId
    };

    const dialogRef = this.dialog.open(CreateClassDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: false,
      autoFocus: true,
      panelClass: 'create-class-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result: CreateClassDialogResult) => {
      if (result?.success && result.createdClass) {
        this.devLog('✅ Classe créée avec succès:', result.createdClass);
        this.currentClass = result.createdClass;
        
        // 🔑 GA4: Track lesson booking event
        this.analyticsService.trackLessonBooking(
          result.createdClass.id,
          result.createdClass.teacherId,
          99, // Example price
          'EUR'
        );
        
        // 📊 Structured Data: Generate course schema
        const courseSchema = this.structuredDataService.generateCourseSchema({
          title: result.createdClass.name,
          description: result.createdClass.description,
          level: result.createdClass.level,
          price: 99
        });
        this.structuredDataService.injectStructuredData(courseSchema);
        
        // Sauvegarder dans localStorage pour compatibilité
        this.saveClassToStorage();
        
        // Перезагружаем список всех классов
        this.loadTeacherClasses();
      } else if (result?.error) {
        console.error('❌ Erreur lors de la création de la classe:', result.error);
        alert(result.error);
      }
    });
  }

  loadTeacherClasses(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    
    // Загружаем классы преподавателя с бекенда
    this.groupClassService.getTeacherGroupClasses(teacherId).subscribe({
      next: (classes: GroupClass[]) => {
        this.devLog('📚 Загружены классы преподавателя с бекенда:', classes);
        
        // Сохраняем все классы
        this.allTeacherClasses = classes;
        
        // Берем последний созданный активный класс как текущий
        this.currentClass = classes.find((cls: GroupClass) => cls.status === 'active') || null;
        
        // Также сохраняем в localStorage для совместимости
        localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(classes));
        
        // Загружаем студентов из lessons и добавляем их к классам
        this.loadStudentsForClasses(teacherId);
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки классов с бекенда, используем localStorage:', error);
        
        // Fallback на localStorage
        const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
        if (savedClasses) {
          const classes: GroupClass[] = JSON.parse(savedClasses);
          this.allTeacherClasses = classes;
          this.currentClass = classes.find((cls: GroupClass) => cls.status === 'active') || null;
          this.devLog('📚 Загружены классы из localStorage:', classes);
          
          // Загружаем студентов из lessons и добавляем их к классам
          this.loadStudentsForClasses(teacherId);
        }
      }
    });
  }

  /**
   * Загружает студентов из group_class_students для каждого класса
   */
  loadStudentsForClasses(teacherId: string): void {
    this.devLog('🔄 Загружаем студентов из group_class_students для каждого класса...');
    
    // Загружаем студентов для каждого класса отдельно
    this.allTeacherClasses.forEach(cls => {
      this.devLog(`🔄 Загружаем студентов для класса ${cls.name} (${cls.id})`);
      
      // Здесь мы не добавляем студентов автоматически, 
      // а просто загружаем уже существующих из базы данных
      this.devLog(`✅ Класс ${cls.name} уже имеет ${cls.students?.length || 0} студентов`);
    });
  }

  /**
   * Ручное обновление студентов в классах (можно вызвать после добавления студента через teacher-overview)
   */
  refreshStudentsInClasses(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (teacherId) {
      this.devLog('🔄 Ручное обновление студентов в классах...');
      this.loadStudentsForClasses(teacherId);
    }
  }

  saveClassToStorage(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId || !this.currentClass) return;
    
    const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
    const classes: GroupClass[] = savedClasses ? JSON.parse(savedClasses) : [];
    
    // Обновляем существующий класс или добавляем новый
    const existingIndex = classes.findIndex((cls: GroupClass) => cls.id === this.currentClass?.id);
    if (existingIndex >= 0) {
      classes[existingIndex] = this.currentClass;
    } else {
      classes.push(this.currentClass);
    }
    
    localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(classes));
    this.devLog('💾 Класс сохранен в localStorage');
  }

  // Методы для работы с классами
  getFilteredClasses(): GroupClass[] {
    if (!this.selectedLevelFilter) {
      return this.allTeacherClasses;
    }
    return this.allTeacherClasses.filter(cls => cls.level === this.selectedLevelFilter);
  }

  getClassesByLevel(level: string): GroupClass[] {
    return this.allTeacherClasses.filter(cls => cls.level === level);
  }

  getLevelStats(): { level: string; count: number; color: string }[] {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const colors = {
      'A1': '#ff6b6b', // Красный
      'A2': '#ffa726', // Оранжевый
      'B1': '#66bb6a', // Зеленый
      'B2': '#42a5f5', // Синий
      'C1': '#ab47bc', // Фиолетовый
      'C2': '#26a69a'  // Бирюзовый
    };

    return levels.map(level => ({
      level,
      count: this.getClassesByLevel(level).length,
      color: colors[level as keyof typeof colors]
    }));
  }

  setLevelFilter(level: string | null): void {
    this.selectedLevelFilter = level;
  }

  selectClass(cls: GroupClass): void {
    this.currentClass = cls;
  }

  getClassStatusColor(status: string): string {
    switch (status) {
      case 'active': return '#4caf50'; // Зеленый
      case 'completed': return '#2196f3'; // Синий
      case 'cancelled': return '#f44336'; // Красный
      default: return '#9e9e9e'; // Серый
    }
  }

  getClassStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Actif';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return 'Inconnu';
    }
  }

  formatScheduledDate(dateInput: string | Date): string {
    const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getLevelColor(level: string | null): string {
    if (!level) return '#9e9e9e';
    const levelStats = this.getLevelStats();
    const stat = levelStats.find(s => s.level === level);
    return stat?.color || '#9e9e9e';
  }

  removeStudentFromClass(student: any): void {
    console.log('🗑️ Удаление студента из класса:', student);
    console.log('🗑️ currentClass.students:', this.currentClass?.students);
    
    if (!this.currentClass || !this.currentClass.id) {
      alert('Класс не найден');
      return;
    }

    const studentId = student.studentId || student.id;
    console.log('🗑️ studentId для удаления:', studentId);
    if (!studentId) {
      alert('ID студента не найден');
      return;
    }

    // Удаляем студента через API
    this.groupClassService.removeStudentFromClass(this.currentClass.id, studentId).subscribe({
      next: () => {
        console.log('✅ Студент удален из класса');
        
        // Обновляем локальные данные
        if (this.currentClass && this.currentClass.students) {
          const index = this.currentClass.students.findIndex(s => 
            s.id === studentId || s.studentId === studentId
          );
          if (index > -1) {
            this.currentClass.students.splice(index, 1);
            this.saveClassToStorage(); // Сохраняем изменения в localStorage
            console.log('✅ Студент удален из локального списка');
          } else {
            console.log('⚠️ Студент не найден в локальном списке для удаления');
          }
        }
      },
      error: (error) => {
        console.error('❌ Ошибка удаления студента:', error);
        
        // Даже если произошла ошибка на бекенде, удаляем студента локально
        if (this.currentClass && this.currentClass.students) {
          const index = this.currentClass.students.findIndex(s => 
            s.id === studentId || s.studentId === studentId
          );
          if (index > -1) {
            this.currentClass.students.splice(index, 1);
            this.saveClassToStorage();
            console.log('✅ Студент удален из локального списка (несмотря на ошибку бекенда)');
          }
        }
        
        // Показываем уведомление об успешном удалении
        this.snackBar.open('Студент удален из класса', 'Fermer', { duration: 3000 });
      }
    });
  }

  testButtonClick(): void {
    this.devLog('🔘 BUTTON CLICKED!');
    this.openInviteStudentsDialog();
  }

  openInviteStudentsDialog(): void {
    this.devLog('👥 Открытие диалога добавления студентов');
    this.devLog('🔍 currentClass:', this.currentClass);
    
    if (!this.currentClass) {
      this.devLog('❌ currentClass не найден!');
      alert('❌ Сначала создайте класс!');
      return;
    }
    
    // Загружаем доступных студентов
    this.loadAvailableStudents();
    this.showStudentsList = true;
  }

  loadAvailableStudents(): void {
    this.devLog('🔄 Загрузка доступных студентов...');
    
    const teacherId = this.authService.getCurrentUser()?.id;
    this.devLog('🔍 Teacher ID:', teacherId);
    
    if (!teacherId) {
      this.devLog('❌ ID преподавателя не найден');
      return;
    }
    
    this.devLog('📡 Вызываем lessonService.getConfirmedStudentsForTeacher...');
    
    // Получаем реальных подтвержденных студентов из бэкенда
    this.lessonService.getConfirmedStudentsForTeacher(teacherId).subscribe({
      next: (students) => {
        this.devLog('📚 Получены подтвержденные студенты с бэкенда:', students);
        
        // Преобразуем данные в нужный формат и получаем реальные email адреса
        this.availableStudents = [];
        
        // Загружаем email для каждого студента
        students.forEach((student: unknown) => {
          const studentData = student as { 
            id?: string; 
            name?: string; 
            email?: string; 
            level?: string;
            studentId?: string;
          };
          
          const studentId = studentData.studentId || studentData.id;
          if (studentId) {
            // Получаем реальный email через authService
            this.authService.getUserEmail(studentId).subscribe({
              next: (emailInfo) => {
                const studentInfo = {
                  id: studentId,
                  name: studentData.name || 'Студент без имени',
                  email: emailInfo.email, // Реальный email
                  level: studentData.level || 'B1'
                };
                
                // Проверяем, не добавлен ли уже этот студент и не в текущем классе
                if (!this.availableStudents.find(s => s.id === studentId)) {
                  // Фильтруем студентов, которые уже в текущем классе
                  if (!this.currentClass?.students?.find(s => (s as { studentId?: string }).studentId === studentId)) {
                    this.availableStudents.push(studentInfo);
                  }
                }
              },
              error: (error) => {
                console.error('❌ Ошибка получения email для студента:', studentId, error);
                // Fallback на заглушку
                const studentInfo = {
                  id: studentId,
                  name: studentData.name || 'Студент без имени',
                  email: 'email@example.com',
                  level: studentData.level || 'B1'
                };
                
                if (!this.availableStudents.find(s => s.id === studentId)) {
                  // Фильтруем студентов, которые уже в текущем классе
                  if (!this.currentClass?.students?.find(s => (s as { studentId?: string }).studentId === studentId)) {
                    this.availableStudents.push(studentInfo);
                  }
                }
              }
            });
          }
        });
        
        this.devLog('✅ Загрузка email адресов студентов запущена');
      },
      error: (error) => {
        this.devLog('❌ Ошибка загрузки студентов с бэкенда:', error);
        this.devLog('❌ Детали ошибки:', error.status, error.message);
        
        // Fallback: используем заглушку при ошибке
        this.availableStudents = [
          { id: 'student1', name: 'Alice Dupont', email: 'alice@example.com', level: 'B1' },
          { id: 'student2', name: 'Bob Martin', email: 'bob@example.com', level: 'A2' },
          { id: 'student3', name: 'Claire Dubois', email: 'claire@example.com', level: 'B2' },
          { id: 'student4', name: 'David Leroy', email: 'david@example.com', level: 'A1' },
          { id: 'student5', name: 'Emma Rousseau', email: 'emma@example.com', level: 'C1' },
        ];
        
        this.devLog('⚠️ Используем заглушку из-за ошибки загрузки');
      }
    });
  }

  addStudentToClass(student: unknown): void {
    this.devLog('➕ Добавление студента в класс:', student);
    this.devLog('➕ currentClass:', this.currentClass);
    
    if (!this.currentClass || !this.currentClass.id) {
      this.devLog('❌ Класс не найден!');
      alert('❌ Класс не найден');
      return;
    }

    const studentObj = student as { id?: string; name?: string; studentId?: string };
    const studentId = studentObj.id || studentObj.studentId;
    const studentName = studentObj.name;
    
    this.devLog('➕ studentId:', studentId, 'studentName:', studentName);
    
    if (!studentId || !studentName) {
      this.devLog('❌ Недостаточно данных о студенте!');
      alert('❌ Недостаточно данных о студенте');
      return;
    }

    const addStudentDto = {
      groupClassId: this.currentClass.id,
      studentId: studentId,
      studentName: studentName
    };

    this.devLog('➕ Отправляем приглашение студенту:', addStudentDto);
    
    // Отправляем приглашение студенту через WebSocket
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Преподаватель не найден');
      alert('❌ Преподаватель не найден');
      return;
    }

    // Подготавливаем данные класса для приглашения
    const classData = {
      id: this.currentClass.id,
      name: this.currentClass.name,
      level: this.currentClass.level,
      description: this.currentClass.description || `Classe de préparation à l'examen DELF niveau ${this.currentClass.level}`,
      teacherName: currentUser.name || 'Professeur'
    };

    // Сначала сохраняем студента в базе данных
    this.groupClassService.addStudentToClass(addStudentDto).subscribe({
      next: (addedStudent) => {
        this.devLog('✅ Студент добавлен в класс на бекенде:', addedStudent);
        
        // Добавляем студента в локальный список
        if (this.currentClass) {
          if (!this.currentClass.students) {
            this.currentClass.students = [];
          }
          this.currentClass.students.push({
            id: addedStudent.id,
            studentId: addedStudent.studentId,
            studentName: addedStudent.studentName,
            studentEmail: addedStudent.studentEmail,
            addedAt: addedStudent.addedAt,
            status: addedStudent.status
          });
        }
        
        // Отправляем WebSocket приглашение
        this.wsService.inviteToClass(studentId, currentUser.id, classData);
        
        this.devLog('📨 Приглашение отправлено студенту:', studentId);
        alert(`📨 Приглашение отправлено студенту ${studentName}`);
        
        // Убираем студента из списка доступных
        this.availableStudents = this.availableStudents.filter(s => {
          const sObj = s as { id?: string };
          return sObj.id !== studentId;
        });
      },
      error: (error) => {
        this.devLog('❌ Ошибка при добавлении студента в класс:', error);
        alert('❌ Ошибка при добавлении студента в класс');
      }
    });
  }

  addStudentToCurrentClass(student: { id?: string; name?: string; studentId?: string; [key: string]: unknown }): void {
    if (!this.currentClass) return;
    
    const currentClassObj = this.currentClass as { students?: unknown[] };
    if (!currentClassObj.students) {
      currentClassObj.students = [];
    }
    
    // Добавляем студента
    currentClassObj.students.push({
      id: student.studentId || Date.now().toString(),
      name: student.name,
      addedAt: new Date().toISOString()
    });
    
    // Удаляем из доступных студентов
    this.availableStudents = this.availableStudents.filter(s => {
      const studentObj = s as { studentId?: string; name?: string };
      return studentObj.studentId !== student.studentId && studentObj.name !== student.name;
    });
    
    // Сохраняем изменения
    this.saveClassToStorage();
    
    console.log('✅ Студент добавлен в класс:', student.name);
  }

  closeStudentsList(): void {
    this.showStudentsList = false;
  }

  editClass(): void {
    console.log('✏️ Редактирование класса');
    // TODO: Реализовать диалог редактирования класса
    alert('Функция редактирования класса будет реализована в следующей версии');
  }

  deleteClass(): void {
    console.log('🗑️ Удаление класса');
    if (confirm('Вы уверены, что хотите удалить этот класс? Это действие нельзя отменить.')) {
      this.currentClass = null;
      console.log('✅ Класс удален');
    }
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  // Helper methods for template safe property access
  getCurrentLessonSafe(): { studentTasks?: unknown[]; teacherTasks?: unknown[]; studentQuestions?: unknown[]; teacherQuestions?: unknown[]; homework?: unknown[]; [key: string]: unknown } | null {
    return this.currentLesson as { studentTasks?: unknown[]; teacherTasks?: unknown[]; studentQuestions?: unknown[]; teacherQuestions?: unknown[]; homework?: unknown[]; [key: string]: unknown } | null;
  }

  getCurrentClassSafe(): GroupClass | null {
    return this.currentClass;
  }

  getHomeworkTitle(homework: unknown): string {
    return (homework as { title?: string }).title || '';
  }

  getHomeworkDescription(homework: unknown): string {
    return (homework as { description?: string }).description || '';
  }

  hasHomeworkDescription(homework: unknown): boolean {
    return !!(homework as { description?: string }).description;
  }

  getHomeworkType(homework: unknown): string {
    const type = (homework as { type?: string }).type;
    return type === 'task' ? 'Tâche' : type === 'question' ? 'Question' : 'Matériel';
  }

  getHomeworkDueDate(homework: unknown): Date | null {
    const dueDate = (homework as { dueDate?: string | Date }).dueDate;
    return dueDate ? new Date(dueDate) : null;
  }

  getHomeworkStatus(homework: unknown): string {
    return (homework as { status?: string }).status || '';
  }

  isHomeworkCompleted(homework: unknown): boolean {
    return !!(homework as { isCompleted?: boolean }).isCompleted;
  }

  getHomeworkId(homework: unknown): string {
    return (homework as { id?: string }).id || '';
  }

  getStudentName(student: unknown): string {
    return (student as { name?: string }).name || (student as { studentName?: string }).studentName || 'Inconnu';
  }

  getStudentEmail(student: unknown): string {
    return (student as { email?: string }).email || 'Email non disponible';
  }

  getStudentLevel(student: unknown): string {
    return (student as { level?: string }).level || 'Niveau non spécifié';
  }

  // Helper method for gabarit component
  getCurrentLessonForGabarit(): { texts?: unknown[]; audios?: unknown[]; videos?: unknown[]; [key: string]: unknown } | null {
    if (!this.currentLesson) return null;
    return this.currentLesson as { texts?: unknown[]; audios?: unknown[]; videos?: unknown[]; [key: string]: unknown };
  }

  // Helper methods for task/question properties
  getTaskTitle(task: unknown): string {
    return (task as { title?: string }).title || '';
  }

  getTaskId(task: unknown): string {
    return (task as { id?: string }).id || '';
  }

  getQuestionText(question: unknown): string {
    return (question as { question?: string }).question || '';
  }

  getQuestionId(question: unknown): string {
    return (question as { id?: string }).id || '';
  }

  // Helper methods for template method calls with unknown parameters
  onHoverSafe(item: unknown, event: MouseEvent): void {
    const itemStr = typeof item === 'string' ? item : (item as { title?: string; question?: string }).title || (item as { question?: string }).question || '';
    this.onHover(itemStr, event);
  }

  isCoveredInClassSafe(item: unknown): boolean {
    const itemId = (item as { id?: string }).id || '';
    return this.isCoveredInClass(itemId);
  }

  isAddedToHomeworkSafe(item: unknown): boolean {
    const itemId = (item as { id?: string }).id || '';
    return this.isAddedToHomework(itemId);
  }

  isResolvedSafe(item: unknown): boolean {
    const itemId = (item as { id?: string }).id || '';
    return this.isResolved(itemId);
  }

  markTaskAsCompletedSafe(task: unknown): void {
    const taskId = (task as { id?: string }).id;
    if (taskId) {
      this.markTaskAsCompleted(taskId);
    }
  }

  markQuestionAsCompletedSafe(question: unknown): void {
    const questionId = (question as { id?: string }).id;
    if (questionId) {
      this.markQuestionAsCompleted(questionId);
    }
  }

  openNotesSafe(section: 'tasks' | 'questions', item: unknown, itemObj: unknown): void {
    const itemId = (item as { id?: string }).id || '';
    const itemText = (item as { title?: string; question?: string }).title || (item as { question?: string }).question || '';
    this.openNotes(section, itemId, itemText);
  }

  // Safe student access for removing from class
  removeStudentFromClassSafe(student: unknown): void {
    const studentObj = student as { id?: string; name?: string; studentId?: string; [key: string]: unknown };
    this.removeStudentFromClass(studentObj);
  }

  // Safe check for students array length
  hasStudents(): boolean {
    return (this.currentClass?.students?.length || 0) > 0;
  }

  // ===== НОВЫЕ МЕТОДЫ ДЛЯ УПРАВЛЕНИЯ УРОКОМ И ВИДЕОЗВОНКАМИ =====

  /**
   * Инициализация WebSocket соединения
   */
  private initializeWebSocket(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) return;

    // Регистрируем пользователя в WebSocket
    this.wsService.registerUser(currentUser.id);

    // Слушаем события подключения
    this.wsService.listen('connect').subscribe(() => {
      this.wsConnected = true;
      this.devLog('✅ WebSocket подключен для урока!');
    });

    this.wsService.listen('disconnect').subscribe(() => {
      this.wsConnected = false;
      this.devLog('❌ WebSocket отключен!');
    });

    // Слушаем события участников урока
    this.wsService.listen('room_participant_joined').subscribe((data: any) => {
      this.devLog('👤 Новый участник присоединился к уроку:', data.participant);
      this.groupParticipants.push(data.participant);
    });

    this.wsService.listen('room_participant_left').subscribe((data: any) => {
      this.devLog('👤 Участник покинул урок:', data.participant);
      this.groupParticipants = this.groupParticipants.filter(p => p !== data.participant);
    });
  }

  /**
   * Инициализация отслеживания видео
   */
  private initializeVideoTracking(): void {
    // Отслеживаем количество удаленных пользователей
    setInterval(() => {
      if (this.videoService.agoraClient) {
        this.remoteUsersCount = Object.keys(this.videoService.remoteUsers || {}).length;
      }
    }, 1000);
  }

  /**
   * Начать урок
   */
  startLesson(): void {
    this.devLog('🎓 Начинаем урок!');
    this.lessonStarted = true;
    this.lessonEnded = false;
    this.lessonTimer = 30; // Сбрасываем таймер на 30 секунд

    // Обновляем статус класса
    if (this.currentClass) {
      this.currentClass.status = 'active';
      this.saveClassToStorage();
    }

    // Запускаем таймер урока
    this.startLessonTimer();

    // Уведомляем через WebSocket о начале урока
    this.notifyLessonStatus('started');
  }

  /**
   * Завершить урок
   */
  endLesson(): void {
    this.devLog('🏁 Завершаем урок!');
    this.lessonStarted = false;
    this.lessonEnded = true;

    // Останавливаем таймер
    if (this.lessonTimerInterval) {
      clearInterval(this.lessonTimerInterval);
      this.lessonTimerInterval = null;
    }

    // Обновляем статус класса
    if (this.currentClass) {
      this.currentClass.status = 'completed';
      this.saveClassToStorage();
    }

    // Останавливаем видео
    this.videoService.stopVideoCall();
    
    // Разворачиваем панель управления классом обратно
    this.isClassManagementCollapsed = false;

    // Уведомляем через WebSocket о завершении урока
    this.notifyLessonStatus('completed');
  }

  /**
   * Запустить таймер урока
   */
  private startLessonTimer(): void {
    this.lessonTimerInterval = setInterval(() => {
      this.lessonTimer--;
      
      if (this.lessonTimer <= 0) {
        this.devLog('⏰ Время урока истекло!');
        this.endLesson();
      }
    }, 1000);
  }

  /**
   * Уведомить о статусе урока через WebSocket
   */
  private notifyLessonStatus(status: 'started' | 'completed'): void {
    if (!this.currentClass) return;

    this.wsService.sendMessage('lesson_status_changed', {
      classId: this.currentClass.id,
      status: status,
      timestamp: new Date().toISOString(),
      teacherId: this.authService.getCurrentUser()?.id
    });
  }

  /**
   * Пригласить студентов в урок
   */
  inviteStudentsToLesson(): void {
    if (!this.currentClass || !this.currentClass.students) {
      alert('❌ Нет студентов для приглашения');
      return;
    }

    const studentIds = this.currentClass.students.map(s => s.studentId);
    this.devLog('📧 Приглашаем студентов в урок:', studentIds);

    // Отправляем приглашения через WebSocket
    this.wsService.sendMessage('invite_to_lesson', {
      classId: this.currentClass.id,
      studentIds: studentIds,
      teacherId: this.authService.getCurrentUser()?.id,
      lessonName: this.currentClass.name
    });

    alert(`📧 Приглашения отправлены ${studentIds.length} студентам!`);
  }

  /**
   * Получить статус урока для отображения
   */
  getLessonStatusText(): string {
    if (this.lessonEnded) return 'Завершен';
    if (this.lessonStarted) return 'В процессе';
    return 'Не начат';
  }

  /**
   * Получить цвет статуса урока
   */
  getLessonStatusColor(): string {
    if (this.lessonEnded) return '#6c757d'; // Серый
    if (this.lessonStarted) return '#28a745'; // Зеленый
    return '#ffc107'; // Желтый
  }

  /**
   * Форматировать время урока
   */
  formatLessonTime(): string {
    const minutes = Math.floor(this.lessonTimer / 60);
    const seconds = this.lessonTimer % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Начать видео звонок
   */
  startVideoCall(): void {
    this.devLog('🎥 Запуск видеозвонка');
    
    if (!this.currentClass) {
      alert('❌ Сначала выберите или создайте класс');
      return;
    }

    // Проверяем, есть ли студенты в классе
    if (!this.currentClass.students || this.currentClass.students.length === 0) {
      alert('❌ В классе нет студентов для видеозвонка');
      return;
    }

    this.devLog('👥 Студенты в классе:', this.currentClass.students);

    // Отправляем приглашения всем студентам
    this.sendInvitationsToStudents();

    // Устанавливаем канал для группового урока
    this.videoService.channelName = `class_${this.currentClass.id}`;
    this.videoService.setLessonData(this.currentClass.id, this.authService.getCurrentUser()?.id || '');
    
    this.videoService.startVideoCall();
    
    // Сворачиваем панель управления классом при запуске видео
    this.isClassManagementCollapsed = true;
    
    // Запускаем урок
    this.lessonStarted = true;
    this.startLessonTimer();
    
    // Добавляем запись в историю браузера для предотвращения случайного выхода
    history.pushState({ preventBack: true }, '', window.location.href);
  }

  /**
   * Отправить приглашения всем студентам класса
   */
  private sendInvitationsToStudents(): void {
    if (!this.currentClass?.students) {
      this.devLog('❌ Нет студентов для отправки приглашений');
      return;
    }

    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) {
      this.devLog('❌ ID преподавателя не найден');
      return;
    }

    this.devLog('📞 Отправляем приглашения студентам:', this.currentClass.students);

    // Сбрасываем состояния студентов
    this.studentCallStates = {};
    this.connectedStudents = [];

    this.currentClass.students.forEach(student => {
      const studentId = (student as any).studentId;
      if (studentId) {
        this.devLog(`📞 Отправляем приглашение студенту ${studentId}`);
        
        // Устанавливаем состояние "звонок идет"
        this.studentCallStates[studentId] = 'calling';
        
        // Отправляем WebSocket приглашение
        this.wsService.sendMessage('invite_to_lesson', {
          to: studentId,
          from: teacherId,
          classId: this.currentClass!.id,
          className: this.currentClass!.name,
          teacherName: this.authService.getCurrentUser()?.name || 'Преподаватель'
        });
      }
    });

    this.devLog('📊 Состояния студентов после отправки приглашений:', this.studentCallStates);
  }


  /**
   * Инициализация обработчиков приглашений в урок
   */
  private initializeLessonInvitations(): void {
    // Обработчик принятия приглашения студентом
    this.wsService.listen('lesson_invitation_accepted').subscribe((data: any) => {
      this.devLog('✅ Студент принял приглашение:', data);
      
      if (data.studentId && this.studentCallStates[data.studentId]) {
        this.studentCallStates[data.studentId] = 'connected';
        this.connectedStudents.push(data.studentId);
        
        this.devLog('📊 Обновленные состояния студентов:', this.studentCallStates);
        this.devLog('👥 Подключенные студенты:', this.connectedStudents);
      }
    });

    // Обработчик отклонения приглашения студентом
    this.wsService.listen('lesson_invitation_declined').subscribe((data: any) => {
      this.devLog('❌ Студент отклонил приглашение:', data);
      
      if (data.studentId && this.studentCallStates[data.studentId]) {
        this.studentCallStates[data.studentId] = 'declined';
        
        this.devLog('📊 Обновленные состояния студентов:', this.studentCallStates);
      }
    });
  }

  /**
   * Получить состояние студента для отображения
   */
  getStudentCallState(studentId: string): 'calling' | 'connected' | 'declined' | 'unknown' {
    return this.studentCallStates[studentId] || 'unknown';
  }

  /**
   * Получить имя студента по ID
   */
  getStudentNameById(studentId: string): string {
    if (!this.currentClass?.students) return 'Студент';
    
    const student = this.currentClass.students.find(s => (s as any).studentId === studentId);
    return (student as any)?.studentName || 'Студент';
  }

  /**
   * Остановить видеозвонок и вернуться к управлению классом
   */
  stopVideoCall(): void {
    this.devLog('🛑 Остановка видеозвонка');
    
    // Останавливаем видеозвонок
    this.videoService.stopVideoCall();
    
    // Завершаем урок
    this.lessonStarted = false;
    this.lessonEnded = true;
    
    // Очищаем таймер
    if (this.lessonTimerInterval) {
      clearInterval(this.lessonTimerInterval);
      this.lessonTimerInterval = null;
    }
    
    // Сбрасываем состояния студентов
    this.studentCallStates = {};
    this.connectedStudents = [];
    
    // Разворачиваем панель управления классом
    this.isClassManagementCollapsed = false;
    
    // Очищаем состояние истории браузера
    if (history.state?.preventBack) {
      history.back();
    }
    
    this.devLog('✅ Видеозвонок остановлен, возвращаемся к управлению классом');
  }

  /**
   * Показать диалог подтверждения выхода
   */
  private showExitConfirmation(): void {
    const dialogRef = this.dialog.open(ExitConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmer la sortie',
        message: 'Êtes-vous sûr de vouloir terminer l\'appel vidéo ?',
        confirmText: 'Terminer l\'appel',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.stopVideoCall();
        // Возвращаемся назад после подтверждения
        history.back();
      } else {
        // Если отменили, добавляем запись в историю чтобы предотвратить выход
        history.pushState(null, '', window.location.href);
      }
    });
  }

  // Метод для загрузки информации о классе студента
  private loadStudentClassInfo(): void {
    this.devLog('📚 Загружаем информацию о классе для студента...');
    
    // Получаем текущего пользователя
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Пользователь не найден');
      return;
    }

    // Загружаем классы студента из group_class_students
    this.groupClassService.getStudentClasses(currentUser.id).subscribe({
      next: (classes) => {
        this.devLog('📚 Классы студента из group_class_students:', classes);
        
        if (classes && classes.length > 0) {
          // Берем первый класс (можно расширить логику для множественных классов)
          const classInfo = classes[0] as any;
          this.studentClassInfo = {
            id: classInfo.id,
            name: classInfo.name || 'Classe sans nom',
            level: classInfo.level || 'Niveau non défini',
            teacherId: classInfo.teacherId,
            status: classInfo.status,
            startTime: classInfo.scheduledAt,
            endTime: classInfo.scheduledAt // Можно добавить логику для расчета времени окончания
          };
          
          // Загружаем информацию о преподавателе
          this.loadTeacherInfo(classInfo.teacherId);
        } else {
          this.devLog('📚 Студент не состоит ни в одном классе');
          this.studentClassInfo = null;
        }
      },
      error: (error) => {
        this.devLog('❌ Ошибка при загрузке уроков студента:', error);
        this.studentClassInfo = null;
      }
    });
  }

  // Метод для загрузки информации о преподавателе
  private loadTeacherInfo(teacherId: string): void {
    this.devLog('👨‍🏫 Загружаем информацию о преподавателе:', teacherId);
    
    // Получаем реальную информацию о преподавателе через authService
    this.authService.getUserEmail(teacherId).subscribe({
      next: (userInfo) => {
        this.devLog('👨‍🏫 Информация о преподавателе получена:', userInfo);
        const fullName = `${userInfo.name || ''} ${userInfo.surname || ''}`.trim() || 'Professeur';
        this.teacherInfo = {
          id: teacherId,
          name: fullName,
          email: userInfo.email || 'prof@example.com'
        };
      },
      error: (error) => {
        this.devLog('❌ Ошибка при получении информации о преподавателе:', error);
        // Fallback на базовую информацию
        this.teacherInfo = {
          id: teacherId,
          name: 'Professeur',
          email: 'prof@example.com'
        };
      }
    });
  }

  // Инициализация WebSocket слушателей для студентов
  private initializeStudentWebSocketListeners(): void {
    this.devLog('🔌 Инициализация WebSocket слушателей для студента...');
    
    // Регистрируем пользователя в WebSocket
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.wsService.registerUser(currentUser.id);
    }

    // Слушаем приглашения в класс
    this.wsService.listen('class_invitation').subscribe({
      next: (invitationData) => {
        this.devLog('📨 Получено приглашение в класс:', invitationData);
        this.handleClassInvitation(invitationData);
      },
      error: (error) => {
        this.devLog('❌ Ошибка при получении приглашения в класс:', error);
      }
    });

    // Слушаем подтверждения принятия приглашения
    this.wsService.listen('class_invitation_accepted').subscribe({
      next: (data) => {
        this.devLog('✅ Приглашение в класс принято:', data);
        this.handleClassInvitationAccepted(data);
      }
    });

    // Слушаем отклонения приглашения
    this.wsService.listen('class_invitation_declined').subscribe({
      next: (data) => {
        this.devLog('❌ Приглашение в класс отклонено:', data);
        this.handleClassInvitationDeclined(data);
      }
    });
  }

  // Загрузка непрочитанных приглашений при входе студента
  private loadUnreadInvitations(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Пользователь не найден для загрузки приглашений');
      return;
    }

    this.devLog('📨 Загружаем непрочитанные приглашения для студента:', currentUser.id);
    
    this.lessonService.getUnreadInvitationsForStudent(currentUser.id).subscribe({
      next: (invitations) => {
        this.devLog('📨 Получены непрочитанные приглашения:', invitations);
        
        // Преобразуем приглашения из базы данных в формат для отображения
        invitations.forEach(invitation => {
          this.pendingClassInvitations.push({
            id: invitation.id,
            recordId: invitation.id, // ID записи в базе данных
            classId: invitation.groupClassId,
            name: invitation.groupClass?.name || 'Класс',
            level: invitation.groupClass?.level || 'A1',
            description: invitation.groupClass?.description || '',
            teacherId: invitation.groupClass?.teacherId || '',
            teacherName: invitation.groupClass?.teacherName || 'Professeur',
            timestamp: new Date(invitation.invitedAt || invitation.addedAt),
            isFromDatabase: true,
            invitationMessage: invitation.invitationMessage,
            status: invitation.status || 'invited', // Добавляем статус
            isRead: invitation.isRead || false,
            invitationResponse: invitation.invitationResponse || null // Добавляем ответ на приглашение
          });
        });

        // Загружаем приглашения, но не показываем модальное окно автоматически
        this.devLog('📨 Приглашения загружены, уведомление будет показано в панели');
      },
      error: (error) => {
        this.devLog('❌ Ошибка при загрузке приглашений:', error);
      }
    });
  }

  // Закрытие диалога без удаления приглашения
  private closeInvitationDialog(): void {
    this.devLog('🔒 Закрываем диалог приглашения, но оставляем в списке');
    this.showInvitationDialog = false;
    this.currentInvitation = null;
  }

  // Закрытие диалога без ответа (только отмечаем как прочитанное)
  closeInvitationWithoutResponse(): void {
    this.devLog('🔒 Закрываем диалог приглашения без ответа');
    
    if (this.currentInvitation && this.currentInvitation.isFromDatabase) {
      this.lessonService.closeInvitationWithoutResponse(this.currentInvitation.recordId).subscribe({
        next: (result) => {
          this.devLog('🔒 Приглашение закрыто без ответа:', result);
          // Обновляем статус в локальном списке
          const invitation = this.pendingClassInvitations.find(inv => inv.recordId === this.currentInvitation.recordId);
          if (invitation) {
            invitation.isRead = true;
          }
          this.closeInvitationDialog();
        },
        error: (error) => {
          this.devLog('❌ Ошибка при закрытии приглашения:', error);
          this.closeInvitationDialog();
        }
      });
    } else {
      this.closeInvitationDialog();
    }
  }

  // Обработка приглашения в класс
  private handleClassInvitation(invitationData: any): void {
    this.devLog('📨 Обрабатываем приглашение в класс:', invitationData);
    
    // Добавляем приглашение в список ожидающих
    this.pendingClassInvitations.push({
      id: invitationData.classId,
      name: invitationData.className,
      level: invitationData.classLevel,
      description: invitationData.classDescription,
      teacherId: invitationData.teacherId,
      teacherName: invitationData.teacherName || 'Professeur',
      timestamp: new Date(),
      isFromDatabase: false
    });

    // Добавляем приглашение в список, уведомление появится в панели
    this.devLog('📨 Новое приглашение добавлено, уведомление появится в панели');
  }

  // Обработка принятия приглашения в класс
  private handleClassInvitationAccepted(data: any): void {
    this.devLog('✅ Приглашение принято, обновляем данные студента');
    // Перезагружаем информацию о классе
    this.loadStudentClassInfo();
  }

  // Обработка отклонения приглашения в класс
  private handleClassInvitationDeclined(data: any): void {
    this.devLog('❌ Приглашение отклонено');
    // Удаляем приглашение из списка
    this.pendingClassInvitations = this.pendingClassInvitations.filter(
      inv => inv.id !== data.classId
    );
  }

  // Принятие приглашения в класс
  acceptClassInvitation(): void {
    if (!this.currentInvitation) return;

    this.devLog('✅ Студент принимает приглашение в класс:', this.currentInvitation);

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Пользователь не найден');
      return;
    }

    // Если приглашение из базы данных, используем API
    if (this.currentInvitation.isFromDatabase) {
      this.lessonService.acceptClassInvitation(this.currentInvitation.recordId).subscribe({
        next: (result) => {
          this.devLog('✅ Приглашение принято через API:', result);
          // Обновляем статус в локальном списке
          const invitation = this.pendingClassInvitations.find(inv => inv.recordId === this.currentInvitation.recordId);
          if (invitation) {
            invitation.invitationResponse = 'confirmed';
          }
          this.removeInvitationFromList();
          this.loadStudentClassInfo(); // Перезагружаем информацию о классе
        },
        error: (error) => {
          this.devLog('❌ Ошибка при принятии приглашения:', error);
        }
      });
    } else {
      // Если приглашение через WebSocket, отправляем WebSocket сообщение
      this.wsService.acceptClassInvitation(
        this.currentInvitation.teacherId,
        currentUser.id,
        this.currentInvitation.id
      );
      this.removeInvitationFromList();
    }
  }

  // Отклонение приглашения в класс
  rejectClassInvitation(): void {
    if (!this.currentInvitation) return;

    this.devLog('❌ Студент отклоняет приглашение в класс:', this.currentInvitation);

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Пользователь не найден');
      return;
    }

    // Если приглашение из базы данных, используем API для отклонения
    if (this.currentInvitation.isFromDatabase) {
      this.lessonService.declineClassInvitation(this.currentInvitation.recordId).subscribe({
        next: (result) => {
          this.devLog('❌ Приглашение отклонено через API:', result);
          // Обновляем статус в локальном списке
          const invitation = this.pendingClassInvitations.find(inv => inv.recordId === this.currentInvitation.recordId);
          if (invitation) {
            invitation.invitationResponse = 'rejected';
          }
          this.closeInvitationDialog();
        },
        error: (error) => {
          this.devLog('❌ Ошибка при отклонении приглашения:', error);
        }
      });
    } else {
      // Если приглашение через WebSocket, просто закрываем диалог
      this.devLog('🔒 Закрываем WebSocket приглашение без отправки сообщения');
      this.closeInvitationDialog();
    }
  }

  // Удаление приглашения из списка (только при принятии)
  private removeInvitationFromList(): void {
    if (this.currentInvitation) {
      this.pendingClassInvitations = this.pendingClassInvitations.filter(
        inv => inv.id !== this.currentInvitation.id
      );
    }

    // Закрываем диалог
    this.showInvitationDialog = false;
    this.currentInvitation = null;
  }

  // Принятие приглашения из списка
  acceptClassInvitationFromList(invitation: any): void {
    this.devLog('✅ Студент принимает приглашение из списка:', invitation);

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Пользователь не найден');
      return;
    }

    // Если приглашение из базы данных, используем API
    if (invitation.isFromDatabase && invitation.recordId) {
      this.lessonService.acceptClassInvitation(invitation.recordId).subscribe({
        next: (result) => {
          this.devLog('✅ Приглашение принято через API:', result);
          
          // Обновляем статус в локальном списке
          const invitationIndex = this.pendingClassInvitations.findIndex(inv => inv.recordId === invitation.recordId);
          if (invitationIndex !== -1) {
            this.pendingClassInvitations[invitationIndex].invitationResponse = 'confirmed';
          }
          
          // Удаляем приглашение из списка
          this.pendingClassInvitations = this.pendingClassInvitations.filter(
            inv => inv.recordId !== invitation.recordId
          );
          
          // Перезагружаем информацию о классе студента
          this.loadStudentClassInfo();
          
          // Показываем уведомление об успехе
          this.snackBar.open('Invitation acceptée! Vous avez rejoint la classe.', 'Fermer', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          this.devLog('❌ Ошибка при принятии приглашения:', error);
          this.snackBar.open('Erreur lors de l\'acceptation de l\'invitation', 'Fermer', { 
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      // Если приглашение через WebSocket, отправляем WebSocket сообщение
      this.wsService.acceptClassInvitation(
        invitation.teacherId,
        currentUser.id,
        invitation.id
      );

      // Удаляем приглашение из списка
      this.pendingClassInvitations = this.pendingClassInvitations.filter(
        inv => inv.id !== invitation.id
      );
      
      // Показываем уведомление
      this.snackBar.open('Invitation acceptée!', 'Fermer', { 
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }
  }

  // Отклонение приглашения из списка
  rejectClassInvitationFromList(invitation: any): void {
    this.devLog('❌ Студент отклоняет приглашение из списка:', invitation);

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Пользователь не найден');
      return;
    }

    // Если приглашение из базы данных, используем API
    if (invitation.isFromDatabase && invitation.recordId) {
      this.lessonService.declineClassInvitation(invitation.recordId).subscribe({
        next: (result) => {
          this.devLog('❌ Приглашение отклонено через API:', result);
          
          // Обновляем статус в локальном списке
          const invitationIndex = this.pendingClassInvitations.findIndex(inv => inv.recordId === invitation.recordId);
          if (invitationIndex !== -1) {
            this.pendingClassInvitations[invitationIndex].invitationResponse = 'rejected';
          }
          
          // Удаляем приглашение из списка
          this.pendingClassInvitations = this.pendingClassInvitations.filter(
            inv => inv.recordId !== invitation.recordId
          );
          
          // Показываем уведомление
          this.snackBar.open('Invitation refusée', 'Fermer', { 
            duration: 3000,
            panelClass: ['info-snackbar']
          });
        },
        error: (error) => {
          this.devLog('❌ Ошибка при отклонении приглашения:', error);
          this.snackBar.open('Erreur lors du refus de l\'invitation', 'Fermer', { 
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      // Если приглашение через WebSocket, просто закрываем диалог
      // НЕ отправляем WebSocket сообщение, чтобы не удалять приглашение
      this.devLog('🔒 Закрываем WebSocket приглашение без отправки сообщения');
      this.closeInvitationDialog();
    }
  }

  // Показать диалог приглашения снова
  showInvitationDialogAgain(invitation: any): void {
    this.devLog('🔄 Показываем диалог приглашения снова:', invitation);
    this.currentInvitation = invitation;
    this.showInvitationDialog = true;
  }

  // Проверить и показать непрочитанные приглашения
  checkAndShowUnreadInvitations(): void {
    this.devLog('🔍 Проверяем непрочитанные приглашения...');
    
    // Если уже показывается диалог, не показываем другой
    if (this.showInvitationDialog) {
      this.devLog('🔍 Диалог уже открыт, пропускаем');
      return;
    }

    // Ищем первое непрочитанное приглашение
    const unreadInvitation = this.pendingClassInvitations.find(inv => !inv.isRead);
    
    if (unreadInvitation) {
      this.devLog('📨 Найдено непрочитанное приглашение:', unreadInvitation);
      this.currentInvitation = unreadInvitation;
      this.showInvitationDialog = true;
    } else {
      this.devLog('📨 Непрочитанных приглашений не найдено');
    }
  }

  // Периодическая проверка непрочитанных приглашений
  private startInvitationChecker(): void {
    this.devLog('⏰ Запускаем периодическую проверку приглашений');
    
    // Проверяем каждые 30 секунд
    setInterval(() => {
      this.devLog('⏰ Периодическая проверка приглашений...');
      this.checkAndShowUnreadInvitations();
    }, 30000);
  }

  // Проверить, есть ли непрочитанные приглашения для показа в панели
  hasUnreadInvitations(): boolean {
    return !this.hideNotificationUntilReload && this.pendingClassInvitations.some(inv => 
      inv.status === 'invited' && inv.invitationResponse === null
    );
  }

  // Показать диалог приглашения из панели
  showInvitationDialogFromPanel(): void {
    this.devLog('👁️ Показываем диалог приглашения из панели');
    const unreadInvitation = this.pendingClassInvitations.find(inv => 
      inv.status === 'invited' && inv.invitationResponse === null
    );
    if (unreadInvitation) {
      this.currentInvitation = unreadInvitation;
      this.showInvitationDialog = true;
    }
  }

  // Скрыть уведомление о приглашении временно (до перезагрузки)
  dismissInvitationNotification(): void {
    this.devLog('🙈 Временно скрываем уведомление о приглашении');
    this.hideNotificationUntilReload = true;
    // Приглашение остается в списке, уведомление появится после перезагрузки страницы
  }


  // Пригласить студентов в класс
  inviteStudentsToClass(): void {
    this.devLog('📨 Открываем диалог приглашения студентов');
    
    if (!this.currentClass) {
      this.devLog('❌ Нет выбранного класса');
      return;
    }

    // Загружаем доступных студентов
    this.loadAvailableStudents();
    
    // Показываем диалог
    this.showStudentsList = true;
  }

  // Пригласить конкретного студента в класс
  inviteStudentToClass(student: any): void {
    this.devLog('📨 Приглашаем студента в класс:', student);
    
    if (!this.currentClass) {
      this.devLog('❌ Нет выбранного класса');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.devLog('❌ Пользователь не найден');
      return;
    }

    const studentId = student.studentId || student.id;
    const teacherId = currentUser.id;
    const classId = this.currentClass.id;
    const message = `Приглашение в класс ${this.currentClass.name} (${this.currentClass.level})`;

    this.devLog('📨 Отправляем приглашение:', { studentId, teacherId, classId, message });

    // Создаем приглашение через API
    this.lessonService.createClassInvitation(classId, teacherId, studentId, message).subscribe({
      next: (invitation) => {
        this.devLog('✅ Приглашение создано:', invitation);
        
        // Отправляем WebSocket уведомление
        this.wsService.inviteToClass(studentId, teacherId, {
          id: this.currentClass!.id,
          name: this.currentClass!.name,
          level: this.currentClass!.level,
          description: this.currentClass!.description,
          teacherName: currentUser.name || currentUser.surname || 'Professeur'
        });

        // Показываем уведомление
        this.snackBar.open(`Invitation envoyée à ${student.studentName || student.name}`, 'Fermer', { duration: 3000 });
        
        // Закрываем диалог
        this.closeStudentsList();
      },
      error: (error) => {
        this.devLog('❌ Ошибка при создании приглашения:', error);
        this.snackBar.open('Erreur lors de l\'envoi de l\'invitation', 'Fermer', { duration: 3000 });
      }
    });
  }

  // Инициализация WebSocket слушателей для преподавателя
  private initializeTeacherWebSocketListeners(): void {
    this.devLog('🔌 Инициализация WebSocket слушателей для преподавателя...');
    
    // Регистрируем пользователя в WebSocket
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.wsService.registerUser(currentUser.id);
    }

    // Слушаем принятие приглашений в класс
    this.wsService.listen('class_accept').subscribe({
      next: (data) => {
        this.devLog('✅ Студент принял приглашение в класс:', data);
        this.handleClassInvitationAcceptedByTeacher(data);
      },
      error: (error) => {
        this.devLog('❌ Ошибка при получении подтверждения принятия:', error);
      }
    });

    // Слушаем отклонение приглашений в класс
    this.wsService.listen('class_reject').subscribe({
      next: (data) => {
        this.devLog('❌ Студент отклонил приглашение в класс:', data);
        this.handleClassInvitationRejectedByTeacher(data);
      },
      error: (error) => {
        this.devLog('❌ Ошибка при получении отклонения:', error);
      }
    });
  }

  // Обработка принятия приглашения преподавателем
  private handleClassInvitationAcceptedByTeacher(data: any): void {
    this.devLog('✅ Студент принял приглашение, добавляем его в класс:', data);
    
    // Здесь можно добавить логику для обновления списка студентов в классе
    // или показать уведомление преподавателю
    
    // Перезагружаем классы преподавателя
    this.loadTeacherClasses();
    
    // Показываем уведомление
    alert(`✅ Студент принял приглашение в класс!`);
  }

  // Обработка отклонения приглашения преподавателем
  private handleClassInvitationRejectedByTeacher(data: any): void {
    this.devLog('❌ Студент отклонил приглашение:', data);
    
    // Показываем уведомление преподавателю
    alert(`❌ Студент отклонил приглашение в класс.`);
  }
}
