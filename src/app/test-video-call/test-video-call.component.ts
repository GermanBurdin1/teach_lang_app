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
        <p>Agora канал: {{ videoCallService.callActive ? '🔴 Подключен' : '⚪ Отключен' }}</p>
        <p>Удалённые пользователи: {{ remoteUsersCount }}</p>
      </div>
      
      <div class="instructions" *ngIf="currentUser">
        <h3>📖 Инструкция для тестирования:</h3>
        <div class="instruction-box">
          <h4>Сценарий 1: Тестирование в одном браузере</h4>
          <ol>
            <li>Откройте <strong>2 вкладки</strong> с этой страницей</li>
            <li>В 1-й вкладке выберите <strong>"Учитель Иван"</strong></li>
            <li>Во 2-й вкладке выберите <strong>"Студент Петр"</strong></li>
            <li>В 1-й вкладке нажмите <strong>"📞 Позвонить Петру"</strong></li>
            <li>Во 2-й вкладке <strong>подтвердите вызов</strong></li>
            <li>Оба пользователя должны увидеть друг друга!</li>
          </ol>
          
          <h4>Сценарий 2: С другого ноутбука</h4>
          <ol>
            <li>Убедитесь что <strong>API Gateway запущен</strong> на этом компьютере</li>
            <li>На втором ноутбуке откройте: <strong>http://{{ currentIP }}:4200/test-video</strong></li>
            <li>Выберите разных пользователей на каждом устройстве</li>
            <li>Инициируйте звонок как в сценарии 1</li>
          </ol>
          
          <div class="ip-info">
            <strong>🌐 IP адрес для второго ноутбука:</strong>
            <code>{{ currentIP }}</code>
            <button class="copy-btn" (click)="copyIP()">📋 Копировать</button>
          </div>
        </div>
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
    
    .instructions {
      margin: 20px 0;
      padding: 15px;
      border: 2px solid #3498db;
      border-radius: 8px;
      background: #ecf0f1;
    }
    
    .instruction-box {
      background: white;
      padding: 15px;
      border-radius: 5px;
      margin: 10px 0;
    }
    
    .instruction-box h4 {
      color: #2c3e50;
      margin: 10px 0;
    }
    
    .instruction-box ol {
      margin: 10px 0;
      padding-left: 20px;
    }
    
    .instruction-box li {
      margin: 5px 0;
      line-height: 1.5;
    }
    
    .ip-info {
      background: #f8f9fa;
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
      border-left: 4px solid #27ae60;
    }
    
    .ip-info code {
      background: #2c3e50;
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      margin: 0 10px;
    }
    
    .copy-btn {
      background: #27ae60;
      color: white;
      border: none;
      padding: 5px 10px;
      border-radius: 3px;
      cursor: pointer;
      margin-left: 10px;
    }
  `]
})
export class TestVideoCallComponent implements OnInit {
  currentUser: string = '';
  currentUserName: string = '';
  wsConnected: boolean = false;
  videoActive: boolean = false;
  userRegistered: boolean = false;
  remoteUsersCount: number = 0;
  currentIP: string = 'localhost';

  constructor(
    public videoCallService: VideoCallService,
    private wsService: WebSocketService
  ) {}

  ngOnInit() {
    console.log('🧪 Тестовая страница видео звонков загружена');
    
    // Получаем локальный IP адрес
    this.getCurrentIP();
    
    // Подписываемся на изменения статуса видео
    this.videoCallService.showVideoCall$.subscribe(active => {
      this.videoActive = active;
    });
    
    // Отслеживаем количество удаленных пользователей
    setInterval(() => {
      if (this.videoCallService.agoraClient) {
        // Получаем удаленных пользователей из Agora клиента
        this.remoteUsersCount = Object.keys(this.videoCallService.remoteUsers || {}).length;
      }
    }, 1000);

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

  getCurrentIP() {
    // Простой способ получить локальный IP (работает не во всех браузерах)
    try {
      const connection = new RTCPeerConnection({ iceServers: [] });
      connection.createDataChannel('');
      connection.createOffer().then(offer => connection.setLocalDescription(offer));
      
      connection.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch && ipMatch[1] !== '127.0.0.1') {
            this.currentIP = ipMatch[1];
            connection.close();
          }
        }
      };
    } catch (error) {
      console.log('Не удалось определить IP адрес:', error);
      // Для разработки используем известный IP
      this.currentIP = '192.168.1.152'; // Ваш реальный IP
    }
  }

  copyIP() {
    const fullUrl = `http://${this.currentIP}:4200/test-video`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      alert('📋 URL скопирован в буфер обмена!');
    }).catch(() => {
      alert(`📋 Скопируйте вручную: ${fullUrl}`);
    });
  }
}
