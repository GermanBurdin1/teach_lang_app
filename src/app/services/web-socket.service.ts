import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: Socket;

  constructor() {
    console.log('🔌 Инициализация WebSocket подключения к http://localhost:3011');
    
    this.socket = io('http://localhost:3011', {
      transports: ['websocket', 'polling'], // Добавляем fallback
      forceNew: true,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    this.socket.on('connect', () => {
      console.log('✅ WebSocket успешно подключен к API Gateway');
      console.log('🔌 Socket ID:', this.socket.id);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket отключен от API Gateway. Причина:', reason);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('❌ Ошибка подключения WebSocket:', error);
      console.error('🔍 Детали ошибки:', error.message);
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`🔄 WebSocket переподключен после ${attemptNumber} попыток`);
    });
    
    this.socket.on('reconnect_error', (error) => {
      console.error('❌ Ошибка переподключения WebSocket:', error);
    });
    
    this.socket.on('reconnect_failed', () => {
      console.error('❌ Не удалось переподключиться к WebSocket');
    });
  }

  sendMessage(event: string, data: any) {
    this.socket.emit(event, data);
  }

  listen(event: string): Observable<any> {
    return new Observable(observer => {
      this.socket.on(event, (data) => {
        observer.next(data);
      });
    });
  }

  registerUser(userId: string) {
    this.sendMessage('register', userId);
  }

  // Методы для видео звонков
  initiateCall(targetUserId: string, fromUserId: string) {
    this.sendMessage('call_invite', { to: targetUserId, from: fromUserId });
  }

  acceptCall(fromUserId: string, toUserId: string) {
    this.sendMessage('call_accept', { to: fromUserId, from: toUserId });
  }

  rejectCall(fromUserId: string, toUserId: string) {
    this.sendMessage('call_reject', { to: fromUserId, from: toUserId });
  }
}
