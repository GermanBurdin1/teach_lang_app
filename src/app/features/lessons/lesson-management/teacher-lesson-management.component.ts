import { Component, OnInit } from '@angular/core';
import { HomeworkService } from '../../../services/homework.service';
import { LessonService } from '../../../services/lesson.service';
import { AuthService } from '../../../services/auth.service';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoCallService } from '../../../services/video-call.service';

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

interface Lesson {
  id: string;
  teacherId: string;
  studentId: string;
  scheduledAt: Date;
  status: string;
  studentName?: string;
  tasks: Task[];
  questions: Question[];
}

@Component({
  selector: 'app-teacher-lesson-management',
  templateUrl: './teacher-lesson-management.component.html',
  styleUrls: ['./teacher-lesson-management.component.css']
})
export class TeacherLessonManagementComponent implements OnInit {
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
  visibleCount = 4;

  // Данные
  lessons: Lesson[] = [];
  currentLesson: Lesson | null = null;
  
  // Формы для добавления
  showAddTaskForm = false;
  showAddQuestionForm = false;
  showAddMaterialForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newQuestionText = '';
  
  // Материалы
  newMaterialTitle = '';
  newMaterialType: 'text' | 'audio' | 'video' = 'text';
  newMaterialContent = '';
  
  // Ответы на вопросы
  answeringQuestionId: string | null = null;
  answerText = '';
  
  // Загрузка
  loading = false;
  
  // Параметры URL
  highlightedLessonIdFromUrl: string | null = null;
  
  // Для совместимости со старым кодом
  resolvedItemsPerLesson: { [key: string]: string[] } = {};
  questionDropListIds: string[] = [];
  taskDropListIds: string[] = [];
  activeLesson: any = null;

  constructor(
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private videoCallService: VideoCallService
  ) { }

  ngOnInit() {
    // Проверяем авторизацию
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.warn('[TeacherLessonManagement] User not authenticated, waiting...');
      // Можно подписаться на изменения состояния авторизации
      setTimeout(() => {
        const retryUser = this.authService.getCurrentUser();
        if (retryUser) {
          console.log('[TeacherLessonManagement] User loaded on retry:', retryUser);
          this.initializeComponent();
        } else {
          console.error('[TeacherLessonManagement] Still no user after retry');
        }
      }, 1000);
      return;
    }

