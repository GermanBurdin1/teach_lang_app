import { Component, OnInit } from '@angular/core';
import { HomeworkService } from '../../../services/homework.service';
import { LessonService } from '../../../services/lesson.service';
import { AuthService } from '../../../services/auth.service';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';

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
  showAddMaterialForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  
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

  constructor(
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private route: ActivatedRoute
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
        
        // Устанавливаем фильтр
        if (tab === 'upcoming' || tab === 'à venir') {
          this.filter = 'future';
        } else if (tab === 'past' || tab === 'passé') {
          this.filter = 'past';
        }
        
        // Загружаем конкретный урок
        this.loadLesson(lessonId);
      } else {
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
          tasks: [],
          questions: []
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
      return [this.currentLesson];
    }
    return this.lessons.filter(lesson => {
      if (this.filter === 'future') return lesson.status === 'future';
      if (this.filter === 'past') return lesson.status === 'past';
      return true;
    });
  }

  get fullFilteredLessons() {
    const result = this.lessons.filter(lesson => {
      // Фильтр по времени
      if (this.filter === 'future') {
        const lessonDate = new Date(lesson.scheduledAt);
        const now = new Date();
        if (lessonDate <= now) return false;
      }
      if (this.filter === 'past') {
        const lessonDate = new Date(lesson.scheduledAt);
        const now = new Date();
        if (lessonDate > now) return false;
      }

      // Фильтр по студенту
      if (this.selectedStudent && lesson.studentName !== this.selectedStudent) {
        return false;
      }

      // Фильтр по дате начала
      if (this.startDate) {
        const lessonDate = new Date(lesson.scheduledAt);
        const filterDate = new Date(this.startDate);
        if (lessonDate < filterDate) return false;
      }

      // Фильтр по дате окончания
      if (this.endDate) {
        const lessonDate = new Date(lesson.scheduledAt);
        const filterDate = new Date(this.endDate);
        filterDate.setHours(23, 59, 59, 999); // Конец дня
        if (lessonDate > filterDate) return false;
      }

      // Фильтр по поисковому запросу
      if (this.searchTerm) {
        const searchLower = this.searchTerm.toLowerCase();
        const hasMatchInTasks = lesson.tasks?.some(task => 
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower)
        );
        const hasMatchInQuestions = lesson.questions?.some(question =>
          question.question.toLowerCase().includes(searchLower)
        );
        
        if (!hasMatchInTasks && !hasMatchInQuestions) return false;
      }

      return true;
    });

    // Логируем только при изменении данных, а не постоянно
    if (JSON.stringify(result) !== JSON.stringify(this._lastLoggedResult)) {
      console.log('[fullFilteredLessons]', {
        filter: this.filter,
        selectedTeacher: null, // У преподавателя нет selectedTeacher
        selectedStudent: this.selectedStudent,
        startDate: this.startDate,
        endDate: this.endDate,
        searchTerm: this.searchTerm,
        result
      });
      this._lastLoggedResult = result;
    }

    return result;
  }

  private _lastLoggedResult: any[] = [];

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
    return this.lessons.filter(l => l.status === 'past').length;
  }

  get futureLessonsCount(): number {
    return this.lessons.filter(l => l.status === 'future').length;
  }

  // Методы-заглушки для совместимости
  recalculateStatus() {
    this.updateLessonStatuses();
  }

  updateUniqueStudents() {
    // Реализовать при необходимости
  }

  openGabarit(lesson: any) {
    // Реализовать при необходимости
  }

  closeGabarit() {
    // Реализовать при необходимости
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
}
