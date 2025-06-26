import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import AgoraRTC, { IAgoraRTCClient, ILocalTrack, IRemoteVideoTrack, IRemoteAudioTrack, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import { WebSocketService } from './web-socket.service';
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
  appId = 'a020b374553e4fac80325223fba38531';
  channelName = 'rtc_token';
  token = '';
  callActive: boolean = false;
  showControls = false;
  controlTimeout: any; // Объявляем свойство rtmClient
  userId!: string; // Добавляем userId, если его нет


  constructor(private wsService: WebSocketService, private homeworkService: HomeworkService) {
    console.log('⚡ VideoCallService создан');
    this.setupEventListeners();
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

    this.joinChannel().then(() => {
      console.log('✅ Успешно подключились к каналу!');
      
      // Автоматически начинаем урок при успешном подключении к видео
      if (this.currentLessonId && this.currentUserId) {
        this.startLessonAutomatically();
      }
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


  async joinChannel(): Promise<void> {
    try {
      console.log("🎥 Создаем аудио- и видеотреки...");
      this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

      console.log("✅ Видеотрек создан:", this.localTracks.videoTrack);

      const tokenToUse = this.token.trim() ? this.token : null;
      console.log(`🔑 Используем токен: ${tokenToUse || 'null'}`);

      await this.agoraClient.join(this.appId, this.channelName, tokenToUse);
      console.log("✅ Подключились к каналу");

      await this.agoraClient.publish(Object.values(this.localTracks).filter(track => track !== null) as ILocalTrack[]);
      console.log("📡 Поток опубликован");

      this.callActive = true;
      // 📌 Добавляем подписку на новых пользователей
      this.agoraClient.on("user-published", async (user, mediaType) => {
        await this.agoraClient.subscribe(user, mediaType);
        console.log(`👤 Новый пользователь: ${user.uid}`);

        if (mediaType === "video") {
          this.remoteUsers[user.uid] = {
            videoTrack: user.videoTrack as IRemoteVideoTrack,
            audioTrack: user.audioTrack as IRemoteAudioTrack
          };
          user.videoTrack?.play(`remote-video-${user.uid}`);
        }

        if (mediaType === "audio") {
          user.audioTrack?.play();
        }
      });

      // 📌 Удаляем пользователей, если они отключаются
      this.agoraClient.on("user-unpublished", (user) => {
        console.log(`❌ Пользователь отключился: ${user.uid}`);
        delete this.remoteUsers[user.uid];
        const videoElement = document.getElementById(`remote-video-${user.uid}`);
        if (videoElement) {
          videoElement.remove();
        }
      });


    } catch (error) {
      console.error('❌ Ошибка подключения:', error);
    }
  }

  async leaveChannel(): Promise<void> {
    this.localTracks.videoTrack?.stop();
    this.localTracks.videoTrack?.close();
    this.localTracks.audioTrack?.stop();
    this.localTracks.audioTrack?.close();

    await this.agoraClient.leave();
    this.callActive = false;
    this.stopVideoCall();
  }

  // Функции изменения размера
  startResize(event: MouseEvent) {
    this.dragging = true;
    this.offsetX = event.clientX - this.floatingVideoPosition.x;
    this.offsetY = event.clientY - this.floatingVideoPosition.y;
  }

  resizeVideo(deltaX: number, deltaY: number): void {
    const aspectRatio = 9 / 16; // Соотношение сторон для портретного видео

    const minWidth = 320;
    const minHeight = minWidth * aspectRatio; // Минимальная высота
    const maxWidth = 1280;
    const maxHeight = maxWidth * aspectRatio; // Максимальная высота

    // Выбираем основное направление изменения размера (берем наибольшее)
    let sizeChange = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;

    // Вычисляем новую высоту и ширину
    let newWidth = Math.max(minWidth, Math.min(this._videoSize.width + sizeChange, maxWidth));
    let newHeight = newWidth * aspectRatio;

    // Проверяем границы по высоте
    if (newHeight < minHeight) {
      newHeight = minHeight;
      newWidth = newHeight / aspectRatio;
    } else if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight / aspectRatio;
    }

    // Применяем новые размеры
    this._videoSize.width = newWidth;
    this._videoSize.height = newHeight;

    console.log(`📏 Новый размер видео (ПОРТРЕТ): ${newWidth}x${newHeight}`);
  }


  onResize(event: MouseEvent): void {
    if (!this.dragging) return;
    const maxX = window.innerWidth - 320;
    const maxY = window.innerHeight - 180;

    this.floatingVideoPosition.x = Math.max(0, Math.min(event.clientX - this.offsetX, maxX));
    this.floatingVideoPosition.y = Math.max(0, Math.min(event.clientY - this.offsetY, maxY));
  }

  stopResize(): void {
    this.dragging = false;
  }

  showVideoControls(): void {
    this.showVideoCallSubject.next(true);
  }

  hideVideoControls(): void {
    this.showVideoCallSubject.next(false);
  }

  // Установка размера плавающего видео
  setFloatingVideoSize(width: number, height: number): void {
    this._videoSize.width = width;
    this._videoSize.height = height;
  }

  toggleCall(): void {
    this.callActive = !this.callActive;
  }

  cleanupVideoCall(): void {
    console.log('🧹 Очистка видеозвонка (без завершения звонка)');
  }

  resetVideoSize(): void {
    this._videoSize = { width: 640, height: 360 };
  }

  private isFloatingVideoActive = false;
  private isRegularVideoActive = false;

  // Устанавливаем состояние обычного видео
  setRegularVideoActive(active: boolean): void {
    this.isRegularVideoActive = active;
  }

  getRegularVideoActive(): boolean {
    return this.isRegularVideoActive;
  }

  // Устанавливаем состояние плавающего видео
  setFloatingVideoActive(active: boolean): void {
    this.isFloatingVideoActive = active;
  }

  getFloatingVideoActive(): boolean {
    return this.isFloatingVideoActive;
  }

  //screensharing

  private screenTrack: ILocalVideoTrack | null = null;
  private audioTrack: ILocalAudioTrack | null = null;

  async startScreenSharing() {
    try {
      if (this.screenTrack) {
        console.warn("🔴 Экран уже транслируется");
        return;
      }

      // 1️⃣ Создаём видеотрек экрана + аудиотрек
      const tracks = await AgoraRTC.createScreenVideoTrack(
        { encoderConfig: "1080p_1", screenSourceType: "screen" }, "enable"
      );

      if (Array.isArray(tracks)) {
        [this.screenTrack, this.audioTrack] = tracks;
      } else {
        this.screenTrack = tracks;
      }

      // 2️⃣ Публикуем видеотрек
      await this.agoraClient.publish(this.screenTrack);
      console.log("✅ Экран успешно транслируется");

      // 3️⃣ Публикуем аудиотрек, если он есть
      if (this.audioTrack) {
        await this.agoraClient.publish(this.audioTrack);
        console.log("🔊 Звук экрана транслируется");
      }

    } catch (error) {
      console.error("❌ Ошибка при захвате экрана:", error);
    }
  }

  async stopScreenSharing() {
    try {
      if (!this.screenTrack) {
        console.warn("⚠ Нет активной трансляции экрана");
        return;
      }

      // 1️⃣ Отписываем трек экрана
      await this.agoraClient.unpublish(this.screenTrack);
      this.screenTrack.stop();
      this.screenTrack.close();
      this.screenTrack = null;

      console.log("✅ Трансляция экрана остановлена");

      // 2️⃣ Отписываем аудиотрек, если он есть
      if (this.audioTrack) {
        await this.agoraClient.unpublish(this.audioTrack);
        this.audioTrack.stop();
        this.audioTrack.close();
        this.audioTrack = null;

        console.log("🔊 Звук экрана отключён");
      }
    } catch (error) {
      console.error("❌ Ошибка при остановке трансляции экрана:", error);
    }
  }

  // ✅ 1. Автоостановка экрана при смене камеры
  private setupEventListeners() {
    AgoraRTC.onCameraChanged = async () => {
      console.warn("📷 Камера была изменена, останавливаем трансляцию экрана...");
      await this.stopScreenSharing();
    };
  }

  // ✅ 2. Проверяем, не выключил ли пользователь экран вручную
  startTrackMonitoring() {
    setInterval(async () => {
      if (this.screenTrack && !this.screenTrack.isPlaying) {
        console.warn("🚫 Пользователь прекратил трансляцию экрана");
        await this.stopScreenSharing();
      }
    }, 3000);
  }

  // ✅ 3. Проверяем поддержку системы перед началом трансляции
  async checkSystemSupport(): Promise<boolean> {
    const isSupported = AgoraRTC.checkSystemRequirements();
    if (!isSupported) {
      console.error("❌ Ваше устройство не поддерживает трансляцию экрана");
      return false;
    }
    return true;
  }

  //функции принятия звонка
  inviteUserToCall(userId: string) {
    this.wsService.sendMessage('call_invite', {
      from: this.getCurrentUserId(),
      to: userId
    });
  }

  acceptCall(fromUserId: string) {
    this.wsService.sendMessage('call_accept', {
      from: this.getCurrentUserId(),
      to: fromUserId
    });
  }

  rejectCall(fromUserId: string) {
    this.wsService.sendMessage('call_reject', {
      from: this.getCurrentUserId(),
      to: fromUserId
    });
  }

  private getCurrentUserId(): string {
    return localStorage.getItem('userId') || 'unknown';
  }

  // Автоматическое начало урока при подключении к видео
  private startLessonAutomatically() {
    if (!this.currentLessonId || !this.currentUserId) {
      console.warn('⚠️ Нет данных урока для автоматического начала');
      return;
    }

    console.log(`🎬 Автоматическое начало урока: lessonId=${this.currentLessonId}, userId=${this.currentUserId}`);
    
    this.homeworkService.startLesson(this.currentLessonId, this.currentUserId).subscribe({
      next: (response) => {
        console.log('✅ Урок успешно начат:', response);
      },
      error: (error) => {
        console.error('❌ Ошибка при начале урока:', error);
      }
    });
  }

}