    console.log('[TeacherLessonManagement] User authenticated:', currentUser);
    this.initializeComponent();
  }

  private initializeComponent() {
    // Обработка параметров URL
    this.route.queryParams.subscribe(params => {
      const lessonId = params['lessonId'];
      const tab = params['tab'];
      
      if (lessonId) {
        this.highlightedLessonIdFromUrl = lessonId;
        console.log(`[TeacherLessonManagement] Navigated to lesson: ${lessonId}, tab: ${tab}`);
        
        // Устанавливаем фильтр в зависимости от tab параметра
        if (tab === 'upcoming' || tab === 'à venir') {
          this.filter = 'future';
        } else if (tab === 'past' || tab === 'passé') {
          this.filter = 'past';
        } else if (tab === 'all' || tab === 'tous') {
          this.filter = 'all';
        } else {
          // По умолчанию показываем предстоящие уроки
          this.filter = 'future';
        }
        
        // Загружаем конкретный урок
        this.loadLesson(lessonId);
      } else {
        // При прямом заходе на вкладку показываем предстоящие уроки
        this.filter = 'future';
        // Загружаем все уроки преподавателя
        this.loadTeacherLessons();
      }
    });
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
      next: (lessons) => {
        this.lessons = lessons.map(lesson => ({
          ...lesson,
          tasks: lesson.tasks || [],
          questions: lesson.questions || []
        }));
        this.updateLessonStatuses();
        this.loading = false;
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

  // Загрузка задач и вопросов для урока
  loadTasksAndQuestions(lessonId: string): void {
    Promise.all([
      this.lessonService.getTasksForLesson(lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(lessonId).toPromise()
    ]).then(([tasks, questions]) => {
      if (this.currentLesson) {
        this.currentLesson.tasks = tasks || [];
        this.currentLesson.questions = questions || [];
      }
      this.loading = false;
    }).catch(error => {
      console.error('Ошибка загрузки задач и вопросов:', error);
      this.loading = false;
    });
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

  // Добавление вопроса студенту
  addQuestionToStudent(): void {
    if (!this.newQuestionText.trim() || !this.currentLesson) return;

    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;

    const questionData = {
      lessonId: this.currentLesson.id,
      question: this.newQuestionText,
      createdBy: teacherId,
      createdByRole: 'teacher' as const
    };

    this.lessonService.addQuestionToLesson(questionData).subscribe({
      next: (newQuestion) => {
        if (this.currentLesson) {
          this.currentLesson.questions.push(newQuestion);
        }
        this.clearQuestionForm();
        console.log('Вопрос добавлен студенту:', newQuestion);
      },
      error: (error) => {
        console.error('Ошибка добавления вопроса:', error);
      }
    });
  }

  // Ответ на вопрос студента
  answerQuestion(questionId: string): void {
    if (!this.answerText.trim()) return;

    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;

    this.lessonService.answerQuestion(questionId, this.answerText, teacherId).subscribe({
      next: (updatedQuestion) => {
        if (this.currentLesson) {
          const questionIndex = this.currentLesson.questions.findIndex(q => q.id === questionId);
          if (questionIndex > -1) {
            this.currentLesson.questions[questionIndex] = updatedQuestion;
          }
        }
        this.clearAnswerForm();
        console.log('Ответ добавлен:', updatedQuestion);
      },
      error: (error) => {
        console.error('Ошибка добавления ответа:', error);
      }
    });
  }

  // Начать отвечать на вопрос
  startAnswering(questionId: string): void {
    this.answeringQuestionId = questionId;
    this.answerText = '';
  }

  // Отменить ответ
  cancelAnswering(): void {
    this.answeringQuestionId = null;
    this.answerText = '';
  }

  // Очистка формы задачи
  clearTaskForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.showAddTaskForm = false;
  }

  clearQuestionForm(): void {
    this.newQuestionText = '';
    this.showAddQuestionForm = false;
  }

  // Очистка формы ответа
  clearAnswerForm(): void {
    this.answeringQuestionId = null;
    this.answerText = '';
  }

  // Очистка формы материала
  clearMaterialForm(): void {
    this.newMaterialTitle = '';
    this.newMaterialContent = '';
    this.newMaterialType = 'text';
    this.showAddMaterialForm = false;
  }

  // Получение студенческих задач
  get studentTasks(): Task[] {
    return this.currentLesson?.tasks.filter(task => task.createdByRole === 'student') || [];
  }

  // Получение преподавательских задач
  get teacherTasks(): Task[] {
    return this.currentLesson?.tasks.filter(task => task.createdByRole === 'teacher') || [];
  }

  // Получение неотвеченных вопросов
  get unansweredQuestions(): Question[] {
    return this.currentLesson?.questions.filter(q => !q.isAnswered) || [];
  }

  // Получение отвеченных вопросов
  get answeredQuestions(): Question[] {
    return this.currentLesson?.questions.filter(q => q.isAnswered) || [];
  }

  // Геттеры для совместимости с шаблоном
  get filteredLessons() {
    if (this.currentLesson) {
      // Когда выбран конкретный урок через calendar, показываем его первым, затем остальные
      const otherLessons = this.lessons.filter(lesson => 
        lesson.id !== this.currentLesson!.id && this.matchesCurrentFilter(lesson)
      );
      return [this.currentLesson, ...otherLessons].slice(0, this.visibleCount);
    }
    
    // Когда заходим на вкладку напрямую, показываем все подходящие уроки
    return this.fullFilteredLessons.slice(0, this.visibleCount);
  }

  get fullFilteredLessons() {
    const result = this.lessons.filter(lesson => this.matchesCurrentFilter(lesson));

    // Если есть выделенный урок (через calendar), ставим его первым
    if (this.highlightedLessonIdFromUrl) {
      const highlightedLesson = result.find(l => l.id === this.highlightedLessonIdFromUrl);
      const otherLessons = result.filter(l => l.id !== this.highlightedLessonIdFromUrl);
      
      if (highlightedLesson) {
        return [highlightedLesson, ...otherLessons];
      }
    }

    // Сортируем по дате: предстоящие по возрастанию, прошедшие по убыванию
    return result.sort((a, b) => {
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
  }

  private matchesCurrentFilter(lesson: Lesson): boolean {
    const now = new Date();
    const lessonDate = new Date(lesson.scheduledAt);
    
    // Фильтр по времени
    if (this.filter === 'future') {
      // À venir: все предстоящие уроки + подтвержденные будущие
      const isFutureTime = lessonDate > now;
      const isFutureStatus = ['confirmed', 'pending', 'in_progress'].includes(lesson.status);
      if (!isFutureTime && !isFutureStatus) return false;
    } else if (this.filter === 'past') {
      // Passés: только прошедшие по времени или завершенные
      const isPastTime = lessonDate <= now;
      const isPastStatus = ['completed', 'past'].includes(lesson.status);
      if (!isPastTime && !isPastStatus) return false;
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

  loadMore() {
    this.visibleCount += 4;
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

}
