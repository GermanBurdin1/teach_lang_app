import { Component, OnInit, OnDestroy } from '@angular/core';
import { HomeworkService } from '../../../services/homework.service';
import { LessonService } from '../../../services/lesson.service';
import { AuthService } from '../../../services/auth.service';
import { MaterialService } from '../../../services/material.service';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoCallService } from '../../../services/video-call.service';
import { Subscription } from 'rxjs';

interface Task {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdByRole: 'student' | 'teacher';
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

interface Question {
  id: string;
  lessonId: string;
  question: string;
  answer: string | null;
  createdBy: string;
  createdByRole: 'student' | 'teacher';
  isAnswered: boolean;
  answeredAt: Date | null;
  createdAt: Date;
}

interface Material {
  id: string;
  title: string;
  type: 'text' | 'audio' | 'video' | 'pdf' | 'image';
  content: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  attachedLessons: string[];
  tags: string[];
}

interface Lesson {
  id: string;
  teacherId: string;
  studentId: string;
  scheduledAt: Date;
  status: string;
  studentName?: string;
  tasks: Task[];
  questions: Question[];
  materials: Material[];
}

@Component({
  selector: 'app-teacher-lesson-management',
  templateUrl: './teacher-lesson-management.component.html',
  styleUrls: ['./teacher-lesson-management.component.css']
})
export class TeacherLessonManagementComponent implements OnInit, OnDestroy {
  // UI состояние
  filter: string = 'future';
  selectedStudent: string | null = null;
  highlightedLessonId: string | null = null;
  activePanel: 'cours' | 'settings' | 'stats' = 'cours';
  hideTabs = true;
  searchTerm = '';
  startDate?: string;
  endDate?: string;
  pageSize = 4;
  currentPage = 1;

  // Данные
  lessons: Lesson[] = [];
  currentLesson: Lesson | null = null;
  
  // Формы для добавления
  showAddTaskForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  
  // Материалы (убираем управление вопросами для преподавателя)
  
  // Загрузка
  loading = false;
  
  // Параметры URL
  highlightedLessonIdFromUrl: string | null = null;
  
