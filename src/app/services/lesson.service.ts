import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface TeacherTimeSlot {
  time: string;
  available: boolean;
  type: 'available' | 'lesson' | 'break' | 'blocked';
  reason?: string;
  studentName?: string;
  lessonId?: string;
  interval?: {
    start: string;
    end: string;
    duration: number;
  };
}

// TODO : ajouter gestion des créneaux récurrents
@Injectable({
  providedIn: 'root'
})
export class LessonService {
  private baseUrl = 'http://localhost:3004/lessons';

  constructor(private http: HttpClient) { }

  requestBooking(data: {
    studentId: string;
    teacherId: string;
    scheduledAt: string;
    paymentId?: string;
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/book`, data);
  }

  getAvailableSlots(teacherId: string, date?: string): Observable<TeacherTimeSlot[]> {
    const params = date ? `?date=${date}` : '';
    return this.http.get<TeacherTimeSlot[]>(`${this.baseUrl}/teacher/${teacherId}/available-slots${params}`);
  }

  respondToBooking(
    lessonId: string,
    accepted: boolean,
    reason?: string,
    proposeAlternative?: boolean,
    proposedTime?: string
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/respond`, {
      lessonId,
      accepted,
      reason,
      ...(proposeAlternative !== undefined ? { proposeAlternative } : {}),
      ...(proposedTime ? { proposedTime } : {}),
    });
  }

  getSessionsForStudent(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/student/me/confirmed`);
  }

  getConfirmedLessons(studentId: string): Observable<any[]> {
    return this.http
      .get<any[]>(`http://localhost:3004/lessons/student/${studentId}/confirmed-lessons`)
      .pipe(
        tap(lessons => console.log('[LessonService] Cours confirmés reçus du backend:', lessons))
      );
  }

  getConfirmedStudentsForTeacher(teacherId: string): Observable<any[]> {
    console.log('[LessonService] getConfirmedStudentsForTeacher appelé avec teacherId:', teacherId);
    return this.http.get<any[]>(`${this.baseUrl}/teacher/${teacherId}/confirmed-students`).pipe(
      tap(students => console.log('[LessonService] Résultat getConfirmedStudentsForTeacher:', students))
    );
  }

  getAllConfirmedLessonsForTeacher(teacherId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/teacher/${teacherId}/confirmed-lessons`);
  }

  studentRespondToProposal(data: { lessonId: string; accepted: boolean; newSuggestedTime?: string }): Observable<any> {
    console.log('[LessonService] studentRespondToProposal data:', data);
    return this.http.post(`${this.baseUrl}/student-respond`, data);
  }

  getLessonById(lessonId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${lessonId}`);
  }

  cancelLesson(lessonId: string, reason: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/cancel`, { lessonId, reason });
  }

  getStudentSentRequests(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/student/${studentId}/sent-requests`);
  }

  getStudentSentRequestsPaged(studentId: string, page = 1, limit = 10): Observable<{ data: any[], total: number }> {
    return this.http.get<{ data: any[], total: number }>(`${this.baseUrl}/student/${studentId}/sent-requests-paged?page=${page}&limit=${limit}`);
  }

  // méthodes pour travailler avec les tâches et questions

  getLessonDetails(lessonId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${lessonId}/details`);
  }

  getTasksForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/tasks`);
  }

  getQuestionsForLesson(lessonId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/${lessonId}/questions`);
  }

  addTaskToLesson(taskData: {
    lessonId: string;
    title: string;
    description?: string | null;
    createdBy: string;
    createdByRole: 'student' | 'teacher';
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks`, taskData);
  }

  addQuestionToLesson(questionData: {
    lessonId: string;
    question: string;
    createdBy: string;
    createdByRole: 'student' | 'teacher';
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/questions`, questionData);
  }

  completeTask(taskId: string, completedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/tasks/${taskId}/complete`, { completedBy });
  }

  answerQuestion(questionId: string, answer: string, teacherId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/questions/${questionId}/answer`, {
      answer,
      answeredBy: teacherId
    });
  }

  startLesson(lessonId: string, startedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/start`, { lessonId, startedBy });
  }

  endLesson(lessonId: string, endedBy: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/end`, { lessonId, endedBy });
  }
}
