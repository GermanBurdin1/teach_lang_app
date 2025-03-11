import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import AgoraRTC, { IAgoraRTCClient, ILocalTrack, IRemoteVideoTrack, IRemoteAudioTrack, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';

@Injectable({
  providedIn: 'root'
})
export class VideoCallService {
  public showVideoCallSubject = new BehaviorSubject<boolean>(false);
  public isFloatingVideoSubject = new BehaviorSubject<boolean>(false);
  private _videoSize = { width: 640, height: 360 };
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
  controlTimeout: any;

  constructor() {
    console.log('⚡ VideoCallService создан');
  }

  startVideoCall(): void {
    console.log('🎥 Запуск видеозвонка');

    this.showVideoCallSubject.next(true);
    console.log('✅ showVideoCall$ изменён:', this.showVideoCallSubject.getValue());

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


  async joinChannel(): Promise<void> {
    try {
        console.log("🎥 Создаем аудио- и видеотреки...");
        this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();

        console.log("✅ Видеотрек создан:", this.localTracks.videoTrack);

        // ⬇️ Если токен пустой, передаем null
        const tokenToUse = this.token.trim() ? this.token : null;
        console.log(`🔑 Используем токен: ${tokenToUse || 'null'}`);

        await this.agoraClient.join(this.appId, this.channelName, tokenToUse);
        console.log("✅ Подключились к каналу");

        await this.agoraClient.publish(Object.values(this.localTracks).filter(track => track !== null) as ILocalTrack[]);
        console.log("📡 Поток опубликован");

        this.callActive = true;
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

}
