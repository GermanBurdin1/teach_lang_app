import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import AgoraRTC, { IAgoraRTCClient, ILocalTrack as _ILocalTrack, IRemoteVideoTrack, IRemoteAudioTrack, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
// import { WebSocketService } from './web-socket.service';
import { HomeworkService } from './homework.service';


@Injectable({
  providedIn: 'root'
})
export class VideoCallService {
  public showVideoCallSubject = new BehaviorSubject<boolean>(false);
  public isFloatingVideoSubject = new BehaviorSubject<boolean>(false);
  private _videoSize = { width: 640, height: 360 };
  
  // Добавляем поля для отслеживания урока
  private currentLessonId: string | null = null;
  private currentUserId: string | null = null;
  
  get videoWidth() {
    return this._videoSize.width;
  }
  get videoHeight() {
    return this._videoSize.height;
  }

  showVideoCall$ = this.showVideoCallSubject.asObservable();
  isFloatingVideo$ = this.isFloatingVideoSubject.asObservable();

  floatingVideoPosition = { x: window.innerWidth - 320, y: 20 };
  dragging = false;
  offsetX = 0;
  offsetY = 0;

  agoraClient: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  localTracks: { videoTrack: ILocalVideoTrack | null, audioTrack: ILocalAudioTrack | null } = { videoTrack: null, audioTrack: null };

  remoteUsers: { [uid: string]: { videoTrack: IRemoteVideoTrack | null, audioTrack: IRemoteAudioTrack | null } } = {};
  appId = 'a020b374553e4fac80325223fba38531'; // Замените на ваш App ID
  channelName = 'test_channel_123'; // Простое имя канала
  token = null; // null для тестового режима
  callActive: boolean = false;
  showControls = false;
  controlTimeout: any; // Объявляем свойство rtmClient
  userId!: string; // Добавляем userId, если его нет


  // constructor(private wsService: WebSocketService, private homeworkService: HomeworkService) {
  constructor(private homeworkService: HomeworkService) {
    console.log('⚡ VideoCallService создан');
    // this.setupEventListeners();
  }

  // Новый метод для установки данных урока
  setLessonData(lessonId: string, userId: string) {
    this.currentLessonId = lessonId;
    this.currentUserId = userId;
    this.userId = userId;
    console.log(`📚 Урок установлен: lessonId=${lessonId}, userId=${userId}`);
    
    // Регистрируем пользователя в WebSocket если он установлен
    // this.registerUserInWebSocket(userId);
  }

  // private registerUserInWebSocket(userId: string) {
  //   // Метод будет реализован когда подключим WebSocketService
  //   console.log(`🔌 Регистрация пользователя ${userId} в WebSocket`);
  // }

  async joinChannel(): Promise<void> {
    try {
      console.log('🔌 Начинаем подключение к Agora канала:', {
        appId: this.appId,
        channelName: this.channelName,
        userId: this.userId,
        token: this.token || 'без токена'
      });

      // Создаем локальные треки
      console.log('📹 Создаем локальные треки...');
      this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
      console.log('✅ Локальные треки созданы');

      // Присоединяемся к каналу
      console.log('🚪 Присоединяемся к каналу...');
      const uid = await this.agoraClient.join(this.appId, this.channelName, this.token, this.userId);
      console.log('✅ Присоединились к каналу с UID:', uid);
      
      // Публикуем треки
      console.log('📡 Публикуем треки...');
      await this.agoraClient.publish([this.localTracks.audioTrack, this.localTracks.videoTrack]);
      console.log('✅ Треки опубликованы');
      
      this.callActive = true;
      console.log('🎉 Успешно подключен к каналу Agora:', {
        channelName: this.channelName,
        userId: this.userId,
        uid: uid
      });
    } catch (error) {
      console.error('❌ Ошибка подключения к Agora:', error);
      console.error('🔍 Детали ошибки:', {
        name: (error as any)?.name,
        message: (error as any)?.message,
        code: (error as any)?.code
      });
    }
  }

  async leaveChannel(): Promise<void> {
    console.log('🔴 Начинаем отключение от канала...');
    
    if (this.localTracks.audioTrack) {
      console.log('🔇 Закрываем аудио трек...');
      this.localTracks.audioTrack.close();
      this.localTracks.audioTrack = null;
    }
    if (this.localTracks.videoTrack) {
      console.log('📹 Закрываем видео трек...');
      this.localTracks.videoTrack.close();
      this.localTracks.videoTrack = null;
    }
    
    console.log('🚪 Отключаемся от Agora канала...');
    await this.agoraClient.leave();
    this.callActive = false;
    
    // Принудительная очистка всех медиа-потоков в браузере
    try {
      console.log('🔧 Принудительная очистка медиа-потоков...');
      
      // Получаем все видео и аудио элементы
      const videoElements = document.querySelectorAll('video');
      const audioElements = document.querySelectorAll('audio');
      
      // Останавливаем все медиа-потоки
      const allElements = [...Array.from(videoElements), ...Array.from(audioElements)];
      allElements.forEach(element => {
        if (element.srcObject) {
          const stream = element.srcObject as MediaStream;
          stream.getTracks().forEach(track => {
            console.log('🔇 Останавливаем трек:', track.kind, track.label);
            track.stop();
          });
          element.srcObject = null;
        }
        element.pause();
      });
      
      // Очищаем локальные треки еще раз
      this.localTracks.audioTrack = null;
      this.localTracks.videoTrack = null;
      
      console.log('✅ Принудительная очистка завершена');
    } catch (error) {
      console.error('❌ Ошибка при принудительной очистке:', error);
    }
    
    console.log('✅ Отключен от канала Agora - камера освобождена');
  }

  toggleCall(): void {
    if (this.callActive) {
      this.leaveChannel();
    } else {
      this.joinChannel();
    }
  }

  resizeVideo(deltaX: number, deltaY: number): void {
    this._videoSize.width = Math.max(200, this._videoSize.width + deltaX);
    this._videoSize.height = Math.max(150, this._videoSize.height + deltaY);
  }

  async checkSystemSupport(): Promise<boolean> {
    try {
      // Проверяем HTTPS или localhost
      const isSecure = window.location.protocol === 'https:' || 
                      window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        console.warn('⚠️ AgoraRTC требует HTTPS или localhost для работы');
        console.warn('🔧 Текущий протокол:', window.location.protocol);
        console.warn('🌐 Текущий хост:', window.location.hostname);
      }

      const systemSupport = AgoraRTC.checkSystemRequirements();
      console.log('✅ Поддержка системы AgoraRTC:', systemSupport);
      
      return systemSupport;
    } catch (error) {
      console.error('❌ Ошибка проверки системы AgoraRTC:', error);
      return false;
    }
  }

  async startScreenSharing(): Promise<void> {
    try {
      const screenTrack = await AgoraRTC.createScreenVideoTrack({}, 'auto');
      await this.agoraClient.unpublish(this.localTracks.videoTrack!);
      await this.agoraClient.publish(screenTrack);
      console.log('🖥️ Демонстрация экрана начата');
    } catch (error) {
      console.error('❌ Ошибка демонстрации экрана:', error);
    }
  }

  async stopScreenSharing(): Promise<void> {
    console.log('🖥️ Демонстрация экрана остановлена');
  }

  startTrackMonitoring(): void {
    // Мониторинг треков
  }

  acceptCall(from: string): void {
    console.log(`✅ Принят вызов от ${from}`);
  }

  rejectCall(from: string): void {
    console.log(`❌ Отклонен вызов от ${from}`);
  }

  startVideoCall(): void {
    console.log('🎥 Запуск видеозвонка');
    console.log('📍 Текущее состояние:', {
      channelName: this.channelName,
      userId: this.userId,
      callActive: this.callActive,
      showVideoCall: this.showVideoCallSubject.getValue()
    });

    this.showVideoCallSubject.next(true);
    console.log('✅ showVideoCall$ изменён:', this.showVideoCallSubject.getValue());

    // Автоматически подключаемся к Agora каналу
    this.joinChannel().then(() => {
      console.log('✅ Успешно подключились к каналу!');
    }).catch(error => {
      console.error('❌ Ошибка при подключении к каналу:', error);
    });
  }

  stopVideoCall(): void {
    console.log('🔴 Завершение видеозвонка');

    // Сначала отключаемся от канала и останавливаем медиа-потоки
    this.leaveChannel().then(() => {
      console.log('✅ Успешно отключились от канала и остановили медиа-потоки');
    }).catch(error => {
      console.error('❌ Ошибка при отключении от канала:', error);
    });

    // Затем скрываем UI
    this.showVideoCallSubject.next(false);
    this.isFloatingVideoSubject.next(false);

    console.log('✅ showVideoCall$:', this.showVideoCallSubject.getValue());
    console.log('✅ isFloatingVideo$:', this.isFloatingVideoSubject.getValue());
  }

  toggleFloatingVideo(state: boolean): void {
    console.log(`🟡 toggleFloatingVideo(${state}) вызван`);
    console.log(`🧐 До изменения: isFloatingVideo =`, this.isFloatingVideoSubject.getValue());

    // if (!this.showVideoCallSubject.getValue()) {
    //     console.log('⚠ Видео не запущено, плавающее видео не создаём');
    //     return;
    // }

    this.isFloatingVideoSubject.next(state);
    console.log(`🎥 toggleFloatingVideo вызван с состоянием: ${state}`);
  }

  // ...
  // Все методы, связанные с AgoraRTC и WebSocketService, закомментированы ниже
  // ...
}
