import { Component, OnDestroy, OnInit, ViewChild, AfterViewChecked, HostListener, Output, EventEmitter, Input } from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoCallService } from '../../services/video-call.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { AuthService } from '../../services/auth.service';
import { HomeworkService } from '../../services/homework.service';

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

  @Output() itemResolved = new EventEmitter<{ item: string, type: 'task' | 'question' }>();
  @Input() addHomeworkExternal?: (item: string) => void;


  constructor(private backgroundService: BackgroundService, public lessonTabsService: LessonTabsService, private router: Router, private route: ActivatedRoute, public videoService: VideoCallService,
    private authService: AuthService, private homeworkService: HomeworkService) { }

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

    console.log('📍 ActivatedRoute snapshot:', this.route.snapshot.paramMap.keys);
    console.log('📍 ActivatedRoute param id:', this.route.snapshot.paramMap.get('id'));

    this.route.paramMap.subscribe(params => {
      console.log('📍 paramMap содержит:', params.keys);
      const lessonId = params.get('id');
      if (lessonId) {
        console.log(`🔄 Обновляем lessonId: ${lessonId}`);
        this.lessonTabsService.setCurrentLessonId(lessonId);
      }
    });

    this.videoService.resetVideoSize();


    this.lessonTabsService.setCurrentLessonData({
      id: '1',
      date: new Date(),
      teacherTasks: ['Corriger une rédaction', 'Faire un résumé'],
      studentTasks: ['Faire une synthèse', 'Compléter la fiche'],
      studentQuestions: [
        'Quand utilise-t-on “depuis” vs “il y a” ?',
        'Quelle est la structure du discours indirect ?'
      ],
      texts: ['📄 Le subjonctif expliqué', '📄 Notes sur Victor Hugo'],
      audios: ['🎧 Podcast grammaire', '🎧 Enregistrement oral'],
      videos: ['🎬 Analyse de Molière', '🎬 Documentaire']
    });


    this.lessonTabsService.currentLessonData$.subscribe((lesson) => {
      if (lesson) {
        this.currentLesson = lesson;
        console.log('🎓 Получены данные урока:', lesson);
      }
    });

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

    this.videoService.setRegularVideoActive(false);
    this.videoService.setFloatingVideoActive(true);
    this.videoService.setFloatingVideoSize(320, 180);

    // Принудительное уничтожение и пересоздание доски
    // this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
    //   this.router.navigate([`${this.lessonTabsService.getCurrentLessonId()}/board`]);
    // });
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
    this.videoService.onResize(event);
  }

  startDrag(event: MouseEvent): void {
    this.videoService.startResize(event);
  }

  showGabarit = false;

  toggleGabarit(): void {
    this.showGabarit = !this.showGabarit;
    this.showBoard = false; // или true, если хочешь доску по умолчанию при скрытии
  }


  selectView(view: 'board' | 'materials') {
    this.showBoard = view === 'board';
    this.showGabarit = view === 'materials';
  }

  tasksCollapsed = false;

  toggleTasksCollapsed() {
    this.tasksCollapsed = !this.tasksCollapsed;
  }

  toggleBoard(): void {
    this.showBoard = !this.showBoard;
    this.showGabarit = false;
  }

  resolvedItems = new Set<string>();

  toggleResolved(item: string, type: 'task' | 'question') {
    if (this.resolvedItems.has(item)) {
      this.resolvedItems.delete(item);
    } else {
      this.resolvedItems.add(item);
    }

    // Здесь можно эмитить наружу, если нужно синхронизировать с карточкой урока
    // this.itemResolved.emit({ item, type });
  }

  isResolved(item: string): boolean {
    return this.resolvedItems.has(item);
  }

  addStudentTask() {
    if (this.newStudentTask.trim()) {
      this.currentLesson.studentTasks.push(this.newStudentTask.trim());
      this.newStudentTask = '';
    }
  }

  addStudentQuestion() {
    if (this.newStudentQuestion.trim()) {
      this.currentLesson.studentQuestions.push(this.newStudentQuestion.trim());
      this.newStudentQuestion = '';
    }
  }

  addTeacherTask() {
    if (this.newTeacherTask.trim()) {
      this.currentLesson.teacherTasks.push(this.newTeacherTask.trim());
      this.newTeacherTask = '';
    }
  }

  postponeQuestion(question: string): void {
    console.log('🔁 Revoir plus tard:', question);
    // Пример: сохраняем в lessonTabsService.postponedQuestions.push(question)
  }

  goToMindmap(item: string) {
    console.log('🔗 Redirection vers Mindmap avec:', item);
    this.router.navigate(['/mindmap'], { queryParams: { highlight: item } });
  }

  goToDictionary(item: string) {
    console.log('🔗 Redirection vers le dictionnaire avec:', item);
    const basePath = this.userRole === 'teacher' ? '/teacher/wordsTeaching' : '/student/wordsTeaching';
    this.router.navigate([basePath], { queryParams: { focus: item } });
  }


  postpone(item: string): void {
    console.log('⏭ Reporter pour le prochain cours:', item);
    // здесь будет логика перемещения в следующее занятие
  }

  addToHomework(item: string): void {
    console.log('📚 Ajouter aux devoirs:', item);
    // Здесь добавь логику, например:
  }

  onHover(item: string, event: MouseEvent) {
    this.hoveredItem = item;

    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;

    this.hoveredPosition = spaceBelow < 200 ? 'above' : 'below'; // если мало места снизу
  }

newHomeworkEntry = '';

submitHomework(): void {
  if (!this.newHomeworkEntry.trim()) return;

  this.currentLesson.homework ??= [];
  this.currentLesson.homework.push(this.newHomeworkEntry.trim());

  // ➕ Добавляем через сервис
  this.homeworkService.addHomework(this.newHomeworkEntry.trim());

  this.newHomeworkEntry = '';
}


}
