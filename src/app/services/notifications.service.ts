import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private baseUrl = 'http://localhost:3003/notifications';

  constructor(private http: HttpClient) { }

  getNotificationsForUser(userId: string): Observable<Notification[]> {
    console.log('[NotificationService][FRONT] getNotificationsForUser called with userId:', userId);
    return this.http.get<Notification[]>(`${this.baseUrl}/${userId}`)
      .pipe(
        tap(notifs => console.log('[NotificationService][FRONT] Notifications received from backend:', notifs))
      );
  }

  updateNotificationStatus(id: string, status: 'accepted' | 'rejected'): Observable<any> {
    console.log('[NotificationService][FRONT] updateNotificationStatus called with id:', id, 'status:', status);
    return this.http.patch(`${this.baseUrl}/${id}`, { status });
  }

  markAsRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`http://localhost:3004/notifications/${notificationId}/read`, {});
  }

  getConfirmedLessons(studentId: string): Observable<any[]> {
    return this.http.get<any[]>(`http://localhost:3001/lessons/student/${studentId}/confirmed-lessons`);
  }

  hideNotification(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${notificationId}/hide`, {});
  }
}
