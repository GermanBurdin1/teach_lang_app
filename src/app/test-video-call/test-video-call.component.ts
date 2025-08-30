import { Component, OnInit } from '@angular/core';
import { VideoCallService } from '../services/video-call.service';
import { WebSocketService } from '../services/web-socket.service';

@Component({
  selector: 'app-test-video-call',
  template: `
    <div class="test-container">
      <h1>🎥 Тест видео звонков</h1>
      
      <div class="user-section">
        <h3>Выберите пользователя:</h3>
        <button class="user-btn teacher" (click)="setUser('teacher1', 'Учитель Иван')">
          👨‍🏫 Учитель Иван (teacher1)
        </button>
        <button class="user-btn student" (click)="setUser('student1', 'Студент Петр')">
          👨‍🎓 Студент Петр (student1)
        </button>
        <button class="user-btn student" (click)="setUser('student2', 'Студент Мария')">
          👩‍🎓 Студент Мария (student2)
        </button>
      </div>

      <div class="current-user" *ngIf="currentUser">
        <h3>Текущий пользователь: {{ currentUserName }} ({{ currentUser }})</h3>
      </div>

      <div class="actions" *ngIf="currentUser">
        <h3>Действия:</h3>
        <button class="action-btn start" (click)="startVideoCall()" [disabled]="videoActive">
          📹 Запустить видео канал
        </button>
        <button class="action-btn stop" (click)="stopVideoCall()" [disabled]="!videoActive">
          🔴 Остановить видео канал
        </button>
        
        <div class="call-targets" *ngIf="currentUser !== 'teacher1'">
          <button class="action-btn" (click)="callUser('teacher1')">
            📞 Позвонить учителю
          </button>
        </div>
        
        <div class="call-targets" *ngIf="currentUser === 'teacher1'">
          <button class="action-btn" (click)="callUser('student1')">
            📞 Позвонить Петру
          </button>
          <button class="action-btn" (click)="callUser('student2')">
            📞 Позвонить Марии
          </button>
        </div>
      </div>

      <div class="status">
        <h3>Статус:</h3>
        <p>WebSocket: {{ wsConnected ? '✅ Подключен' : '❌ Отключен' }}</p>
        <p>Видео: {{ videoActive ? '📹 Активно' : '📵 Неактивно' }}</p>
        <p>Пользователь зарегистрирован: {{ userRegistered ? '✅ Да' : '❌ Нет' }}</p>
      </div>

      <!-- Компонент видео звонка -->
      <app-video-call 
        *ngIf="videoCallService.showVideoCallSubject.getValue()"
        [isFloatingMode]="false">
      </app-video-call>
    </div>
  `,
  styles: [`
    .test-container {
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    
    .user-section, .actions, .status {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
    }
    
    .user-btn, .action-btn {
      margin: 5px;
      padding: 10px 20px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    }
    
    .user-btn.teacher {
      background: #3498db;
      color: white;
    }
    
    .user-btn.student {
      background: #2ecc71;
      color: white;
    }
    
    .action-btn {
      background: #e74c3c;
      color: white;
    }
    
    .action-btn.start {
      background: #27ae60;
    }
    
    .action-btn.stop {
      background: #e74c3c;
    }
    
    .action-btn:disabled {
      background: #bdc3c7;
      cursor: not-allowed;
      opacity: 0.5;
    }
    
    .user-btn:hover, .action-btn:hover {
      opacity: 0.8;
    }
    
    .current-user {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
    }
    
    .call-targets {
      margin: 10px 0;
    }
    
    .status p {
      margin: 5px 0;
      font-weight: bold;
    }
  `]
})
export class TestVideoCallComponent implements OnInit {
  currentUser: string = '';
  currentUserName: string = '';
  wsConnected: boolean = false;
  videoActive: boolean = false;
  userRegistered: boolean = false;

  constructor(
    public videoCallService: VideoCallService,
    private wsService: WebSocketService
  ) {}

  ngOnInit() {
    console.log('🧪 Тестовая страница видео звонков загружена');
    
    // Подписываемся на изменения статуса видео
    this.videoCallService.showVideoCall$.subscribe(active => {
      this.videoActive = active;
    });

    // Слушаем события подключения WebSocket
    this.wsService.listen('connect').subscribe(() => {
      this.wsConnected = true;
      console.log('✅ WebSocket подключен!');
    });

    this.wsService.listen('disconnect').subscribe(() => {
      this.wsConnected = false;
      this.userRegistered = false;
      console.log('❌ WebSocket отключен!');
    });

    // Слушаем события WebSocket
    this.wsService.listen('registered').subscribe(() => {
      this.userRegistered = true;
      console.log('✅ Пользователь зарегистрирован в WebSocket');
    });

    this.wsService.listen('call_invite').subscribe((data: any) => {
      console.log(`📞 Входящий вызов от ${data.from}`);
      const accept = confirm(`📞 Входящий вызов от ${data.from}. Принять?`);
      if (accept) {
        this.wsService.acceptCall(data.from, data.to);
        this.startVideoCall();
      } else {
        this.wsService.rejectCall(data.from, data.to);
      }
    });

    this.wsService.listen('call_accept').subscribe((data: any) => {
      console.log(`✅ Пользователь ${data.from} принял вызов`);
      this.startVideoCall();
    });

    this.wsService.listen('call_reject').subscribe((data: any) => {
      alert(`❌ Пользователь отклонил вызов`);
    });
  }

  setUser(userId: string, userName: string) {
    this.currentUser = userId;
    this.currentUserName = userName;
    
    // Устанавливаем данные пользователя в сервисе
    this.videoCallService.setLessonData('test-lesson-123', userId);
    
    // Регистрируем в WebSocket
    this.wsService.registerUser(userId);
    
    console.log(`👤 Выбран пользователь: ${userName} (${userId})`);
  }

  startVideoCall() {
    console.log('🎥 Запуск видео звонка');
    this.videoCallService.startVideoCall();
  }

  stopVideoCall() {
    console.log('🔴 Остановка видео звонка');
    this.videoCallService.stopVideoCall();
    // Также отключаемся от Agora канала
    this.videoCallService.leaveChannel();
  }

  callUser(targetUserId: string) {
    if (!this.currentUser) {
      alert('❌ Сначала выберите пользователя');
      return;
    }
    
    console.log(`📞 Звоним пользователю ${targetUserId}`);
    this.wsService.initiateCall(targetUserId, this.currentUser);
  }
}
