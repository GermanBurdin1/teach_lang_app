import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { VideoCallService } from '../../../services/video-call.service';
import { WebSocketService } from '../../../services/web-socket.service';
import { AuthService } from '../../../services/auth.service';

interface CallData {
  from: string;
  to: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('localVideoPip') localVideoPip!: ElementRef<HTMLVideoElement>;
  @Input() isFloatingMode: boolean = false;
  remoteUserIds: string[] = [];

  // PiP позиция и перетаскивание
  pipPosition = { x: 20, y: 20 };
  isDragging = false;
  dragOffset = { x: 0, y: 0 };

  constructor(public videoCallService: VideoCallService, private wsService: WebSocketService, public authService: AuthService) { }

  ngOnInit(): void {
    console.log('📹 VideoCallComponent загружен в ngOnInit', { isFloatingMode: this.isFloatingMode });
    console.log("🎥 video-call.component.ts → ngOnInit() сработал!");
    console.log(`🎥 video-call.component.ts → Создан ${new Date().toISOString()}`);
    
    // Проверяем HTTPS для AgoraRTC
    this.checkHTTPSRequirement();
    
    // Регистрируем пользователя в WebSocket
    if (this.videoCallService.userId) {
      this.wsService.registerUser(this.videoCallService.userId);
    }
    
    this.videoCallService.joinChannel().then(() => {
      if (this.videoCallService.localTracks.videoTrack) {
        this.videoCallService.localTracks.videoTrack.play(this.localVideo.nativeElement);
      }
    }).catch((error) => {
      console.error('❌ Ошибка подключения к видеозвонку:', error);
      this.handleVideoCallError(error);
    });

    this.videoCallService.agoraClient?.on('user-published', async (user, mediaType) => {
      console.log('🎯 ПОЛУЧЕН user-published:', {
        uid: user.uid,
        mediaType: mediaType,
        currentChannel: this.videoCallService.channelName,
        currentUser: this.videoCallService.userId
      });
      
      try {
        // Подписываемся на удаленного пользователя
        if (this.videoCallService.agoraClient) {
          await this.videoCallService.agoraClient.subscribe(user, mediaType);
        }
        console.log('✅ Подписались на пользователя:', user.uid, mediaType);
        
        if (mediaType === 'video') {
          if (!this.remoteUserIds.includes(user.uid.toString())) {
            this.remoteUserIds.push(user.uid.toString());
            console.log('📝 Добавлен удаленный пользователь. Список:', this.remoteUserIds);
            
            // Перезапускаем локальное видео для переключения в PiP режим
            setTimeout(() => {
              this.initLocalVideo();
            }, 300);
          }
          
          // Воспроизводим видео на всех необходимых элементах
          setTimeout(() => {
            const remoteVideoTrack = user.videoTrack;
            
            console.log('🎥 Попытка воспроизвести удаленное видео:', {
              uid: user.uid,
              hasTrack: !!remoteVideoTrack,
              isTeacher: this.isTeacher(),
              isTeacherUID: this.isTeacherUID(user.uid.toString())
            });
            
            if (remoteVideoTrack) {
              // Основное видео - воспроизводим на всех элементах с соответствующим ID
              const mainVideoElements = document.querySelectorAll(`#remote-video-${user.uid}`) as NodeListOf<HTMLVideoElement>;
              mainVideoElements.forEach((element, index) => {
                if (element) {
                  remoteVideoTrack.play(element);
                  console.log(`✅ Основное видео запущено для ${user.uid} (элемент ${index + 1})`);
                }
              });

              // Для студентов: PiP видео других студентов
              if (!this.isTeacher() && !this.isTeacherUID(user.uid.toString())) {
                const pipVideoElement = document.getElementById(`student-pip-${user.uid}`) as HTMLVideoElement;
                if (pipVideoElement) {
                  remoteVideoTrack.play(pipVideoElement);
                  console.log('✅ PiP видео запущено для студента:', user.uid);
                }
              }
            }
          }, 200);
        }
        
        if (mediaType === 'audio') {
          user.audioTrack?.play();
          console.log('🔊 Аудио запущено для пользователя:', user.uid);
        }
      } catch (error) {
        console.error('❌ Ошибка при подписке на пользователя:', error);
      }
    });

    this.videoCallService.agoraClient?.on('user-unpublished', (user, mediaType) => {
      console.log('👤 Пользователь отключил:', user.uid, mediaType);
      if (mediaType === 'video') {
        this.remoteUserIds = this.remoteUserIds.filter(uid => uid !== user.uid.toString());
        console.log('📝 Удален удаленный пользователь. Список:', this.remoteUserIds);
        
        // Перезапускаем локальное видео для переключения в главный режим
        setTimeout(() => {
          this.initLocalVideo();
        }, 300);
      }
    });

    // WebSocket обработчики для входящих звонков
    this.wsService.listen('call_invite').subscribe((data: CallData) => {
      console.log(`📞 Входящий вызов от ${data.from}`);
      const acceptCall = window.confirm(`📞 Входящий вызов от ${data.from}. Принять?`);
      if (acceptCall) {
        this.wsService.acceptCall(data.from, data.to);
        this.videoCallService.joinChannel();
      } else {
        this.wsService.rejectCall(data.from, data.to);
      }
    });

    this.wsService.listen('call_accept').subscribe((data: CallData) => {
      console.log(`✅ Пользователь ${data.from} принял вызов`);
      this.videoCallService.joinChannel();
    });

    this.wsService.listen('call_reject').subscribe((data: CallData) => {
      console.log(`❌ Пользователь ${data.from} отклонил вызов`);
      window.alert(`Пользователь отклонил вызов`);
    });
  }