  // Для совместимости со старым кодом
  resolvedItemsPerLesson: { [key: string]: string[] } = {};
  questionDropListIds: string[] = [];
  taskDropListIds: string[] = [];
  activeLesson: any = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private materialService: MaterialService,
    private route: ActivatedRoute,
    private router: Router,
    private videoCallService: VideoCallService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.highlightedLessonIdFromUrl = params['lessonId'] || null;
      console.log('[TeacherLessonManagement] highlightedLessonIdFromUrl from params:', this.highlightedLessonIdFromUrl);
    });

    this.route.queryParams.subscribe(params => {
      if (params['lessonId']) {
        this.highlightedLessonIdFromUrl = params['lessonId'];
        console.log('[TeacherLessonManagement] highlightedLessonIdFromUrl from query:', this.highlightedLessonIdFromUrl);
      }
    });
    
    this.loadTeacherLessons();

    // Если есть выделенный урок из URL, загружаем его
    if (this.highlightedLessonIdFromUrl) {
      setTimeout(() => {
        this.loadLesson(this.highlightedLessonIdFromUrl!);
      }, 500);
    }
    
    // Подписка на уведомления о прикреплении материалов
    const materialAttachedSubscription = this.materialService.onMaterialAttached().subscribe(({ materialId, lessonId }) => {
      console.log('🔗 [Teacher] Получено уведомление о прикреплении материала:', { materialId, lessonId });
      
      // Если материал прикреплен к текущему уроку, перезагружаем материалы
      if (this.currentLesson && this.currentLesson.id === lessonId) {
        console.log('🔄 [Teacher] Перезагружаем материалы для текущего урока');
        this.reloadMaterialsForCurrentLesson();
      }
      
      // Также обновляем материалы в списке уроков
      const lessonInList = this.lessons.find(l => l.id === lessonId);
      if (lessonInList) {
        console.log('🔄 [Teacher] Перезагружаем материалы для урока в списке');
        this.getMaterialsForLesson(lessonId).then(materials => {
          lessonInList.materials = materials;
        });
      }
    });

    this.subscriptions.push(materialAttachedSubscription);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  // Загрузка уроков преподавателя
  loadTeacherLessons(): void {
    const currentUser = this.authService.getCurrentUser();
    const teacherId = currentUser?.id;
    
    console.log('[TeacherLessonManagement] loadTeacherLessons called with:', { currentUser, teacherId });
    
    if (!teacherId) {
      console.error('[TeacherLessonManagement] No teacherId available');
      return;
    }

    this.loading = true;
    this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe({
      next: async (lessons) => {
        this.lessons = lessons.map(lesson => ({
          ...lesson,
          tasks: lesson.tasks || [],
          questions: lesson.questions || [],
          materials: lesson.materials || []
        }));
        
        // Загружаем задачи, вопросы и материалы для каждого урока
        for (const lesson of this.lessons) {
          try {
            const [tasks, questions, materials] = await Promise.all([
              this.lessonService.getTasksForLesson(lesson.id).toPromise(),
              this.lessonService.getQuestionsForLesson(lesson.id).toPromise(),
              this.getMaterialsForLesson(lesson.id)
            ]);
            
            lesson.tasks = tasks || [];
            lesson.questions = questions || [];
            lesson.materials = materials || [];
            
            console.log(`📊 Урок ${lesson.id}: ${lesson.tasks.length} задач, ${lesson.questions.length} вопросов, ${lesson.materials.length} материалов`);
          } catch (error) {
            console.error(`Ошибка загрузки данных для урока ${lesson.id}:`, error);
          }
        }
        
        this.updateLessonStatuses();
        this.loading = false;
        
        console.log('✅ Все уроки загружены с подробностями:', this.lessons);
      },
      error: (error) => {
        console.error('Ошибка загрузки уроков:', error);
        this.loading = false;
      }
    });
  }

  // Загрузка конкретного урока с задачами и вопросами
  loadLesson(lessonId: string): void {
    this.loading = true;
    
    // Загружаем урок
    this.lessonService.getLessonDetails(lessonId).subscribe({
      next: (lesson) => {
        this.currentLesson = lesson;
        this.highlightedLessonId = lessonId;
        
        // Загружаем задачи и вопросы
        this.loadTasksAndQuestions(lessonId);
        
        setTimeout(() => {
          this.highlightedLessonId = null;
        }, 5000);
      },
      error: (error) => {
        console.error('Ошибка загрузки урока:', error);
        this.loading = false;
      }
    });
  }

  // Загрузка задач, вопросов и материалов для урока
  loadTasksAndQuestions(lessonId: string): void {
    Promise.all([
      this.lessonService.getTasksForLesson(lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(lessonId).toPromise(),
      this.getMaterialsForLesson(lessonId)
    ]).then(([tasks, questions, materials]) => {
      if (this.currentLesson) {
        this.currentLesson.tasks = tasks || [];
        this.currentLesson.questions = questions || [];
        this.currentLesson.materials = materials || [];
      }
      this.loading = false;
    }).catch(error => {
      console.error('Ошибка загрузки задач, вопросов и материалов:', error);
      this.loading = false;
    });
  }

  // Получение материалов для урока
  private async getMaterialsForLesson(lessonId: string): Promise<Material[]> {
    try {
      const allMaterials = await this.materialService.getMaterials().toPromise();
      return allMaterials?.filter(material => 
        material.attachedLessons && material.attachedLessons.includes(lessonId)
      ) || [];
    } catch (error) {
      console.error('Ошибка загрузки материалов для урока:', error);
      return [];
    }
  }

  // Перезагрузка материалов для текущего урока
  async reloadMaterialsForCurrentLesson(): Promise<void> {
    if (!this.currentLesson) return;
    
    try {
      const materials = await this.getMaterialsForLesson(this.currentLesson.id);
      this.currentLesson.materials = materials;
      
      // Обновляем материалы и в списке уроков
      const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
      if (lessonInList) {
        lessonInList.materials = materials;
      }
      
      console.log('✅ Материалы урока перезагружены:', materials);
    } catch (error) {
      console.error('❌ Ошибка перезагрузки материалов:', error);
    }
  }

  // Обновление статусов уроков
  updateLessonStatuses(): void {
    const now = new Date();
    this.lessons.forEach(lesson => {
      const lessonDate = new Date(lesson.scheduledAt);
      
      // Если статус уже установлен службой и включает pending/cancelled/etc, сохраняем его
      if (['pending', 'confirmed', 'rejected', 'cancelled_by_student', 'cancelled_by_student_no_refund', 'in_progress', 'completed'].includes(lesson.status)) {
        // Сохраняем оригинальный статус для фильтра "Tous"
        return;
      }
      
      // Для простых статусов устанавливаем future/past
      lesson.status = lessonDate > now ? 'future' : 'past';
    });
  }

  // Добавление задачи для студента
  addTaskForStudent(): void {
    if (!this.newTaskTitle.trim() || !this.currentLesson) return;

    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;

    const taskData = {
      lessonId: this.currentLesson.id,
      title: this.newTaskTitle,
      description: this.newTaskDescription || null,
      createdBy: teacherId,
      createdByRole: 'teacher' as const
    };

    this.lessonService.addTaskToLesson(taskData).subscribe({
      next: (newTask) => {
        if (this.currentLesson) {
          this.currentLesson.tasks.push(newTask);
        }
        this.clearTaskForm();
        console.log('Задача добавлена студенту:', newTask);
      },
      error: (error) => {
        console.error('Ошибка добавления задачи:', error);
      }
    });
  }

  // Очистка формы задачи
  clearTaskForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.showAddTaskForm = false;
  }

  // Получение студенческих задач
  get studentTasks(): Task[] {
    return this.currentLesson?.tasks.filter(task => task.createdByRole === 'student') || [];
  }

  // Получение преподавательских задач
  get teacherTasks(): Task[] {
    return this.currentLesson?.tasks.filter(task => task.createdByRole === 'teacher') || [];
  }

  // Геттеры для совместимости с шаблоном
  get filteredLessons() {
    if (this.currentLesson) {
      // Когда выбран конкретный урок через calendar, показываем его первым, затем остальные
      const otherLessons = this.lessons.filter(lesson => 
        lesson.id !== this.currentLesson!.id && this.matchesCurrentFilter(lesson)
      );
      return [this.currentLesson, ...otherLessons];
    }
    
    // Когда заходим на вкладку напрямую, применяем пагинацию
    const allFiltered = this.fullFilteredLessons;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return allFiltered.slice(startIndex, endIndex);
  }

  get fullFilteredLessons() {
    console.log(`📊 Teacher: Применяем фильтр "${this.filter}" к ${this.lessons.length} урокам`);
    
    const result = this.lessons.filter(lesson => this.matchesCurrentFilter(lesson));
    
    console.log(`📊 Teacher: После фильтрации: ${result.length} уроков`, result.map(l => ({
      id: l.id, 
      date: l.scheduledAt, 
      status: l.status,
      studentName: l.studentName
    })));

    // Если есть выделенный урок (через calendar), ставим его первым
    if (this.highlightedLessonIdFromUrl) {
      const highlightedLesson = result.find(l => l.id === this.highlightedLessonIdFromUrl);
      const otherLessons = result.filter(l => l.id !== this.highlightedLessonIdFromUrl);
      
      if (highlightedLesson) {
        return [highlightedLesson, ...otherLessons];
      }
    }

    // Сортируем по дате: предстоящие по возрастанию, прошедшие по убыванию
    const sorted = result.sort((a, b) => {
      const dateA = new Date(a.scheduledAt);
      const dateB = new Date(b.scheduledAt);
      const now = new Date();
      
      const aIsFuture = dateA > now;
      const bIsFuture = dateB > now;
      
      if (aIsFuture && bIsFuture) {
        return dateA.getTime() - dateB.getTime(); // Предстоящие: ближайшие первыми
      } else if (!aIsFuture && !bIsFuture) {
        return dateB.getTime() - dateA.getTime(); // Прошедшие: последние первыми
      } else {
        return aIsFuture ? -1 : 1; // Предстоящие перед прошедшими
      }
    });
    
    console.log(`📊 Teacher: После сортировки: ${sorted.length} уроков`);
    return sorted;
  }

  private matchesCurrentFilter(lesson: Lesson): boolean {
    const now = new Date();
    const lessonDate = new Date(lesson.scheduledAt);
    
    // Фильтр по времени
    if (this.filter === 'future') {
      // À venir: ТОЛЬКО предстоящие уроки по времени
      const isFutureTime = lessonDate > now;
      
      console.log(`🔍 Teacher Фильтр Future для урока ${lesson.id}:`, {
        lessonDate: lessonDate.toISOString(),
        now: now.toISOString(), 
        status: lesson.status,
        isFutureTime,
        studentName: lesson.studentName
      });
      
      if (!isFutureTime) return false;
    } else if (this.filter === 'past') {
      // Passés: ТОЛЬКО прошедшие по времени
      const isPastTime = lessonDate <= now;
      
      console.log(`🕐 Teacher Фильтр Past для урока ${lesson.id}:`, {
        lessonDate: lessonDate.toISOString(),
        now: now.toISOString(),
        status: lesson.status,
        isPastTime,
        studentName: lesson.studentName
      });
      
      if (!isPastTime) return false;
    }
    // 'all' - показываем все (предстоящие, прошедшие, отмененные, ожидающие подтверждения)

    // Фильтр по студенту
    if (this.selectedStudent && lesson.studentName !== this.selectedStudent) {
      return false;
    }

    // Фильтр по дате начала
    if (this.startDate) {
      const filterDate = new Date(this.startDate);
      if (lessonDate < filterDate) return false;
    }

    // Фильтр по дате окончания
    if (this.endDate) {
      const filterDate = new Date(this.endDate);
      filterDate.setHours(23, 59, 59, 999); // Конец дня
      if (lessonDate > filterDate) return false;
    }

    // Фильтр по поисковому запросу
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      const hasMatchInTasks = lesson.tasks.some(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
      const hasMatchInQuestions = lesson.questions.some(question =>
        question.question.toLowerCase().includes(searchLower)
      );
      
      if (!hasMatchInTasks && !hasMatchInQuestions) return false;
    }

    return true;
  }

  get uniqueStudents(): string[] {
    const students = this.lessons
      .map(lesson => lesson.studentName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index);
    return students as string[];
  }

  get allHomework(): string[] {
    return [];
  }

  get pastLessonsCount(): number {
    const now = new Date();
    return this.lessons.filter(l => {
      const lessonDate = new Date(l.scheduledAt);
      return lessonDate <= now || ['completed', 'past'].includes(l.status);
    }).length;
  }

  get futureLessonsCount(): number {
    const now = new Date();
    return this.lessons.filter(l => {
      const lessonDate = new Date(l.scheduledAt);
      return lessonDate > now || ['confirmed', 'pending', 'in_progress'].includes(l.status);
    }).length;
  }

  // Методы для отображения статуса
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En attente',
      'confirmed': 'Confirmé',
      'rejected': 'Rejeté',
      'cancelled_by_student': 'Annulé par l\'étudiant',
      'cancelled_by_student_no_refund': 'Annulé (pas de remboursement)',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'future': 'À venir',
      'past': 'Passé'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'rejected': 'status-rejected',
      'cancelled_by_student': 'status-cancelled',
      'cancelled_by_student_no_refund': 'status-cancelled',
      'in_progress': 'status-in-progress',
      'completed': 'status-completed',
      'future': 'status-future',
      'past': 'status-past'
    };
    return classMap[status] || 'status-default';
  }

  // Методы-заглушки для совместимости
  recalculateStatus() {
    this.updateLessonStatuses();
    this.currentPage = 1; // Сброс на первую страницу при смене фильтра
  }

  updateUniqueStudents() {
    // Реализовать при необходимости
  }

  openGabarit(lesson: any) {
    this.activeLesson = lesson;
  }

  closeGabarit() {
    this.activeLesson = null;
  }

  get taskDropIds(): string[] {
    return [];
  }

  onItemDropped(event: any) {
    // Реализовать при необходимости
  }

  addToHomework(item: any) {
    // Реализовать при необходимости
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }

  // Проверка можно ли войти в класс (только для confirmed уроков в тот же день)
  canEnterClass(lesson: Lesson): boolean {
    // Проверяем статус - можно войти только в confirmed уроки (одобренные преподавателем)
    if (lesson.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const lessonTime = new Date(lesson.scheduledAt);
    
    // Проверяем что урок в тот же день
    const isSameDay = now.getFullYear() === lessonTime.getFullYear() &&
                      now.getMonth() === lessonTime.getMonth() &&
                      now.getDate() === lessonTime.getDate();
    
    return isSameDay;
  }

  // Вход в виртуальный класс
  enterVirtualClass(lesson: Lesson): void {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) return;

    // Устанавливаем данные урока в VideoCallService
    this.videoCallService.setLessonData(lesson.id, currentUserId);
    
    this.router.navigate([`/classroom/${lesson.id}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  // Возврат к списку уроков
  backToLessonList(): void {
    this.currentLesson = null;
    this.highlightedLessonId = null;
    this.highlightedLessonIdFromUrl = null;
    
    // Обновляем URL, убирая параметры урока
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
    
    // Загружаем список уроков если он пустой
    if (this.lessons.length === 0) {
      this.loadTeacherLessons();
    }
  }

  // ==================== МЕТОДЫ ДЛЯ ОТОБРАЖЕНИЯ АВТОРСТВА ====================
  
  getTaskAuthorDisplay(task: Task): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (task.createdBy === currentUserId) {
      return 'Mes tâches';
    } else {
      // Если задача создана студентом, показываем имя студента
      return this.currentLesson?.studentName || 'Étudiant';
    }
  }

  getMaterialAuthorDisplay(material: Material): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (material.createdBy === currentUserId) {
      return 'Mes matériaux';
    } else {
      // Если материал создан студентом, показываем имя студента
      return this.currentLesson?.studentName || 'Étudiant';
    }
  }

  getQuestionAuthorDisplay(question: Question): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (question.createdBy === currentUserId) {
      return 'Mes questions';
    } else {
      // Если вопрос создан студентом, показываем имя студента
      return this.currentLesson?.studentName || 'Étudiant';
    }
  }

  isOwnContent(createdBy: string): boolean {
    const currentUserId = this.authService.getCurrentUser()?.id;
    return createdBy === currentUserId;
  }
}
