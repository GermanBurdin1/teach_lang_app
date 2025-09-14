import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

interface NotificationResponse {
  success: boolean;
  notification?: unknown;
  [key: string]: unknown;
}
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private baseUrl = API_ENDPOINTS.NOTIFICATIONS;

  constructor(private http: HttpClient) { }

  getNotificationsForUser(userId: string): Observable<Notification[]> {
    console.log('[NotificationService][FRONT] getNotificationsForUser called with userId:', userId);
    return this.http.get<Notification[]>(`${this.baseUrl}/${userId}`)
      .pipe(
        tap(notifs => console.log('[NotificationService][FRONT] Notifications received from backend:', notifs))
      );
  }

  updateNotificationStatus(id: string, status: 'accepted' | 'rejected'): Observable<NotificationResponse> {
    console.log('[NotificationService][FRONT] updateNotificationStatus called with id:', id, 'status:', status);
    return this.http.patch<NotificationResponse>(`${this.baseUrl}/${id}`, { status });
  }

  markAsRead(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {});
  }

  getConfirmedLessons(studentId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${API_ENDPOINTS.LESSONS}/student/${studentId}/confirmed-lessons`);
  }

  hideNotification(notificationId: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${notificationId}/hide`, {});
  }
}
