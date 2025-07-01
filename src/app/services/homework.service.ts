import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment';

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
  createdInClass: boolean; // true если создано во время урока, false если в TrainingComponent
  sourceType?: string; // тип источника (task, question, material)
  sourceItemId?: string; // ID исходного элемента
  sourceItemText?: string; // текст исходного элемента
}

export interface CreateHomeworkRequest {
  lessonId: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  materialIds?: string[];
  sourceType?: string;
  sourceItemId?: string;
  sourceItemText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HomeworkService {
  private baseUrl = `${environment.apiUrl}/lessons`;
  private homeworkUpdated = new BehaviorSubject<boolean>(false);

  private homework$ = new BehaviorSubject<string[]>([]);

  private teacherHomework$ = new BehaviorSubject<Homework[]>([]);
  private studentHomework$ = new BehaviorSubject<Homework[]>([]);

  constructor(private http: HttpClient) {}

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
    return this.http.post(`${this.baseUrl}/${lessonId}/start`, { startedBy });
  }

  // Завершение урока
  endLesson(lessonId: string, endedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${lessonId}/end`, { endedBy });
  }

  // Получение урока с задачами и вопросами
  getLessonWithTasksAndQuestions(lessonId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${lessonId}/details`);
  }

  // Добавление задачи к уроку
  addTaskToLesson(lessonId: string, title: string, description: string | null, createdBy: string, createdByRole: 'student' | 'teacher'): Observable<any> {
    return this.http.post(`${this.baseUrl}/${lessonId}/tasks`, {
      title,
      description,
      createdBy,
      createdByRole
    });
  }

  // Добавление вопроса к уроку
  addQuestionToLesson(lessonId: string, question: string, createdBy: string, createdByRole: 'student' | 'teacher'): Observable<any> {
    return this.http.post(`${this.baseUrl}/${lessonId}/questions`, {
      question,
      createdBy,
      createdByRole
    });
  }

  // Отметка задачи как выполненной
  completeTask(taskId: string, completedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks/${taskId}/complete`, { completedBy });
  }

  // Отметка домашнего задания как выполненного
  completeHomeworkItem(homeworkId: string, completedBy: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/homework-item/${homeworkId}/complete`, { completedBy });
  }

  completeQuestion(questionId: string, completedBy: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/questions/${questionId}/complete`, { completedBy });
  }

  // Ответ на вопрос
  answerQuestion(questionId: string, answer: string, answeredBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/questions/${questionId}/answer`, { answer, answeredBy });
  }

  // Получение задач урока
  getTasksForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/tasks`);
  }

  // ==================== NEW HOMEWORK SYSTEM ====================

  // Получение домашних заданий для урока
  getHomeworkForLesson(lessonId: string): Observable<Homework[]> {
    return this.http.get<Homework[]>(`${this.baseUrl}/${lessonId}/homework`);
  }

  // Получение домашних заданий для студента
  getHomeworkForStudent(studentId: string): Observable<Homework[]> {
    const url = `${this.baseUrl}/student/${studentId}/homework`;
    console.log(`📋 [FRONTEND SERVICE] Отправляем запрос студента на: ${url}`);
    console.log(`📋 [FRONTEND SERVICE] baseUrl: ${this.baseUrl}`);
    console.log(`📋 [FRONTEND SERVICE] studentId: ${studentId}`);
    
    return this.http.get<Homework[]>(url);
  }

  // Получение домашних заданий для преподавателя
  getHomeworkForTeacher(teacherId: string): Observable<Homework[]> {
    const url = `${this.baseUrl}/teacher/${teacherId}/homework`;
    console.log(`📋 [FRONTEND SERVICE] Отправляем запрос на: ${url}`);
    console.log(`📋 [FRONTEND SERVICE] baseUrl: ${this.baseUrl}`);
    console.log(`📋 [FRONTEND SERVICE] teacherId: ${teacherId}`);
    
    return this.http.get<Homework[]>(url);
  }

  // Создание домашнего задания
  createHomework(lessonId: string, homework: Partial<Homework>): Observable<Homework> {
    return this.http.post<Homework>(`${this.baseUrl}/${lessonId}/homework`, homework);
  }

  // Обновление статуса домашнего задания
  updateHomeworkStatus(homeworkId: string, status: string): Observable<Homework> {
    return this.http.patch<Homework>(`${this.baseUrl}/homework/${homeworkId}/status`, { status });
  }

  // Добавление оценки и отзыва
  addGradeAndFeedback(homeworkId: string, grade: number, feedback: string): Observable<Homework> {
    return this.http.patch<Homework>(`${this.baseUrl}/homework/${homeworkId}/grade`, { grade, feedback });
  }

  // Уведомление об обновлении домашних заданий
  notifyHomeworkUpdated() {
    this.homeworkUpdated.next(true);
  }

  // Подписка на обновления домашних заданий
  onHomeworkUpdated(): Observable<boolean> {
    return this.homeworkUpdated.asObservable();
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
    
    return this.http.get<Homework[]>(`${this.baseUrl}/homework/filter?${params.toString()}`);
  }

  // Удаление домашнего задания
  deleteHomework(homeworkId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/homework/${homeworkId}`);
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

  // ==================== УЛУЧШЕННЫЕ МЕТОДЫ ДЛЯ СОЗДАНИЯ ДОМАШНИХ ЗАДАНИЙ ====================

  // Создание домашнего задания из урока (lesson-material)
  createHomeworkFromLesson(data: {
    lessonId: string;
    title: string;
    description: string;
    dueDate: Date;
    assignedBy: string;
    assignedTo: string;
    sourceType: 'task' | 'question' | 'material';
    sourceItemId: string;
    sourceItemText: string;
    materialIds?: string[];
  }): Observable<Homework> {
    const homeworkData = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      itemType: data.sourceType as 'task' | 'question' | 'material',
      originalItemId: data.sourceItemId,
      createdBy: data.assignedBy,
      createdByRole: 'teacher' as const
    };

    console.log('📝 Создаем домашнее задание через lesson-service:', homeworkData);
    return this.http.post<Homework>(`${this.baseUrl}/${data.lessonId}/homework`, homeworkData);
  }

  // Создание домашнего задания из training компонента
  createHomeworkFromTraining(data: {
    title: string;
    description: string;
    dueDate: Date;
    assignedBy: string;
    assignedTo: string;
    lessonId?: string; // связанный урок
    materialIds?: string[];
  }): Observable<Homework> {
    const homeworkData = {
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      itemType: 'task' as const, // Используем 'task' вместо 'manual' 
      originalItemId: null, // Для ручного создания не связываем с конкретным элементом
      createdBy: data.assignedBy,
      createdByRole: 'teacher' as const
    };

    if (data.lessonId) {
      console.log('📝 Создаем домашнее задание для урока:', data.lessonId);
      return this.http.post<Homework>(`${this.baseUrl}/${data.lessonId}/homework`, homeworkData);
    } else {
      console.log('📝 Создаем общее домашнее задание');
      return this.http.post<Homework>(`${this.baseUrl}/homework/general`, homeworkData);
    }
  }

  // Обновление существующего метода для совместимости
  createHomeworkLegacy(homework: CreateHomeworkRequest): Observable<Homework> {
    if (!homework.lessonId) {
      throw new Error('lessonId is required');
    }
    return this.createHomework(homework.lessonId, homework);
  }
}
