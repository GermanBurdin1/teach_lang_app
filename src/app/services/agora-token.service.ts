import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environment';

export interface AgoraAppIdResponse {
  appId: string;
}

@Injectable({
  providedIn: 'root'
})
export class AgoraTokenService {
  private readonly apiUrl = `${environment.apiUrl}/agora`;
  private appIdSubject = new BehaviorSubject<string>('');
  public appId$ = this.appIdSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadAppId();
  }

  /**
   * Загружает App ID с бэкенда
   */
  private async loadAppId(): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.get<AgoraAppIdResponse>(`${this.apiUrl}/app-id`)
      );
      this.appIdSubject.next(response.appId);
      console.log('✅ Agora App ID loaded:', response.appId);
    } catch (error) {
      console.error('❌ Failed to load Agora App ID, video calls will not work');
      // НЕ ИСПОЛЬЗУЕМ FALLBACK - пусть упадет
      throw new Error('Agora App ID not available');
    }
  }

  /**
   * Получает текущий App ID
   */
  getAppId(): string {
    return this.appIdSubject.value;
  }
}