  ngAfterViewInit(): void {
    console.log("📹 VideoCallComponent загружен!");
    
    // Ждем немного и пытаемся инициализировать локальное видео
    setTimeout(() => {
      this.initLocalVideo();
    }, 500);
    
    console.log("🎥 video-call.component.ts → ngAfterViewInit() сработал!");
  }

  ngOnDestroy() {
    console.log("❌ video-call.component.ts → Компонент уничтожен!");
  }


  private initLocalVideo(): void {
    if (!this.videoCallService.localTracks.videoTrack) {
      console.warn("⚠ Видеотрек отсутствует, повторный запрос через 500ms...");
      setTimeout(() => this.initLocalVideo(), 500);
      return;
    }

    console.log("✅ Видеотрек найден, отображаем локальное видео!");
    console.log("🔍 Состояние элементов:", {
      hasLocalVideo: !!(this.localVideo && this.localVideo.nativeElement),
      hasLocalVideoPip: !!(this.localVideoPip && this.localVideoPip.nativeElement),
      remoteUsersCount: this.remoteUserIds.length,
      isTeacher: this.isTeacher()
    });
    
    if (this.isTeacher()) {
      // ПРЕПОДАВАТЕЛЬ: Только в сетке, НЕ в PiP (как в Teams)
      if (this.localVideo && this.localVideo.nativeElement) {
        this.videoCallService.localTracks.videoTrack.play(this.localVideo.nativeElement);
        console.log("✅ Преподаватель: локальное видео в сетке (без PiP)");
      }
      
      // Преподаватель НЕ показывается в PiP - он всегда в сетке
    } else {
      // СТУДЕНТ: В главном окне если один, в PiP если есть другие
      if (this.remoteUserIds.length === 0) {
        // Студент один - показываем в главном окне
        if (this.localVideo && this.localVideo.nativeElement) {
          this.videoCallService.localTracks.videoTrack.play(this.localVideo.nativeElement);
          console.log("✅ Студент: локальное видео в главном окне (один)");
        }
      } else {
        // Есть другие участники - показываем в PiP
        if (this.localVideoPip && this.localVideoPip.nativeElement) {
          this.videoCallService.localTracks.videoTrack.play(this.localVideoPip.nativeElement);
          console.log("✅ Студент: локальное видео в PiP");
        }
      }
    }
  }

  get videoWidth(): number {
    return this.videoCallService.videoWidth;
  }

  get videoHeight(): number {
    return this.videoCallService.videoHeight;
  }

  showVideoControls(): void {
    this.videoCallService.showControls = true;
    clearTimeout(this.videoCallService.controlTimeout);
    this.videoCallService.controlTimeout = setTimeout(() => {
      this.videoCallService.showControls = false;
    }, 3000);
  }

  hideVideoControls(): void {
    this.videoCallService.controlTimeout = setTimeout(() => {
      this.videoCallService.showControls = false;
    }, 3000);
  }

  get showControls(): boolean {
    return this.videoCallService.showControls;
  }

  get callActive(): boolean {
    return this.videoCallService.callActive;
  }

  toggleCall(): void {
    this.videoCallService.toggleCall();
  }

  // Метод для инициации звонка конкретному пользователю
  initiateCall(targetUserId: string): void {
    const currentUserId = this.videoCallService.userId;
    if (currentUserId) {
      console.log(`📞 Инициируем звонок от ${currentUserId} к ${targetUserId}`);
      this.wsService.initiateCall(targetUserId, currentUserId);
    } else {
      console.error('❌ Текущий пользователь не установлен');
    }
  }

  startResize(event: MouseEvent): void {
    event.preventDefault();

    console.log("🔄 Начало изменения размера видео");

    const startX = event.clientX;
    const startY = event.clientY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      this.videoCallService.resizeVideo(deltaX, deltaY);
    };

