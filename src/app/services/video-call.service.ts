import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import AgoraRTC, { IAgoraRTCClient, ILocalTrack, IRemoteVideoTrack, IRemoteAudioTrack, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
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
  channelName = 'rtc_token';
  token = ''; // Можно оставить пустым для тестирования
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
      // Создаем локальные треки
      this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

      // Присоединяемся к каналу
      await this.agoraClient.join(this.appId, this.channelName, this.token, this.userId);
      
      // Публикуем треки
      await this.agoraClient.publish([this.localTracks.audioTrack, this.localTracks.videoTrack]);
      
      this.callActive = true;
      console.log('✅ Подключен к каналу Agora');
    } catch (error) {
      console.error('❌ Ошибка подключения к Agora:', error);
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
    
    await this.agoraClient.leave();
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

  async checkSystemSupport(): Promise<boolean> {
    return AgoraRTC.checkSystemRequirements();
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

    this.showVideoCallSubject.next(true);
    console.log('✅ showVideoCall$ изменён:', this.showVideoCallSubject.getValue());

    // this.joinChannel().then(() => {
    //   console.log('✅ Успешно подключились к каналу!');
      
    //   // НЕ начинаем урок автоматически при подключении к каналу
    //   // Урок начнется только при реальном запуске видео
    //   console.log('📝 Урок НЕ начат автоматически - ждем реального запуска видео');
    // }).catch(error => {
    //   console.error('❌ Ошибка при подключении к каналу:', error);
    // });
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
