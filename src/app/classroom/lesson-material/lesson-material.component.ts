import { Component, OnDestroy, OnInit, HostListener, Output, EventEmitter, Input } from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoCallService } from '../../services/video-call.service';
import { AuthService } from '../../services/auth.service';
import { HomeworkService } from '../../services/homework.service';
import { LessonService } from '../../services/lesson.service';
import { MaterialService } from '../../services/material.service';
import { LessonNotesService } from '../../services/lesson-notes.service';
import { MatDialog } from '@angular/material/dialog';
import { LessonNotesModalComponent } from './lesson-notes-modal/lesson-notes-modal.component';
import { HomeworkModalComponent } from './homework-modal/homework-modal.component';
import { GroupClassService, CreateGroupClassDto, GroupClass } from '../../services/group-class.service';
import { Meta, Title } from '@angular/platform-browser';
import { AnalyticsService } from '../../services/analytics.service';
import { StructuredDataService } from '../../services/structured-data.service';

@Component({
  selector: 'app-lesson-material',
  templateUrl: './lesson-material.component.html',
  styleUrls: ['./lesson-material.component.css'],
})
export class LessonMaterialComponent implements OnInit, OnDestroy {
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

  lessonStarted = false;
  countdown = 3000; // 3000 секунд
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  // Управление классом
  showClassManagement = false;
  currentClass: unknown = null;
  showStudentsList = false;
  availableStudents: unknown[] = []; // Подтвержденные студенты для добавления

  constructor(
    private backgroundService: BackgroundService, 
    public lessonTabsService: LessonTabsService, 
    private router: Router, 
    private route: ActivatedRoute, 
    public videoService: VideoCallService,
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
    private structuredDataService: StructuredDataService
  ) { }

  trackByIndex(index: number, item: string): number {
    return index;
  }

  ngOnInit(): void {
    console.log('✅ LessonMaterialComponent загружен');
    this.authService.currentRole$.subscribe(role => {
      if (role === 'student' || role === 'teacher') {
        this.userRole = role;
        console.log('👤 Роль пользователя:', role);
        
        // Если преподаватель зашел в компонент, автоматически показываем управление классом
        if (role === 'teacher') {
          this.showClassManagement = true;
          this.loadTeacherClasses();
        }
      }
    });

    this.backgroundSubscription = this.backgroundService.background$.subscribe(
      (newBackground) => {
        this.backgroundStyle = newBackground;
      }
    );

    this.lessonTabsService.contentView$.subscribe((value) => {
      console.log('🔍 Observed contentView:', value);
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

  startVideoCall(): void {
    if (this.videoService.showVideoCallSubject.getValue()) {
      console.log('⚠ Видео уже запущено, не дублируем');
      return;
    }

    console.log('🎥 Запуск видеозвонка');
    this.videoService.startVideoCall();
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

  async startLesson() {
    const lessonId = this.lessonTabsService.getCurrentLessonId();
    const currentUser = this.authService.getCurrentUser();
    if (!lessonId || !currentUser) {
      console.error('Нет данных для старта урока');
      return;
    }
    try {
      await this.lessonService.startLesson(lessonId, currentUser.id).toPromise();
      // Получаем и показываем статус после старта
      const startedLesson = await this.lessonService.getLessonById(lessonId).toPromise();
      alert('Статус урока после старта: ' + (startedLesson?.['status'] || 'неизвестно'));
      this.lessonStarted = true;
      this.countdown = 30;
      this.countdownInterval = setInterval(async () => {
        if (this.countdown > 0) {
          this.countdown--;
        } else {
          if (this.countdownInterval) clearInterval(this.countdownInterval);
          // Завершаем урок
          try {
            await this.lessonService.endLesson(lessonId, currentUser.id).toPromise();
            // Получаем и показываем статус после завершения
            const endedLesson = await this.lessonService.getLessonById(lessonId).toPromise();
            alert('Статус урока после завершения: ' + (endedLesson?.['status'] || 'неизвестно'));
            console.log('✅ Урок завершён (статус completed в БД)');
          } catch (err) {
            console.error('❌ Ошибка при завершении урока:', err);
          }
        }
      }, 1000);
      console.log('✅ Урок успешно начат (статус обновлен в БД)');
    } catch (error) {
      console.error('❌ Ошибка при старте урока:', error);
      alert('Ошибка при старте урока. Попробуйте еще раз.');
    }
  }

  // Методы управления классом
  toggleClassManagement(): void {
    this.showClassManagement = !this.showClassManagement;
    if (this.showClassManagement) {
      this.showBoard = false;
      this.showGabarit = false;
    }
  }

  openCreateClassDialog(): void {
    console.log('📝 Открытие диалога создания класса');
    
    const className = prompt('Введите название класса (например, "DELF B1 - Группа 1"):');
    if (!className) return;
    
    const levelOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const level = prompt(`Выберите уровень DELF/DALF:\n${levelOptions.map((l, i) => `${i+1}. ${l}`).join('\n')}\n\nВведите номер:`) || '1';
    const selectedLevel = levelOptions[parseInt(level) - 1] || 'B1';
    
    const description = prompt('Описание класса (необязательно):') || `Класс для подготовки к экзамену DELF уровня ${selectedLevel}`;
    
    const maxStudents = parseInt(prompt('Максимальное количество студентов (по умолчанию 10):') || '10');
    
    // Запрашиваем дату и время первого урока
    const lessonDate = prompt('Дата первого урока (дд/мм/гггг, например 25/12/2023):');
    const lessonTime = prompt('Время первого урока (чч:мм, например 14:30):');
    
    let scheduledDate = new Date();
    if (lessonDate && lessonTime) {
      try {
        const [day, month, year] = lessonDate.split('/');
        const [hours, minutes] = lessonTime.split(':');
        scheduledDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      } catch {
        console.warn('Некорректная дата/время, используем текущее время');
      }
    }
    
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) {
      alert('Ошибка: пользователь не авторизован');
      return;
    }

    const createClassDto: CreateGroupClassDto = {
      name: className,
      level: selectedLevel,
      description: description,
      maxStudents: maxStudents,
      teacherId: teacherId,
      scheduledAt: scheduledDate.toISOString()
    };

    // Создаем класс через API
    this.groupClassService.createGroupClass(createClassDto).subscribe({
      next: (createdClass: GroupClass) => {
        console.log('✅ Класс создан на бекенде:', createdClass);
        this.currentClass = createdClass;
        
        // 🔑 GA4: Track lesson booking event
        this.analyticsService.trackLessonBooking(
          createdClass.id,
          createdClass.teacherId,
          99, // Example price
          'EUR'
        );
        
        // 📊 Structured Data: Generate course schema
        const courseSchema = this.structuredDataService.generateCourseSchema({
          title: createdClass.name,
          description: createdClass.description,
          level: createdClass.level,
          price: 99
        });
        this.structuredDataService.injectStructuredData(courseSchema);
        
        // Также сохраняем в localStorage для совместимости
        this.saveClassToStorage();
      },
      error: (error) => {
        console.error('❌ Ошибка создания класса:', error);
        alert('Ошибка при создании класса. Попробуйте снова.');
      }
    });
  }

  loadTeacherClasses(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    
    // Загружаем классы преподавателя с бекенда
    this.groupClassService.getTeacherGroupClasses(teacherId).subscribe({
      next: (classes: GroupClass[]) => {
        console.log('📚 Загружены классы преподавателя с бекенда:', classes);
        // Берем последний созданный активный класс
        this.currentClass = classes.find((cls: unknown) => (cls as { status?: string }).status === 'active') || null;
        
        // Также сохраняем в localStorage для совместимости
        localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(classes));
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки классов с бекенда, используем localStorage:', error);
        
        // Fallback на localStorage
        const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
        if (savedClasses) {
          const classes = JSON.parse(savedClasses);
          this.currentClass = classes.find((cls: unknown) => (cls as { status?: string }).status === 'active') || null;
          console.log('📚 Загружены классы из localStorage:', classes);
        }
      }
    });
  }

  saveClassToStorage(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId || !this.currentClass) return;
    
    const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
    const classes = savedClasses ? JSON.parse(savedClasses) : [];
    
    // Обновляем существующий класс или добавляем новый
    const existingIndex = classes.findIndex((cls: unknown) => (cls as { id?: string }).id === (this.currentClass as { id?: string })?.id);
    if (existingIndex >= 0) {
      classes[existingIndex] = this.currentClass;
    } else {
      classes.push(this.currentClass);
    }
    
    localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(classes));
    console.log('💾 Класс сохранен в localStorage');
  }

