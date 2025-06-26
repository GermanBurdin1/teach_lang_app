import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class HomeworkService {
  private baseUrl = 'http://localhost:3004/lessons';
  
  private homework$ = new BehaviorSubject<string[]>([
    '📚 Lire un article sur l\'IA',
    '📚 Résumer une vidéo TED'
  ]);

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
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/tasks`);
  }

  // Получение вопросов урока
  getQuestionsForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/questions`);
  }
}
