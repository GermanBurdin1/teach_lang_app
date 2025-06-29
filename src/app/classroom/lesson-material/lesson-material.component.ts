import { Component, OnDestroy, OnInit, ViewChild, AfterViewChecked, HostListener, Output, EventEmitter, Input } from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoCallService } from '../../services/video-call.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { AuthService } from '../../services/auth.service';
import { HomeworkService } from '../../services/homework.service';
import { LessonService } from '../../services/lesson.service';
import { MaterialService } from '../../services/material.service';
import { LessonNotesService } from '../../services/lesson-notes.service';
import { MatDialog } from '@angular/material/dialog';
import { LessonNotesModalComponent } from './lesson-notes-modal/lesson-notes-modal.component';

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
  currentLesson: any = null;
  userRole: 'student' | 'teacher' = 'student';
  newStudentTask = '';
  newStudentQuestion = '';
  newTeacherTask = '';
  hoveredQuestion: string | null = null;
  hoveredItem: string | null = null;
  hoveredPosition: 'above' | 'below' = 'below';
  
  // Реальные данные урока
  lessonTasks: any[] = [];
  lessonQuestions: any[] = [];
  lessonMaterials: any[] = [];
  isLoadingData = false;

  @Output() itemResolved = new EventEmitter<{ item: string, type: 'task' | 'question' }>();
  @Input() addHomeworkExternal?: (item: string) => void;

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
    private dialog: MatDialog
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

    this.route.paramMap.subscribe(params => {
      console.log('📍 paramMap содержит:', params.keys);
      const lessonId = params.get('id');
      if (lessonId) {
        console.log(`🔄 Обновляем lessonId: ${lessonId}`);
        this.lessonTabsService.setCurrentLessonId(lessonId);
        this.loadLessonData(lessonId);
        this.lessonNotesService.initNotesForLesson(lessonId);
      }
    });

    this.videoService.resetVideoSize();

    // Подписываемся на данные урока (реальные данные будут загружены в loadLessonData)
    this.lessonTabsService.currentLessonData$.subscribe((lesson) => {
      if (lesson) {
        this.currentLesson = lesson;
        console.log('🎓 Получены данные урока:', lesson);
      }
    });
  }

  async loadLessonData(lessonId: string) {
    this.isLoadingData = true;
    console.log('🔄 Используем данные для урока:', lessonId);
    
    // ИСПОЛЬЗУЕМ ДАННЫЕ ПЕРЕДАННЫЕ ИЗ LESSON-MANAGEMENT ЧЕРЕЗ LessonTabsService
    console.log('✅ Данные урока уже переданы через LessonTabsService из lesson-management');
    
    this.isLoadingData = false;
  }

  ngOnDestroy(): void {
    if (this.backgroundSubscription) {
      console.log('📢 Отписка от backgroundSubscription');
      this.backgroundSubscription.unsubscribe();
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
    // ВРЕМЕННО ЗАКОММЕНТИРОВАНО - СОСРЕДОТОЧИМСЯ НА ДАННЫХ УРОКА
    /*
    if (this.videoService.showVideoCallSubject.getValue()) {
      console.log('⚠ Видео уже запущено, не дублируем');
      return;
    }

    console.log('🎥 Запуск видеозвонка');
    this.videoService.startVideoCall();
    */
    console.log('🎥 Видео-звонок временно отключен');
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
    }
  }

  selectView(view: 'board' | 'materials') {
    if (view === 'board') {
      this.showBoard = true;
      this.showGabarit = false;
    } else {
      this.showBoard = false;
      this.showGabarit = true;
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

  addStudentTask() {
    if (this.newStudentTask.trim()) {
      // ВРЕМЕННО БЕЗ API - ДОБАВЛЯЕМ ЛОКАЛЬНО
      if (this.currentLesson) {
        this.currentLesson.studentTasks.push(this.newStudentTask.trim());
        console.log('✅ Задача студента добавлена локально');
      }
      this.newStudentTask = '';
    }
  }

  addStudentQuestion() {
    if (this.newStudentQuestion.trim()) {
      // ВРЕМЕННО БЕЗ API - ДОБАВЛЯЕМ ЛОКАЛЬНО
      if (this.currentLesson) {
        this.currentLesson.studentQuestions.push(this.newStudentQuestion.trim());
        console.log('✅ Вопрос студента добавлен локально');
      }
      this.newStudentQuestion = '';
    }
  }

  addTeacherTask() {
    if (this.newTeacherTask.trim()) {
      // ВРЕМЕННО БЕЗ API - ДОБАВЛЯЕМ ЛОКАЛЬНО
      if (this.currentLesson) {
        this.currentLesson.teacherTasks.push(this.newTeacherTask.trim());
        console.log('✅ Задача преподавателя добавлена локально');
      }
      this.newTeacherTask = '';
    }
  }

  // Новые методы для работы с конспектом
  openNotes(section: 'tasks' | 'questions' | 'materials', itemId: string, itemText: string) {
    const dialogRef = this.dialog.open(LessonNotesModalComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: {
        lessonId: this.lessonTabsService.getCurrentLessonId(),
        section,
        itemId,
        itemText
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('📝 Конспект сохранен:', result);
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

  addToHomework(item: string): void {
    console.log('📚 Добавляем в домашнее задание:', item);
    if (this.addHomeworkExternal) {
      this.addHomeworkExternal(item);
    }
  }

  onHover(item: string, event: MouseEvent) {
    this.hoveredItem = item;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const windowHeight = window.innerHeight;
    this.hoveredPosition = rect.bottom + 200 > windowHeight ? 'above' : 'below';
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

  getStudentMaterials(): any[] {
    if (!this.currentLesson?.materials) return [];
    return this.currentLesson.materials.filter((m: any) => m.createdBy === this.currentLesson?.studentId);
  }

  getTeacherMaterials(): any[] {
    if (!this.currentLesson?.materials) return [];
    return this.currentLesson.materials.filter((m: any) => m.createdBy === this.currentLesson?.teacherId);
  }

  newHomeworkEntry = '';

  submitHomework(): void {
    if (this.newHomeworkEntry.trim()) {
      this.currentLesson.homework.push(this.newHomeworkEntry.trim());
      this.newHomeworkEntry = '';
    }
  }

  // Force recompilation - angular cache fix
}