  removeStudentFromClass(student: { id?: string; name?: string; [key: string]: unknown }): void {
    console.log('🗑️ Удаление студента из класса:', student);
    
    const currentClass = this.currentClass as { id?: string };
    if (!this.currentClass || !currentClass.id) {
      alert('Класс не найден');
      return;
    }

    const studentId = (student as { studentId?: string }).studentId || student.id;
    if (!studentId) {
      alert('ID студента не найден');
      return;
    }

    // Удаляем студента через API
    this.groupClassService.removeStudentFromClass(currentClass.id!, studentId).subscribe({
      next: () => {
        console.log('✅ Студент удален из класса на бекенде');
        
        // Обновляем локальные данные
        const currentClassObj = this.currentClass as { students?: unknown[] };
        if (this.currentClass && currentClassObj.students) {
          const index = currentClassObj.students.indexOf(student);
          if (index > -1) {
            currentClassObj.students.splice(index, 1);
            this.saveClassToStorage(); // Сохраняем изменения в localStorage
          }
        }
      },
      error: (error) => {
        console.error('❌ Ошибка удаления студента:', error);
        alert('Ошибка при удалении студента. Попробуйте снова.');
      }
    });
  }

  openInviteStudentsDialog(): void {
    console.log('👥 Открытие диалога приглашения студентов через платформу');
    
    if (!this.currentClass) {
      alert('Сначала создайте класс!');
      return;
    }
    
    // Показываем список подтвержденных студентов для добавления
    this.loadAvailableStudents();
    this.showStudentsList = true;
  }

  loadAvailableStudents(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    
    // Получаем подтвержденных студентов из lesson service
    this.lessonService.getConfirmedStudentsForTeacher(teacherId).subscribe({
      next: (students) => {
        // Фильтруем студентов, которые уже не в текущем классе
        this.availableStudents = students.filter((student: unknown) => {
          const studentData = student as { studentId?: string; name?: string };
          return !(this.currentClass as { students?: unknown[] }).students?.find((s: unknown) => {
            const studentObj = s as { id?: string; name?: string };
            return studentObj.id === studentData.studentId || studentObj.name === studentData.name;
          });
        });
        console.log('📚 Доступные студенты для добавления:', this.availableStudents);
      },
      error: (error) => {
        console.error('❌ Ошибка при загрузке студентов:', error);
        // Fallback: используем моковые данные или пустой массив
        this.availableStudents = [];
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

  getCurrentClassSafe(): { level?: string; name?: string; students?: unknown[]; maxStudents?: number; description?: string; [key: string]: unknown } | null {
    return this.currentClass as { level?: string; name?: string; students?: unknown[]; maxStudents?: number; description?: string; [key: string]: unknown } | null;
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
    return (student as { name?: string }).name || '';
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
    const currentClass = this.currentClass as { students?: unknown[] };
    return (currentClass?.students?.length || 0) > 0;
  }
}
