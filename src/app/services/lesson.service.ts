import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

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
  }): Observable<any> {
    return this.http.post(`${this.baseUrl}/book`, data);
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
        tap(lessons => console.log('📚 Confirmed lessons received from backend:', lessons))
      );
  }

  getConfirmedStudentsForTeacher(teacherId: string): Observable<any[]> {
    console.log('[FRONT] getConfirmedStudentsForTeacher called with teacherId:', teacherId);
    return this.http.get<any[]>(`${this.baseUrl}/teacher/${teacherId}/confirmed-students`).pipe(
      tap(students => console.log('[FRONT] getConfirmedStudentsForTeacher result:', students))
    );
  }

  getAllConfirmedLessonsForTeacher(teacherId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/teacher/${teacherId}/confirmed-lessons`);
  }

  studentRespondToProposal(data: { lessonId: string; accepted: boolean; newSuggestedTime?: string }): Observable<any> {
    console.log('[studentRespondToProposal] data:', data);
    return this.http.post(`${this.baseUrl}/student-respond`, data);
  }

  getLessonById(lessonId: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${lessonId}`);
  }
}
