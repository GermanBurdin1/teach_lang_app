import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
// import { WebSocketService } from './web-socket.service';
import { HomeworkService } from './homework.service';

// Динамический импорт AgoraRTC для избежания глобальной инициализации
type AgoraRTCType = typeof import('agora-rtc-sdk-ng').default;
type IAgoraRTCClient = import('agora-rtc-sdk-ng').IAgoraRTCClient;
type ILocalVideoTrack = import('agora-rtc-sdk-ng').ILocalVideoTrack;
type ILocalAudioTrack = import('agora-rtc-sdk-ng').ILocalAudioTrack;
type IRemoteVideoTrack = import('agora-rtc-sdk-ng').IRemoteVideoTrack;
type IRemoteAudioTrack = import('agora-rtc-sdk-ng').IRemoteAudioTrack;


@Injectable()
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

  agoraClient: IAgoraRTCClient | null = null;
  localTracks: { videoTrack: ILocalVideoTrack | null, audioTrack: ILocalAudioTrack | null } = { videoTrack: null, audioTrack: null };
  private agoraWarningsDisabled = false;
  private agoraRTC: AgoraRTCType | null = null;
  private agoraLoadingPromise: Promise<AgoraRTCType> | null = null;

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
    console.log('⚡ VideoCallService создан (без AgoraRTC инициализации)');
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
      // Отключаем AgoraRTC предупреждения только при первом использовании
      if (!this.agoraWarningsDisabled) {
        this.disableAllAgoraWarnings();
        this.agoraWarningsDisabled = true;
      }

      // Динамически загружаем AgoraRTC только при необходимости
      if (!this.agoraRTC) {
        if (!this.agoraLoadingPromise) {
          console.log('📦 Загружаем AgoraRTC SDK...');
          this.agoraLoadingPromise = import('agora-rtc-sdk-ng').then(module => module.default);
        }
        this.agoraRTC = await this.agoraLoadingPromise;
        console.log('✅ AgoraRTC SDK загружен');
      }

      // Создаем AgoraRTC клиент только при необходимости
      if (!this.agoraClient) {
        console.log('🚀 Создаем AgoraRTC клиент...');
        this.agoraClient = this.agoraRTC!.createClient({ mode: 'rtc', codec: 'vp8' });
      }

      // Проверяем поддержку системы перед началом
      const systemSupport = await this.checkSystemSupport();
      if (!systemSupport) {
        throw new Error('Система не поддерживает AgoraRTC');
      }

      console.log('🔌 Начинаем подключение к Agora канала:', {
        appId: this.appId,
        channelName: this.channelName,
        userId: this.userId,
        token: this.token || 'без токена'
      });

      // Создаем локальные треки с обработкой ошибок
      console.log('📹 Создаем локальные треки...');
      try {
        this.localTracks.audioTrack = await this.agoraRTC!.createMicrophoneAudioTrack();
        this.localTracks.videoTrack = await this.agoraRTC!.createCameraVideoTrack();
        console.log('✅ Локальные треки созданы');
      } catch (trackError: any) {
        console.error('❌ Ошибка создания треков:', trackError);
        if (trackError.code === 'WEB_SECURITY_RESTRICT') {
          throw new Error('Ограничения веб-безопасности: используйте HTTPS или localhost');
        }
        throw trackError;
      }

      // Присоединяемся к каналу
      console.log('🚪 Присоединяемся к каналу...');
      const uid = await this.agoraClient!.join(this.appId, this.channelName, this.token, this.userId);
      console.log('✅ Присоединились к каналу с UID:', uid);
      
      // Публикуем треки
      console.log('📡 Публикуем треки...');
      await this.agoraClient!.publish([this.localTracks.audioTrack, this.localTracks.videoTrack]);
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
    if (this.localTracks.audioTrack) {
      this.localTracks.audioTrack.close();
      this.localTracks.audioTrack = null;
    }
    if (this.localTracks.videoTrack) {
      this.localTracks.videoTrack.close();
      this.localTracks.videoTrack = null;
    }
    
    if (this.agoraClient) {
      await this.agoraClient.leave();
    }
    this.callActive = false;
    console.log('❌ Отключен от канала Agora');
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

  private disableAllAgoraWarnings(): void {
    // Переопределяем console.warn для фильтрации всех AgoraRTC предупреждений
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalLog = console.log;
    const originalInfo = console.info;
    
    // Функция для проверки AgoraRTC сообщений
    const isAgoraMessage = (message: string): boolean => {
      return message.includes('AgoraRTC') || 
             message.includes('WEB_SECURITY_RESTRICT') || 
             message.includes('web security') ||
             message.includes('https protocol') ||
             message.includes('enumerateDevices') ||
             message.includes('localhost') ||
             message.includes('NOT_SUPPORTED') ||
             message.includes('AgoraRTCError') ||
             message.includes('Agora-SDK');
    };
    
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      if (isAgoraMessage(message)) {
        return;
      }
      originalWarn.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (isAgoraMessage(message)) {
        return;
      }
      originalError.apply(console, args);
    };

    console.log = (...args: any[]) => {
      const message = args.join(' ');
      if (isAgoraMessage(message)) {
        return;
      }
      originalLog.apply(console, args);
    };

    console.info = (...args: any[]) => {
      const message = args.join(' ');
      if (isAgoraMessage(message)) {
        return;
      }
      originalInfo.apply(console, args);
    };
  }

  async checkSystemSupport(): Promise<boolean> {
    try {
      if (!this.agoraRTC) {
        console.error('❌ AgoraRTC не загружен');
        return false;
      }
      const systemSupport = this.agoraRTC.checkSystemRequirements();
      console.log('✅ Поддержка системы AgoraRTC:', systemSupport);
      return systemSupport;
    } catch (error) {
      console.error('❌ Ошибка проверки системы AgoraRTC:', error);
      return false;
    }
  }

  async startScreenSharing(): Promise<void> {
    try {
      if (!this.agoraRTC) {
        throw new Error('AgoraRTC не загружен');
      }
      const screenTrack = await this.agoraRTC.createScreenVideoTrack({}, 'auto');
      if (this.agoraClient) {
        await this.agoraClient.unpublish(this.localTracks.videoTrack!);
        await this.agoraClient.publish(screenTrack);
      }
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
