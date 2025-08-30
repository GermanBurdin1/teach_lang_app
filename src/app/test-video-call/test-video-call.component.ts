import { Component, OnInit } from '@angular/core';
import { VideoCallService } from '../services/video-call.service';
import { WebSocketService } from '../services/web-socket.service';

interface GroupRoom {
  id: string;
  name: string;
  creator: string;
  participants: string[];
  maxParticipants: number;
  createdAt: Date;
}

interface AvailableRoom {
  id: string;
  name: string;
  participants: number;
  creator: string;
}

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
        <button class="user-btn student" (click)="setUser('student3', 'Студент Алиса')">
          👩‍🎓 Студент Алиса (student3)
        </button>
        <button class="user-btn student" (click)="setUser('student4', 'Студент Никита')">
          👨‍🎓 Студент Никита (student4)
        </button>
      </div>

      <div class="current-user" *ngIf="currentUser">
        <h3>Текущий пользователь: {{ currentUserName }} ({{ currentUser }})</h3>
      </div>

      <div class="actions" *ngIf="currentUser">
        <h3>Действия:</h3>
        
        <!-- Индивидуальные звонки -->
        <div class="action-section">
          <h4>🎯 Индивидуальные звонки:</h4>
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

        <!-- Групповые конференции -->
        <div class="action-section group-section">
          <h4>👥 Групповые конференции:</h4>
          
          <!-- Для преподавателя -->
          <div *ngIf="currentUser === 'teacher1'" class="teacher-controls">
            <div class="room-creation">
              <input type="text" 
                     [(ngModel)]="newRoomName" 
                     placeholder="Название комнаты (например: Урок математики)"
                     class="room-input">
              <button class="action-btn conference" 
                      (click)="createGroupRoom()" 
                      [disabled]="!newRoomName || groupRoomActive">
                🏫 Создать групповую комнату
              </button>
            </div>
            
            <div *ngIf="currentGroupRoom" class="active-room">
              <p><strong>Активная комната:</strong> {{ currentGroupRoom.name }}</p>
              <p><strong>Код комнаты:</strong> <code>{{ currentGroupRoom.id }}</code></p>
              <p><strong>Участников:</strong> {{ groupParticipants.length }}/10</p>
              
              <!-- Управление участниками -->
              <div class="participants-management">
                <h5>👥 Участники:</h5>
                <div class="participants-list">
                  <span *ngFor="let participant of groupParticipants" class="participant-tag">
                    {{ getParticipantName(participant) }}
                    <button *ngIf="participant !== currentUser" 
                            class="remove-participant-btn" 
                            (click)="removeParticipant(participant)"
                            title="Исключить участника">
                      ✕
                    </button>
                  </span>
                </div>
                
                <!-- Приглашение новых участников -->
                <div class="invite-section">
                  <h5>➕ Пригласить участников:</h5>
                  <div class="available-users">
                    <button *ngFor="let user of getAvailableUsersToInvite()" 
                            class="invite-user-btn"
                            (click)="inviteUserToRoom(user.id)"
                            [disabled]="groupParticipants.length >= 10">
                      {{ user.icon }} {{ user.name }}
                    </button>
                  </div>
                </div>
              </div>
              
              <div class="room-actions">
                <button class="action-btn stop" (click)="closeGroupRoom()">
                  🔴 Закрыть комнату
                </button>
                <button class="action-btn" (click)="copyRoomInfo()">
                  📋 Копировать код комнаты
                </button>
              </div>
            </div>
          </div>

          <!-- Для студентов -->
          <div *ngIf="currentUser !== 'teacher1'" class="student-controls">
            <div class="room-join">
              <input type="text" 
                     [(ngModel)]="roomCodeToJoin" 
                     placeholder="Код комнаты"
                     class="room-input">
              <button class="action-btn conference" 
                      (click)="joinGroupRoom()" 
                      [disabled]="!roomCodeToJoin || groupRoomActive">
                🚪 Присоединиться к комнате
              </button>
            </div>
            
            <div *ngIf="currentGroupRoom" class="joined-room">
              <p><strong>В комнате:</strong> {{ currentGroupRoom.name }}</p>
              <p><strong>Участников:</strong> {{ groupParticipants.length }}/10</p>
              <button class="action-btn stop" (click)="leaveGroupRoom()">
                🚪 Покинуть комнату
              </button>
            </div>
          </div>

          <!-- Список доступных комнат -->
          <div *ngIf="availableRooms.length > 0" class="available-rooms">
            <h5>📋 Доступные комнаты:</h5>
            <div *ngFor="let room of availableRooms" class="room-item">
              <span>{{ room.name }} ({{ room.participants }}/10)</span>
              <button class="action-btn small" 
                      (click)="quickJoinRoom(room.id)"
                      [disabled]="room.participants >= 10">
                Войти
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="status">
        <h3>Статус:</h3>
        <p>WebSocket: {{ wsConnected ? '✅ Подключен' : '❌ Отключен' }}</p>
        <p>Видео: {{ videoActive ? '📹 Активно' : '📵 Неактивно' }}</p>
        <p>Пользователь зарегистрирован: {{ userRegistered ? '✅ Да' : '❌ Нет' }}</p>
        <p>Agora канал: {{ videoCallService.callActive ? '🔴 Подключен' : '⚪ Отключен' }}</p>
        <p>Канал: {{ videoCallService.channelName }}</p>
        <p>Пользователь ID: {{ videoCallService.userId }}</p>
        <p>Удалённые пользователи: {{ remoteUsersCount }}</p>
        <p>Групповая комната: {{ currentGroupRoom ? '✅ ' + currentGroupRoom.name : '❌ Не в комнате' }}</p>
      </div>
      
      <div class="instructions" *ngIf="currentUser">
        <h3>📖 Инструкция для тестирования:</h3>
        <div class="instruction-box">
                       <h4>🎯 Сценарий 1: Индивидуальные звонки</h4>
             <ol>
               <li>Откройте <strong>2 вкладки</strong> с этой страницей</li>
               <li>В 1-й вкладке выберите <strong>"Учитель Иван"</strong></li>
               <li>Во 2-й вкладке выберите <strong>"Студент Петр"</strong></li>
               <li>В 1-й вкладке нажмите <strong>"📞 Позвонить Петру"</strong></li>
               <li>Во 2-й вкладке <strong>подтвердите вызов</strong></li>
               <li>Оба пользователя должны увидеть друг друга!</li>
             </ol>

             <h4>👥 Сценарий 2: Групповые конференции (Teams-like)</h4>
             <ol>
               <li>Откройте <strong>4 вкладки</strong> с этой страницей</li>
               <li><strong>Вкладка 1:</strong> Выберите "Учитель Иван" → Создайте комнату "Урок математики"</li>
               <li><strong>Вкладка 2:</strong> Выберите "Студент Петр" → Введите код комнаты</li>
               <li><strong>Вкладка 3:</strong> Выберите "Студент Мария" → Введите код комнаты</li>
               <li><strong>Вкладка 4:</strong> Выберите "Студент Алиса" → Введите код комнаты</li>
               <li><strong>Результат:</strong></li>
               <ul>
                 <li>🏫 <strong>Учитель</strong> видит всех студентов в сетке 2x2</li>
                 <li>📚 <strong>Студенты</strong> видят учителя крупно + других студентов справа (PiP)</li>
                 <li>🎥 Все видят себя в маленьком окне справа внизу</li>
               </ul>
             </ol>

             <h4>➕ Сценарий 3: Приглашение участников</h4>
             <ol>
               <li>Создайте комнату как учитель</li>
               <li>В секции "➕ Пригласить участников" выберите студентов</li>
               <li>Другие вкладки получат уведомления о приглашении</li>
               <li>Примите/отклоните приглашения</li>
               <li>Учитель получит уведомления о статусе приглашений</li>
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

    /* Групповые конференции */
    .action-section {
      margin: 15px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #f9f9f9;
    }

    .group-section {
      border-color: #3498db;
      background: #ecf0f1;
    }

    .action-section h4 {
      margin: 0 0 15px 0;
      color: #2c3e50;
      font-size: 16px;
    }

    .room-input {
      padding: 8px 12px;
      border: 1px solid #bdc3c7;
      border-radius: 4px;
      margin-right: 10px;
      width: 250px;
      font-size: 14px;
    }

    .action-btn.conference {
      background: #3498db;
    }

    .action-btn.small {
      padding: 5px 10px;
      font-size: 12px;
      margin-left: 10px;
    }

    .active-room, .joined-room {
      background: #d5f4e6;
      padding: 10px;
      border-radius: 5px;
      margin: 10px 0;
      border-left: 4px solid #27ae60;
    }

    .available-rooms {
      margin-top: 15px;
    }

    .room-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
      margin: 5px 0;
    }

    .room-creation, .room-join {
      margin-bottom: 15px;
    }

    /* Управление участниками */
    .participants-management {
      margin: 15px 0;
      padding: 10px;
      background: #f8f9fa;
      border-radius: 5px;
    }

    .participants-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 10px 0;
    }

    .participant-tag {
      display: inline-flex;
      align-items: center;
      background: #007bff;
      color: white;
      padding: 4px 8px;
      border-radius: 15px;
      font-size: 12px;
      gap: 5px;
    }

    .remove-participant-btn {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      padding: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      font-size: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .remove-participant-btn:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .invite-section {
      margin-top: 15px;
    }

    .available-users {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 8px;
    }

    .invite-user-btn {
      background: #28a745;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      transition: background 0.2s;
    }

    .invite-user-btn:hover:not(:disabled) {
      background: #218838;
    }

    .invite-user-btn:disabled {
      background: #6c757d;
      cursor: not-allowed;
    }

    .room-actions {
      display: flex;
      gap: 10px;
      margin-top: 15px;
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

  // Групповые конференции
  newRoomName: string = '';
  roomCodeToJoin: string = '';
  currentGroupRoom: GroupRoom | null = null;
  groupRoomActive: boolean = false;
  groupParticipants: string[] = [];
  availableRooms: AvailableRoom[] = [];

  // Список всех доступных пользователей
  private allUsers = [
    { id: 'teacher1', name: 'Учитель Иван', icon: '👨‍🏫' },
    { id: 'student1', name: 'Студент Петр', icon: '👨‍🎓' },
    { id: 'student2', name: 'Студент Мария', icon: '👩‍🎓' },
    { id: 'student3', name: 'Студент Алиса', icon: '👩‍🎓' },
    { id: 'student4', name: 'Студент Никита', icon: '👨‍🎓' }
  ];

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

    // Обработчики для групповых конференций
    this.wsService.listen('room_created').subscribe((data: any) => {
      console.log('🏫 Создана новая комната:', data.room);
      this.updateAvailableRooms();
    });

    this.wsService.listen('room_joined').subscribe((data: any) => {
      console.log('✅ Успешно присоединились к комнате:', data.room);
      this.currentGroupRoom = data.room;
      this.groupRoomActive = true;
      this.groupParticipants = data.room.participants;
      
      // Переключаемся на групповой канал Agora
      this.videoCallService.channelName = `group_${data.room.id}`;
      console.log(`🎥 Автоматически запускаем видео для ${this.currentUserName}...`);
      
      // Если уже в видео канале - выходим сначала, потом подключаемся к новому
      if (this.videoCallService.callActive) {
        this.videoCallService.leaveChannel().then(() => {
          this.startVideoCall(); // Автоматически подключаемся к видео
        });
      } else {
        this.startVideoCall(); // Автоматически подключаемся к видео
      }
      
      this.roomCodeToJoin = '';
      alert(`✅ Присоединились к комнате: ${data.room.name}`);
    });

    this.wsService.listen('room_join_failed').subscribe((data: any) => {
      console.log('❌ Не удалось присоединиться к комнате:', data.reason);
      alert(`❌ Не удалось присоединиться к комнате: ${data.reason}`);
    });

    this.wsService.listen('room_participant_joined').subscribe((data: any) => {
      console.log('👤 Новый участник присоединился:', data.participant);
      if (this.currentGroupRoom) {
        this.groupParticipants.push(data.participant);
        console.log(`👥 В комнате теперь ${this.groupParticipants.length} участников`);
      }
    });

    this.wsService.listen('room_participant_left').subscribe((data: any) => {
      console.log('👤 Участник покинул комнату:', data.participant);
      if (this.currentGroupRoom) {
        this.groupParticipants = this.groupParticipants.filter(p => p !== data.participant);
        console.log(`👥 В комнате осталось ${this.groupParticipants.length} участников`);
      }
    });

    this.wsService.listen('room_closed').subscribe((data: any) => {
      console.log('🔴 Комната была закрыта:', data.roomId);
      if (this.currentGroupRoom && this.currentGroupRoom.id === data.roomId) {
        this.currentGroupRoom = null;
        this.groupRoomActive = false;
        this.groupParticipants = [];
        alert('🔴 Комната была закрыта организатором');
      }
      this.updateAvailableRooms();
    });

    this.wsService.listen('available_rooms').subscribe((data: any) => {
      console.log('📋 Получен список доступных комнат:', data.rooms);
      this.availableRooms = data.rooms;
    });

    // Обработчики приглашений
    this.wsService.listen('room_invitation').subscribe((data: any) => {
      console.log('📧 Получено приглашение в комнату:', data);
      const accept = confirm(`📧 ${data.inviterName} приглашает вас в групповую конференцию "${data.roomName}"\n\nПринять приглашение?`);
      
      if (accept) {
        this.roomCodeToJoin = data.roomId;
        this.joinGroupRoom();
      } else {
        // Уведомляем о отклонении приглашения
        this.wsService.sendMessage('invitation_declined', {
          roomId: data.roomId,
          inviterUserId: data.inviterUserId,
          declinedUserId: this.currentUser
        });
      }
    });

    this.wsService.listen('invitation_accepted').subscribe((data: any) => {
      console.log('✅ Приглашение принято:', data);
      alert(`✅ ${this.getParticipantName(data.acceptedUserId)} принял приглашение!`);
    });

    this.wsService.listen('invitation_declined').subscribe((data: any) => {
      console.log('❌ Приглашение отклонено:', data);
      alert(`❌ ${this.getParticipantName(data.declinedUserId)} отклонил приглашение`);
    });

    this.wsService.listen('removed_from_room').subscribe((data: any) => {
      console.log('🚫 Вас исключили из комнаты:', data);
      if (this.currentGroupRoom && this.currentGroupRoom.id === data.roomId) {
        this.currentGroupRoom = null;
        this.groupRoomActive = false;
        this.groupParticipants = [];
        alert('🚫 Вас исключили из групповой конференции');
      }
    });

    // Запрашиваем список доступных комнат
    setTimeout(() => {
      this.updateAvailableRooms();
    }, 1000);
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

  // Методы для групповых конференций
  createGroupRoom() {
    if (!this.newRoomName.trim()) {
      alert('❌ Введите название комнаты');
      return;
    }

    const roomId = this.generateRoomId();
    const room: GroupRoom = {
      id: roomId,
      name: this.newRoomName.trim(),
      creator: this.currentUser,
      participants: [this.currentUser],
      maxParticipants: 10,
      createdAt: new Date()
    };

    this.currentGroupRoom = room;
    this.groupRoomActive = true;
    this.groupParticipants = [this.currentUser];
    
    // Меняем канал Agora на групповой
    this.videoCallService.channelName = `group_${roomId}`;
    
    // Уведомляем через WebSocket о создании комнаты
    this.wsService.sendMessage('room_created', {
      room: room,
      creator: this.currentUser
    });

    console.log(`🏫 Создана групповая комната: ${room.name} (${roomId})`);
    console.log(`🎥 Автоматически запускаем видео для преподавателя...`);
    
    // Автоматически подключаемся к видео при создании комнаты
    this.startVideoCall();
    
    alert(`✅ Комната создана!\nНазвание: ${room.name}\nКод: ${roomId}`);
    
    this.newRoomName = '';
  }

  joinGroupRoom() {
    if (!this.roomCodeToJoin.trim()) {
      alert('❌ Введите код комнаты');
      return;
    }

    // Запрашиваем информацию о комнате через WebSocket
    this.wsService.sendMessage('join_room_request', {
      roomId: this.roomCodeToJoin.trim(),
      userId: this.currentUser,
      userName: this.currentUserName
    });

    console.log(`🚪 Попытка присоединения к комнате: ${this.roomCodeToJoin}`);
  }

  quickJoinRoom(roomId: string) {
    this.roomCodeToJoin = roomId;
    this.joinGroupRoom();
  }

  leaveGroupRoom() {
    if (!this.currentGroupRoom) return;

    // Уведомляем о выходе из комнаты
    this.wsService.sendMessage('leave_room', {
      roomId: this.currentGroupRoom.id,
      userId: this.currentUser
    });

    this.currentGroupRoom = null;
    this.groupRoomActive = false;
    this.groupParticipants = [];
    
    // Возвращаем обычный канал
    this.videoCallService.channelName = 'test_channel_123';
    
    console.log('🚪 Покинули групповую комнату');
  }

  closeGroupRoom() {
    if (!this.currentGroupRoom) return;

    // Уведомляем всех участников о закрытии комнаты
    this.wsService.sendMessage('room_closed', {
      roomId: this.currentGroupRoom.id,
      creator: this.currentUser
    });

    this.currentGroupRoom = null;
    this.groupRoomActive = false;
    this.groupParticipants = [];
    
    console.log('🔴 Групповая комната закрыта');
    alert('🔴 Комната закрыта');
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  private updateAvailableRooms() {
    this.wsService.sendMessage('get_available_rooms', {});
  }

  // Методы для управления участниками
  getParticipantName(userId: string): string {
    const user = this.allUsers.find(u => u.id === userId);
    return user ? user.name : userId;
  }

  getAvailableUsersToInvite() {
    return this.allUsers.filter(user => 
      user.id !== this.currentUser && 
      !this.groupParticipants.includes(user.id)
    );
  }

  inviteUserToRoom(userId: string) {
    if (!this.currentGroupRoom) return;

    console.log(`📧 Приглашаем пользователя ${userId} в комнату ${this.currentGroupRoom.id}`);
    
    // Отправляем приглашение через WebSocket
    this.wsService.sendMessage('invite_to_room', {
      roomId: this.currentGroupRoom.id,
      invitedUserId: userId,
      inviterUserId: this.currentUser,
      inviterName: this.currentUserName,
      roomName: this.currentGroupRoom.name
    });

    alert(`📧 Приглашение отправлено пользователю ${this.getParticipantName(userId)}`);
  }

  removeParticipant(userId: string) {
    if (!this.currentGroupRoom) return;

    const confirm = window.confirm(`Исключить ${this.getParticipantName(userId)} из комнаты?`);
    if (!confirm) return;

    console.log(`🚫 Исключаем участника ${userId} из комнаты ${this.currentGroupRoom.id}`);

    // Отправляем команду исключения через WebSocket
    this.wsService.sendMessage('remove_from_room', {
      roomId: this.currentGroupRoom.id,
      removedUserId: userId,
      removerUserId: this.currentUser
    });
  }

  copyRoomInfo() {
    if (!this.currentGroupRoom) return;

    const roomInfo = `Присоединяйтесь к групповой конференции!\n\nНазвание: ${this.currentGroupRoom.name}\nКод комнаты: ${this.currentGroupRoom.id}\n\nСсылка: http://${this.currentIP}:4200/test-video`;
    
    navigator.clipboard.writeText(roomInfo).then(() => {
      alert('📋 Информация о комнате скопирована в буфер обмена!');
    }).catch(() => {
      alert(`📋 Скопируйте информацию вручную:\n\n${roomInfo}`);
    });
  }
}
