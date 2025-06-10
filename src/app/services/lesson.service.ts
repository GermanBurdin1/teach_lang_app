import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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



  getSessionsForStudent(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/student/me/confirmed`);
  }

  getConfirmedLessons(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/student/${studentId}/confirmed-lessons`);
  }
}
