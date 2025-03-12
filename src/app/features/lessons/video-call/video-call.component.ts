import { Component, OnInit, ViewChild, ElementRef, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { VideoCallService } from '../../../services/video-call.service';
import { WebSocketService } from '../../../services/web-socket.service';

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @Input() isFloatingMode: boolean = false;
  remoteUserIds: string[] = [];

  constructor(public videoCallService: VideoCallService, private wsService: WebSocketService) { }

  ngOnInit(): void {
    console.log('📹 VideoCallComponent загружен в ngOnInit', { isFloatingMode: this.isFloatingMode });
    console.log("🎥 video-call.component.ts → ngOnInit() сработал!");
    console.log(`🎥 video-call.component.ts → Создан ${new Date().toISOString()}`);
    this.videoCallService.joinChannel().then(() => {
      if (this.videoCallService.localTracks.videoTrack) {
        this.videoCallService.localTracks.videoTrack.play(this.localVideo.nativeElement);
      }
    });

    this.videoCallService.agoraClient.on('user-published', (user) => {
      this.remoteUserIds.push(user.uid.toString());
    });

    this.videoCallService.agoraClient.on('user-unpublished', (user) => {
      this.remoteUserIds = this.remoteUserIds.filter(uid => uid !== user.uid.toString());
    });

    this.wsService.listen('call_invite').subscribe((data: any) => {
      console.log(`📞 Входящий вызов от ${data.from}`);

      const acceptCall = confirm(`📞 Входящий вызов от ${data.from}. Принять?`);
      if (acceptCall) {
        this.videoCallService.acceptCall(data.from);
      } else {
        this.videoCallService.rejectCall(data.from);
      }
    });

    this.wsService.listen('call_reject').subscribe((data: any) => {
      console.log(`📵 Пользователь ${data.from} отклонил вызов.`);
      alert(`📵 Пользователь ${data.from} отклонил вызов.`);
    });

    this.wsService.listen('call_accept').subscribe((data: any) => {
      console.log(`✅ Пользователь ${data.from} принял вызов.`);
      this.videoCallService.startVideoCall();
    });
  }

  ngAfterViewInit(): void {
    console.log("📹 VideoCallComponent загружен!");

    // Проверяем, есть ли localVideo
    if (!this.localVideo || !this.localVideo.nativeElement) {
      console.warn("⚠ localVideo отсутствует! Ожидание 500ms...");
      setTimeout(() => this.initLocalVideo(), 500);
      return;
    }

    this.initLocalVideo();
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

    if (!this.localVideo || !this.localVideo.nativeElement) {
      console.error("❌ localVideo НЕ найден после ожидания!");
      return;
    }

    console.log("✅ Видеотрек найден, отображаем локальное видео!");
    this.videoCallService.localTracks.videoTrack.play(this.localVideo.nativeElement);

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

}
