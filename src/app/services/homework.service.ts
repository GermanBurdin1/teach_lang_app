import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface Homework {
  id: string;
  title: string;
  description: string;
  assignedBy: string;
  assignedByName: string;
  assignedTo: string;
  assignedToName: string;
  lessonId?: string;
  lessonDate?: Date;
  assignedAt: Date;
  dueDate: Date;
  status: 'assigned' | 'submitted' | 'completed' | 'overdue';
  materialIds: string[]; // Linked materials
  submittedAt?: Date;
  teacherFeedback?: string;
  grade?: number;
  isLinkedToMaterials: boolean;
}

export interface CreateHomeworkRequest {
  title: string;
  description: string;
  assignedTo: string;
  lessonId?: string;
  dueDate: Date;
  materialIds?: string[];
}

@Injectable({ providedIn: 'root' })
export class HomeworkService {
  private baseUrl = 'http://localhost:3008/homework';
  
  private homework$ = new BehaviorSubject<string[]>([]);

  private teacherHomework$ = new BehaviorSubject<Homework[]>([]);
  private studentHomework$ = new BehaviorSubject<Homework[]>([]);

  constructor(private http: HttpClient) { }

  getHomeworkStream() {
    return this.homework$.asObservable();
  }

  addHomework(item: string) {
    const current = this.homework$.getValue();
    if (!current.includes(item)) {
      this.homework$.next([...current, item]);
    }
  }

  reset() {
    this.homework$.next([]);
  }

  // ==================== НОВЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С LESSON-SERVICE ====================

  // Начало урока
  startLesson(lessonId: string, startedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/start`, { lessonId, startedBy });
  }

  // Завершение урока
  endLesson(lessonId: string, endedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/end`, { lessonId, endedBy });
  }

  // Получение урока с задачами и вопросами
  getLessonWithTasksAndQuestions(lessonId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${lessonId}/details`);
  }

  // Добавление задачи к уроку
  addTaskToLesson(lessonId: string, title: string, description: string | null, createdBy: string, createdByRole: 'student' | 'teacher'): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks`, {
      lessonId,
      title,
      description,
      createdBy,
      createdByRole
    });
  }

  // Добавление вопроса к уроку
  addQuestionToLesson(lessonId: string, question: string, createdBy: string, createdByRole: 'student' | 'teacher'): Observable<any> {
    return this.http.post(`${this.baseUrl}/questions`, {
      lessonId,
      question,
      createdBy,
      createdByRole
    });
  }

  // Отметка задачи как выполненной
  completeTask(taskId: string, completedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks/${taskId}/complete`, { completedBy });
  }

  // Ответ на вопрос
  answerQuestion(questionId: string, answer: string, answeredBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/questions/${questionId}/answer`, { answer, answeredBy });
  }

  // Получение задач урока
  getTasksForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3004/lessons/${lessonId}/tasks`);
  }

  // ==================== NEW HOMEWORK SYSTEM ====================

  // Создание нового домашнего задания
  createHomework(homework: CreateHomeworkRequest): Observable<Homework> {
    return this.http.post<Homework>(this.baseUrl, homework);
  }

  // Получение домашних заданий для преподавателя
  getHomeworkForTeacher(teacherId: string): Observable<Homework[]> {
    return this.http.get<Homework[]>(`${this.baseUrl}/teacher/${teacherId}`);
  }

  // Получение домашних заданий для студента
  getHomeworkForStudent(studentId: string): Observable<Homework[]> {
    return this.http.get<Homework[]>(`${this.baseUrl}/student/${studentId}`);
  }

  // Отправка домашнего задания студентом
  submitHomework(homeworkId: string, submission: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${homeworkId}/submit`, { 
      submission,
      submittedAt: new Date(),
      status: 'submitted'
    });
  }

  // Оценка домашнего задания преподавателем
  gradeHomework(homeworkId: string, grade: number, feedback: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${homeworkId}/grade`, {
      grade,
      teacherFeedback: feedback,
      status: 'completed'
    });
  }

  // Обновление статуса домашнего задания
  updateHomeworkStatus(homeworkId: string, status: Homework['status']): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${homeworkId}/status`, { status });
  }

  // Фильтрация домашних заданий
  filterHomework(filters: {
    teacherId?: string;
    studentId?: string;
    status?: Homework['status'];
    dateFrom?: Date;
    dateTo?: Date;
  }): Observable<Homework[]> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value.toString());
    });
    
    return this.http.get<Homework[]>(`${this.baseUrl}/filter?${params.toString()}`);
  }

  // Удаление домашнего задания
  deleteHomework(homeworkId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${homeworkId}`);
  }

  // Local state streams
  getTeacherHomeworkStream(): Observable<Homework[]> {
    return this.teacherHomework$.asObservable();
  }

  getStudentHomeworkStream(): Observable<Homework[]> {
    return this.studentHomework$.asObservable();
  }

  addHomeworkToLocal(homework: Homework, isTeacher: boolean = false) {
    if (isTeacher) {
      const current = this.teacherHomework$.value;
      this.teacherHomework$.next([...current, homework]);
    } else {
      const current = this.studentHomework$.value;
      this.studentHomework$.next([...current, homework]);
    }
  }

  removeHomeworkFromLocal(homeworkId: string, isTeacher: boolean = false) {
    if (isTeacher) {
      const current = this.teacherHomework$.value;
      this.teacherHomework$.next(current.filter(h => h.id !== homeworkId));
    } else {
      const current = this.studentHomework$.value;
      this.studentHomework$.next(current.filter(h => h.id !== homeworkId));
    }
  }

  // Получение вопросов урока
  getQuestionsForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/questions`);
  }
}
