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
  teacherName?: string;
  tasks: Task[];
  questions: Question[];
  materials: Material[];
}

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css']
})
export class LessonManagementComponent implements OnInit, OnDestroy {
  // UI состояние
  filter: string = 'future';
  selectedTeacher: string | null = null;
  highlightedLessonId: string | null = null;
  activePanel: 'cours' | 'settings' | 'stats' = 'cours';
  hideTabs = true;
  searchTerm = '';
  startDate?: string;
  endDate?: string;
  pageSize = 4;
  currentPage = 1;
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 10;

  // Данные
  lessons: Lesson[] = [];
  currentLesson: Lesson | null = null;
  
  // Формы для добавления
  showAddTaskForm = false;
  showAddQuestionForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newQuestionText = '';
  
  // Загрузка
  loading = false;
  
  // Параметры URL
  highlightedLessonIdFromUrl: string | null = null;

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
      console.log('📋 LessonManagement: Получен lessonId из URL:', this.highlightedLessonIdFromUrl);
    });

    this.route.queryParams.subscribe(params => {
      // Если есть lessonId в query params, используем его
      if (params['lessonId']) {
        this.highlightedLessonIdFromUrl = params['lessonId'];
        console.log('📋 LessonManagement: Получен lessonId из query params:', this.highlightedLessonIdFromUrl);
      }
    });

    this.loadStudentLessons();

    // Если есть выделенный урок из URL, загружаем его
    if (this.highlightedLessonIdFromUrl) {
      setTimeout(() => {
        this.loadLesson(this.highlightedLessonIdFromUrl!);
      }, 500);
    }
    
    // Подписка на уведомления о прикреплении материалов
    const materialAttachedSubscription = this.materialService.onMaterialAttached().subscribe(({ materialId, lessonId }) => {
      console.log('🔗 Получено уведомление о прикреплении материала:', { materialId, lessonId });
      
      // Если материал прикреплен к текущему уроку, перезагружаем материалы
      if (this.currentLesson && this.currentLesson.id === lessonId) {
        console.log('🔄 Перезагружаем материалы для текущего урока');
        this.reloadMaterialsForCurrentLesson();
      }
      
      // Также обновляем материалы в списке уроков
      const lessonInList = this.lessons.find(l => l.id === lessonId);
      if (lessonInList) {
        console.log('🔄 Перезагружаем материалы для урока в списке');
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

  // Загрузка уроков студента
  loadStudentLessons(): void {
    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    this.loading = true;
    this.lessonService.getStudentSentRequests(studentId).subscribe({
      next: (requests) => {
        console.log('📚 Загружены все заявки студента:', requests);
        
        // Преобразуем заявки в формат уроков
        this.lessons = requests.map(request => ({
          id: request.lessonId || request.id,
          teacherId: request.teacherId,
          studentId: studentId,
          scheduledAt: new Date(request.scheduledAt),
          status: request.status,
          teacherName: request.teacherName,
          tasks: [],
          questions: [],
          materials: []
        }));
        
        this.updateLessonStatuses();
        
        // Загружаем задачи и вопросы для всех уроков
        this.loadTasksAndQuestionsForAllLessons();
        
        console.log('📚 Уроки обработаны:', this.lessons);
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
      console.log('🔍 Загружаем материалы для урока:', lessonId);
      const allMaterials = await this.materialService.getMaterials().toPromise();
      console.log('📦 Все материалы получены:', allMaterials);
      
      if (!allMaterials || allMaterials.length === 0) {
        console.warn('⚠️ Материалы не найдены или список пуст. Возможно file-service не запущен?');
        return [];
      }
      
      const filteredMaterials = allMaterials.filter(material => {
        const isAttached = material.attachedLessons && material.attachedLessons.includes(lessonId);
        console.log(`📎 Материал "${material.title}" прикреплен к урокам:`, material.attachedLessons, 'включает урок', lessonId, '?', isAttached);
        return isAttached;
      });
      
      console.log('✅ Отфильтрованные материалы для урока:', filteredMaterials);
      return filteredMaterials;
    } catch (error) {
      console.error('❌ Ошибка загрузки материалов для урока:', error);
      console.error('❌ Возможные причины:');
      console.error('   1. File-service не запущен на порту 3008');
      console.error('   2. Проблемы с подключением к API');
      console.error('   3. Ошибка в структуре данных материалов');
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

  // Загрузка задач, вопросов и материалов для всех уроков
  loadTasksAndQuestionsForAllLessons(): void {
    if (this.lessons.length === 0) {
      this.loading = false;
      return;
    }

    const loadPromises = this.lessons.map(lesson => 
      Promise.all([
        this.lessonService.getTasksForLesson(lesson.id).toPromise().catch(() => []),
        this.lessonService.getQuestionsForLesson(lesson.id).toPromise().catch(() => []),
        this.getMaterialsForLesson(lesson.id).catch(() => [])
      ]).then(([tasks, questions, materials]) => {
        lesson.tasks = tasks || [];
        lesson.questions = questions || [];
        lesson.materials = materials || [];
      })
    );

    Promise.all(loadPromises).then(() => {
      this.loading = false;
      console.log('📚 Задачи, вопросы и материалы загружены для всех уроков');
    }).catch(error => {
      console.error('Ошибка загрузки задач, вопросов и материалов для уроков:', error);
      this.loading = false;
    });
  }

  // Обновление статусов уроков (прошедшие/будущие)
  updateLessonStatuses(): void {
    // Сохраняем оригинальные статусы из API, не изменяем их
    // Фильтрация будет основана на дате и статусе в методе matchesCurrentFilter
    console.log('📊 Статусы уроков сохранены:', this.lessons.map(l => ({id: l.id, status: l.status, date: l.scheduledAt})));
  }

  // Добавление новой задачи
  addTask(): void {
    if (!this.newTaskTitle.trim() || !this.currentLesson) return;

    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    const taskData = {
      lessonId: this.currentLesson.id,
      title: this.newTaskTitle,
      description: this.newTaskDescription || null,
      createdBy: studentId,
      createdByRole: 'student' as const
    };

    this.lessonService.addTaskToLesson(taskData).subscribe({
      next: (newTask) => {
        if (this.currentLesson) {
          this.currentLesson.tasks.push(newTask);
          
          // Обновляем задачи и в списке уроков
          const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
          if (lessonInList) {
            lessonInList.tasks.push(newTask);
          }
        }
        this.clearTaskForm();
        console.log('Задача добавлена:', newTask);
      },
      error: (error) => {
        console.error('Ошибка добавления задачи:', error);
      }
    });
  }

  // Добавление нового вопроса
  addQuestion(): void {
    if (!this.newQuestionText.trim() || !this.currentLesson) return;

    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    const questionData = {
      lessonId: this.currentLesson.id,
      question: this.newQuestionText,
      createdBy: studentId,
      createdByRole: 'student' as const
    };

    this.lessonService.addQuestionToLesson(questionData).subscribe({
      next: (newQuestion) => {
        if (this.currentLesson) {
          this.currentLesson.questions.push(newQuestion);
          
          // Обновляем вопросы и в списке уроков
          const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
          if (lessonInList) {
            lessonInList.questions.push(newQuestion);
          }
        }
        this.clearQuestionForm();
        console.log('Вопрос добавлен:', newQuestion);
      },
      error: (error) => {
        console.error('Ошибка добавления вопроса:', error);
      }
    });
  }

  // Очистка формы задачи
  clearTaskForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.showAddTaskForm = false;
  }

  // Очистка формы вопроса
  clearQuestionForm(): void {
    this.newQuestionText = '';
    this.showAddQuestionForm = false;
  }

  // Отметка задачи как выполненной
  completeTask(taskId: string): void {
    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    this.lessonService.completeTask(taskId, studentId).subscribe({
      next: (updatedTask) => {
        if (this.currentLesson) {
          const taskIndex = this.currentLesson.tasks.findIndex(t => t.id === taskId);
          if (taskIndex > -1) {
            this.currentLesson.tasks[taskIndex] = updatedTask;
          }
          
          // Обновляем задачу и в списке уроков
          const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
          if (lessonInList) {
            const taskIndexInList = lessonInList.tasks.findIndex(t => t.id === taskId);
            if (taskIndexInList > -1) {
              lessonInList.tasks[taskIndexInList] = updatedTask;
            }
          }
        }
        console.log('Задача отмечена как выполненная:', updatedTask);
      },
      error: (error) => {
        console.error('Ошибка выполнения задачи:', error);
      }
    });
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
    console.log(`📊 Применяем фильтр "${this.filter}" к ${this.lessons.length} урокам`);
    
    const result = this.lessons.filter(lesson => this.matchesCurrentFilter(lesson));
    
    console.log(`📊 После фильтрации: ${result.length} уроков`, result.map(l => ({
      id: l.id, 
      date: l.scheduledAt, 
      status: l.status,
      teacherName: l.teacherName
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
    
    console.log(`📊 После сортировки: ${sorted.length} уроков`);
    return sorted;
  }

  private matchesCurrentFilter(lesson: Lesson): boolean {
    const now = new Date();
    const lessonDate = new Date(lesson.scheduledAt);
    
    // Фильтр по времени
    if (this.filter === 'future') {
      // À venir: ТОЛЬКО предстоящие уроки по времени
      const isFutureTime = lessonDate > now;
      
      console.log(`🔍 Фильтр Future для урока ${lesson.id}:`, {
        lessonDate: lessonDate.toISOString(),
        now: now.toISOString(), 
        status: lesson.status,
        isFutureTime,
        teacherName: lesson.teacherName
      });
      
      if (!isFutureTime) return false;
    } else if (this.filter === 'past') {
      // Passés: ТОЛЬКО прошедшие по времени
      const isPastTime = lessonDate <= now;
      
      console.log(`🕐 Фильтр Past для урока ${lesson.id}:`, {
        lessonDate: lessonDate.toISOString(),
        now: now.toISOString(),
        status: lesson.status,
        isPastTime,
        teacherName: lesson.teacherName
      });
      
      if (!isPastTime) return false;
    }
    // 'all' - показываем все (предстоящие, прошедшие, отмененные, ожидающие подтверждения)

    // Фильтр по преподавателю
    if (this.selectedTeacher && lesson.teacherName !== this.selectedTeacher) {
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

  get uniqueTeachers(): string[] {
    const teachers = this.lessons
      .map(lesson => lesson.teacherName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index);
    return teachers as string[];
  }

  get allHomework(): string[] {
    return [];
  }

  get stats() {
    const now = new Date();
    return {
      pastCount: this.lessons.filter(l => {
        const lessonDate = new Date(l.scheduledAt);
        return lessonDate <= now || ['completed', 'past'].includes(l.status);
      }).length,
      futureCount: this.lessons.filter(l => {
        const lessonDate = new Date(l.scheduledAt);
        return lessonDate > now || ['confirmed', 'pending', 'in_progress'].includes(l.status);
      }).length,
      totalTasks: this.lessons.reduce((acc, l) => acc + l.tasks.length, 0),
      totalQuestions: this.lessons.reduce((acc, l) => acc + l.questions.length, 0),
    };
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
      this.loadStudentLessons();
    }
  }

  // Методы-заглушки для совместимости
  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }

  addToHomework(item: any) {
    // Реализовать при nécessité
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

  recalculateStatus() {
    this.updateLessonStatuses();
    this.currentPage = 1; // Сброс на первую страницу при смене фильтра
  }

  // ==================== МЕТОДЫ ДЛЯ ОТОБРАЖЕНИЯ АВТОРСТВА ====================
  
  getTaskAuthorDisplay(task: Task): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (task.createdBy === currentUserId) {
      return 'Mes tâches';
    } else {
      // Если задача создана преподавателем, показываем имя преподавателя
      return this.currentLesson?.teacherName || 'Professeur';
    }
  }

  getQuestionAuthorDisplay(question: Question): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (question.createdBy === currentUserId) {
      return 'Mes questions';
    } else {
      // Если вопрос создан преподавателем, показываем имя преподавателя
      return this.currentLesson?.teacherName || 'Professeur';
    }
  }

  getMaterialAuthorDisplay(material: Material): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (material.createdBy === currentUserId) {
      return 'Mes matériaux';
    } else {
      // Если материал создан преподавателем, показываем имя преподавателя
      return material.createdByName || 'Professeur';
    }
  }

  isOwnContent(createdBy: string): boolean {
    const currentUserId = this.authService.getCurrentUser()?.id;
    return createdBy === currentUserId;
  }
}