    const onMouseUp = () => {
      console.log("✅ Завершение изменения размера видео");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  //screensharing
  isScreenSharing = false;

  async toggleScreenSharing() {
    // Проверяем поддержку устройства перед началом трансляции
    const isSupported = await this.videoCallService.checkSystemSupport();
    if (!isSupported) {
      alert("Ваш браузер не поддерживает трансляцию экрана!");
      return;
    }

    if (this.isScreenSharing) {
      await this.videoCallService.stopScreenSharing();
    } else {
      await this.videoCallService.startScreenSharing();
      this.videoCallService.startTrackMonitoring(); // Начинаем мониторинг трека
    }

    this.isScreenSharing = !this.isScreenSharing;
  }

  startVideoDrag(event: MouseEvent) {
    event.preventDefault();

    const elem = ((event.currentTarget as HTMLElement).closest('.video-call-container')) as HTMLElement;
    if (!elem) return;

    const startX = event.clientX;
    const startY = event.clientY;
    const startLeft = elem.offsetLeft;
    const startTop = elem.offsetTop;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newLeft = startLeft + deltaX;
      let newTop = startTop + deltaY;

      // Ограничения по ширине и высоте окна
      const videoWidth = elem.offsetWidth;
      const videoHeight = elem.offsetHeight;
      const maxLeft = window.innerWidth - videoWidth;
      const maxTop = window.innerHeight - videoHeight;

      // 🔒 Ограничиваем перемещение
      newLeft = Math.max(0, Math.min(newLeft, maxLeft));
      newTop = Math.max(0, Math.min(newTop, maxTop));

      elem.style.left = `${newLeft}px`;
      elem.style.top = `${newTop}px`;
    };


    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  // === TEAMS-LIKE UX МЕТОДЫ ===

  isTeacher(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?.currentRole === 'teacher';
  }

  isTeacherUID(uid: string): boolean {
    const currentUser = this.authService.getCurrentUser();
    return uid === currentUser?.id && currentUser?.currentRole === 'teacher';
  }

  getGridLayout(): string {
    const count = this.remoteUserIds.length;
    return Math.min(count, 9).toString();
  }

  getTeacherGridLayout(): string {
    // Учитель + студенты (локальное видео учителя всегда добавляется)
    const totalCount = this.remoteUserIds.length + 1;
    return Math.min(totalCount, 9).toString();
  }

  getTeacherUID(): string | null {
    return this.remoteUserIds.find(uid => this.isTeacherUID(uid)) || null;
  }

  getParticipantDisplayName(uid: string): string {
    const userMap: {[key: string]: string} = {
      'teacher1': 'Учитель Иван',
      'student1': 'Студент Петр',
      'student2': 'Студент Мария',
      'student3': 'Студент Алиса',
      'student4': 'Студент Никита'
    };
    return userMap[uid] || uid;
  }

  getTeacherName(): string {
    const teacherUID = this.remoteUserIds.find(uid => this.isTeacherUID(uid));
    return teacherUID ? this.getParticipantDisplayName(teacherUID) : 'Преподаватель';
  }

  getOtherStudents(): string[] {
    return this.remoteUserIds.filter(uid => !this.isTeacherUID(uid));
  }

  trackByStudentId(index: number, studentId: string): string {
    return studentId;
  }

  private checkHTTPSRequirement(): void {
    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (isSecure) {
      console.log('✅ Безопасное соединение для AgoraRTC:', window.location.protocol);
    }
    // Убрали предупреждения для HTTP режима разработки
  }

  private handleVideoCallError(error: any): void {
    console.error('❌ Детальная ошибка видеозвонка:', error);
    
    if (error.code === 'WEB_SECURITY_RESTRICT') {
      console.error('🔒 Ошибка безопасности веб-браузера');
      console.error('💡 Решение: Используйте HTTPS или localhost');
    } else if (error.code === 'NOT_SUPPORTED') {
      console.error('🚫 Функция не поддерживается браузером');
      console.error('💡 Решение: Обновите браузер или используйте другой браузер');
    } else {
      console.error('🔍 Неизвестная ошибка:', error.message);
    }
  }

  // Методы для перетаскивания PiP
  startDrag(event: MouseEvent): void {
    if (event.target instanceof HTMLElement && event.target.classList.contains('drag-handle')) {
      event.preventDefault();
      this.isDragging = true;
      this.dragOffset = {
        x: event.clientX - this.pipPosition.x,
        y: event.clientY - this.pipPosition.y
      };
      
      document.addEventListener('mousemove', this.onDrag);
      document.addEventListener('mouseup', this.stopDrag);
    }
  }

  onDrag = (event: MouseEvent): void => {
    if (this.isDragging) {
      const container = document.querySelector('app-lesson-material');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const pipWidth = 200;
        const pipHeight = 150;
        
        let newX = event.clientX - this.dragOffset.x;
        let newY = event.clientY - this.dragOffset.y;
        
        // Ограничиваем перемещение в рамках контейнера
        newX = Math.max(0, Math.min(newX, containerRect.width - pipWidth));
        newY = Math.max(0, Math.min(newY, containerRect.height - pipHeight));
        
        this.pipPosition = { x: newX, y: newY };
      }
    }
  }

  stopDrag = (): void => {
    this.isDragging = false;
    document.removeEventListener('mousemove', this.onDrag);
    document.removeEventListener('mouseup', this.stopDrag);
  }
}
