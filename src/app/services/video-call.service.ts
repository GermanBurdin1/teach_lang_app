import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
// import AgoraRTC, { IAgoraRTCClient, ILocalTrack, IRemoteVideoTrack, IRemoteAudioTrack, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
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

  // agoraClient: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  // localTracks: { videoTrack: ILocalVideoTrack | null, audioTrack: ILocalAudioTrack | null } = { videoTrack: null, audioTrack: null };

  // remoteUsers: { [uid: string]: { videoTrack: IRemoteVideoTrack | null, audioTrack: IRemoteAudioTrack | null } } = {};
  // appId = 'a020b374553e4fac80325223fba38531';
  // channelName = 'rtc_token';
  // token = '';
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
    console.log(`📚 Урок установлен: lessonId=${lessonId}, userId=${userId}`);
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
