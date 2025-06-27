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
  teacherName?: string;
  tasks: Task[];
  questions: Question[];
}

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css']
})
export class LessonManagementComponent implements OnInit {
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

  constructor(
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Обработка параметров URL
    this.route.queryParams.subscribe(params => {
      const lessonId = params['lessonId'];
      const tab = params['tab'];
      
      if (lessonId) {
        this.highlightedLessonIdFromUrl = lessonId;
        console.log(`[StudentLessonManagement] Navigated to lesson: ${lessonId}, tab: ${tab}`);
        
        // Устанавливаем фильтр
        if (tab === 'upcoming' || tab === 'à venir') {
          this.filter = 'future';
        } else if (tab === 'past' || tab === 'passé') {
          this.filter = 'past';
        }
        
        // Загружаем конкретный урок
        this.loadLesson(lessonId);
      } else {
        // Загружаем все уроки студента
        this.loadStudentLessons();
      }
    });
  }

  // Загрузка уроков студента
  loadStudentLessons(): void {
    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    this.loading = true;
    this.lessonService.getConfirmedLessons(studentId).subscribe({
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

  // Обновление статусов уроков (прошедшие/будущие)
  updateLessonStatuses(): void {
    const now = new Date();
    this.lessons.forEach(lesson => {
      const lessonDate = new Date(lesson.scheduledAt);
      lesson.status = lessonDate > now ? 'future' : 'past';
    });
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

      // Фильтр по преподавателю
      if (this.selectedTeacher && lesson.teacherName !== this.selectedTeacher) {
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
        selectedTeacher: this.selectedTeacher,
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
    return {
      pastCount: this.lessons.filter(l => l.status === 'past').length,
      futureCount: this.lessons.filter(l => l.status === 'future').length,
      totalTasks: this.lessons.reduce((acc, l) => acc + l.tasks.length, 0),
      totalQuestions: this.lessons.reduce((acc, l) => acc + l.questions.length, 0),
    };
  }

  // Методы-заглушки для совместимости
  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }

  addToHomework(item: any) {
    // Реализовать при необходимости
  }

  recalculateStatus() {
    this.updateLessonStatuses();
  }
}
