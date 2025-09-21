import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';
import { environment } from '../../../environment';

interface LessonResponse {
  success: boolean;
  lesson?: unknown;
  [key: string]: unknown;
}

interface BookingRequest {
  id: string;
  studentId: string;
  teacherId: string;
  date: string;
  time: string;
  status: string;
  [key: string]: unknown;
}

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

@Injectable({
  providedIn: 'root'
})
export class LessonService {
  // Helper function for development-only logging
  private devLog(message: string, ...args: unknown[]): void {
    if (!environment.production) {
      console.log(message, ...args);
    }
  }
  private baseUrl = API_ENDPOINTS.LESSONS;

  constructor(private http: HttpClient) { }

  requestBooking(data: {
    studentId: string;
    teacherId: string;
    scheduledAt: string;
    paymentId?: string;
  }): Observable<LessonResponse> {
    return this.http.post<LessonResponse>(`${this.baseUrl}/book`, data);
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
  ): Observable<LessonResponse> {
    return this.http.post<LessonResponse>(`${this.baseUrl}/respond`, {
      lessonId,
      accepted,
      reason,
      ...(proposeAlternative !== undefined ? { proposeAlternative } : {}),
      ...(proposedTime ? { proposedTime } : {}),
    });
  }

  getSessionsForStudent(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/student/me/confirmed`);
  }

  getConfirmedLessons(studentId: string): Observable<unknown[]> {
    return this.http
      .get<unknown[]>(`${API_ENDPOINTS.LESSONS}/student/${studentId}/confirmed-lessons`)
      .pipe(
        tap(lessons => this.devLog('📚 Confirmed lessons received from backend:', lessons))
      );
  }

  getConfirmedStudentsForTeacher(teacherId: string): Observable<unknown[]> {
    this.devLog('[FRONT] getConfirmedStudentsForTeacher called with teacherId:', teacherId);
    return this.http.get<unknown[]>(`${this.baseUrl}/teacher/${teacherId}/confirmed-students`).pipe(
      tap(students => this.devLog('[FRONT] getConfirmedStudentsForTeacher result:', students))
    );
  }

  getAllConfirmedLessonsForTeacher(teacherId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/teacher/${teacherId}/confirmed-lessons`);
  }

  studentRespondToProposal(data: { lessonId: string; accepted: boolean; newSuggestedTime?: string }): Observable<LessonResponse> {
    this.devLog('[studentRespondToProposal] data:', data);
    return this.http.post<LessonResponse>(`${this.baseUrl}/student-respond`, data);
  }

  getLessonById(lessonId: string): Observable<LessonResponse> {
    return this.http.get<LessonResponse>(`${this.baseUrl}/${lessonId}`);
  }

  cancelLesson(lessonId: string, reason: string): Observable<LessonResponse> {
    return this.http.post<LessonResponse>(`${this.baseUrl}/cancel`, { lessonId, reason });
  }

  getStudentSentRequests(studentId: string): Observable<BookingRequest[]> {
    return this.http.get<BookingRequest[]>(`${this.baseUrl}/student/${studentId}/sent-requests`);
  }

  getStudentSentRequestsPaged(studentId: string, page = 1, limit = 10): Observable<{ data: BookingRequest[], total: number }> {
    return this.http.get<{ data: BookingRequest[], total: number }>(`${this.baseUrl}/student/${studentId}/sent-requests-paged?page=${page}&limit=${limit}`);
  }

  // Методы для работы с задачами и вопросами

  getLessonDetails(lessonId: string): Observable<LessonResponse> {
    return this.http.get<LessonResponse>(`${this.baseUrl}/${lessonId}/details`);
  }

  getTasksForLesson(lessonId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/${lessonId}/tasks`);
  }

  getQuestionsForLesson(lessonId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/${lessonId}/questions`);
  }

  addTaskToLesson(taskData: {
    lessonId: string;
    title: string;
    description?: string | null;
    createdBy: string;
    createdByRole: 'student' | 'teacher';
  }): Observable<LessonResponse> {
    return this.http.post<LessonResponse>(`${this.baseUrl}/tasks`, taskData);
  }

  addQuestionToLesson(questionData: {
    lessonId: string;
    question: string;
    createdBy: string;
    createdByRole: 'student' | 'teacher';
  }): Observable<LessonResponse> {
    return this.http.post<LessonResponse>(`${this.baseUrl}/questions`, questionData);
  }

  completeTask(taskId: string, completedBy: string): Observable<LessonResponse> {
    return this.http.post<LessonResponse>(`${this.baseUrl}/tasks/${taskId}/complete`, { completedBy });
  }

  answerQuestion(questionId: string, answer: string, teacherId: string): Observable<LessonResponse> {
    return this.http.put<LessonResponse>(`${this.baseUrl}/questions/${questionId}/answer`, {
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
