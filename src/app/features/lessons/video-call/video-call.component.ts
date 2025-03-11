import { Component, OnInit, ViewChild, ElementRef, Input, AfterViewInit } from '@angular/core';
import { VideoCallService } from '../../../services/video-call.service';

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @Input() isFloatingMode: boolean = false; // Флаг плавающего режима

  constructor(public videoCallService: VideoCallService) { }

  ngOnInit(): void {
    console.log('📹 VideoCallComponent загружен', { isFloatingMode: this.isFloatingMode });
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

}
