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

  respondToBooking(lessonId: string, accepted: boolean, reason?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/respond`, {
      lessonId,
      accepted,
      reason,
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
}
