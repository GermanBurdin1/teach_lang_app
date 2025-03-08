import { Component, OnInit, ViewChild, ElementRef, Output, EventEmitter } from '@angular/core';
import AgoraRTC, { IAgoraRTCClient, ILocalTrack, IRemoteVideoTrack, IRemoteAudioTrack, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
import { TokenService } from '../../../services/token.service';

@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.scss']
})
export class VideoCallComponent implements OnInit {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;

  agoraClient: IAgoraRTCClient = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
  localTracks: {
    videoTrack: ILocalVideoTrack | null,
    audioTrack: ILocalAudioTrack | null
  } = {
    videoTrack: null,
    audioTrack: null
  };

  remoteUsers: { [uid: string]: { videoTrack: IRemoteVideoTrack | null, audioTrack: IRemoteAudioTrack | null } } = {};
  appId = 'a020b374553e4fac80325223fba38531'; // Используйте свой App ID
  channelName = 'rtc_token';
  token = '';
  remoteVideos: ElementRef<HTMLVideoElement>[] = [];
  callActive: boolean = false;

  @Output() callStarted = new EventEmitter<void>();
  @Output() callEnded = new EventEmitter<void>();

  constructor(private tokenService: TokenService) {}

  ngOnInit(): void {
    console.log('📹 VideoCallComponent загружен');
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    console.log('✅ Камера работает:', stream);
  })
  .catch(error => {
    console.error('❌ Ошибка при доступе к камере:', error);
  });
}



  // Функции вызываемые извне, чтобы начать и завершить звонок
  public async startCall(): Promise<void> {
    try {
      console.log('🔵 startCall() вызван');

      this.token = await this.tokenService.getToken(this.channelName);
      console.log('🔵 Получен токен:', this.token);

      await this.joinChannel();
      console.log('✅ Успешно подключился к каналу');

      this.callStarted.emit();
      this.callActive = true;
    } catch (error) {
      console.error('❌ Ошибка при старте звонка:', error);
    }
  }

  public async toggleCall(): Promise<void> {
    if (this.callActive) {
      await this.endCall();
    } else {
      await this.startCall();
    }
  }

  public async endCall(): Promise<void> {
    try {
      console.log('🔴 Завершаем звонок...');

      this.localTracks.videoTrack?.stop();
      this.localTracks.videoTrack?.close();
      this.localTracks.audioTrack?.stop();
      this.localTracks.audioTrack?.close();

      this.agoraClient.remoteUsers.forEach(user => {
        this.agoraClient.unsubscribe(user);
      });

      await this.agoraClient.leave();
      console.log('✅ Клиент покинул канал');

      this.callEnded.emit();
      this.callActive = false; // Очищаем флаг после завершения звонка

      // Очищаем видеоэлементы
      if (this.localVideo.nativeElement) {
        this.localVideo.nativeElement.srcObject = null;
      }
      document.querySelectorAll('video[id^="video_"]').forEach(video => video.remove());

    } catch (error) {
      console.error('❌ Ошибка при завершении звонка:', error);
    }
  }

  // Присоединение к каналу
  private async joinChannel(): Promise<void> {
    try {
        if (!this.token) {
            throw new Error('❌ Token is not available for joining channel.');
        }

        console.log('🔵 Начинаем подключение к каналу:', this.channelName);

        this.localTracks.audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        console.log('🎙️ Аудиотрек успешно создан.');

        this.localTracks.videoTrack = await AgoraRTC.createCameraVideoTrack();
        console.log('📹 Видеотрек успешно создан:', this.localTracks.videoTrack);

        if (this.localVideo.nativeElement) {
            console.log('🎥 Воспроизведение локального видео начато.');
            this.localTracks.videoTrack.play(this.localVideo.nativeElement);
        }

        console.log('🔵 Присоединяюсь к каналу Agora:', this.channelName);
        await this.agoraClient.join(this.appId, this.channelName, this.token);
        console.log('✅ Успешно подключился к каналу.');

        console.log('📡 Публикую видеопоток...');
        await this.agoraClient.publish(Object.values(this.localTracks).filter(track => track !== null) as ILocalTrack[]);
        console.log('✅ Видеопоток опубликован.');

        this.agoraClient.on('user-published', async (user, mediaType) => {
            console.log(`👤 Пользователь ${user.uid} опубликовал медиа: ${mediaType}`);
            await this.agoraClient.subscribe(user, mediaType);
            console.log(`✅ Подписка на ${mediaType} пользователя ${user.uid} успешна.`);

            if (mediaType === 'video' && user.videoTrack) {
                console.log(`📹 Видеотрек получен от пользователя ${user.uid}, воспроизведение...`);
                const remoteVideoTrack = user.videoTrack;

                const videoElement = document.createElement('video');
                videoElement.id = `video_${user.uid}`;
                document.body.appendChild(videoElement);
                remoteVideoTrack.play(videoElement);

                this.remoteVideos.push(new ElementRef(videoElement));
            }

            if (mediaType === 'audio' && user.audioTrack) {
                console.log(`🔊 Аудиотрек получен от пользователя ${user.uid}, воспроизведение...`);
                user.audioTrack.play();
            }
        });

        this.agoraClient.on('user-unpublished', (user) => {
            console.log(`🚫 Пользователь ${user.uid} прекратил публикацию.`);
            const index = this.remoteVideos.findIndex(x => x.nativeElement.id === `video_${user.uid}`);
            if (index !== -1) {
                console.log(`🗑️ Удаляем видео элемент пользователя ${user.uid}`);
                this.remoteVideos[index].nativeElement.remove();
                this.remoteVideos.splice(index, 1);
            }
        });

    } catch (error) {
        console.error('❌ Ошибка при присоединении к каналу:', error);
    }
}


  // Завершение вызова
  private async leaveChannel(): Promise<void> {
    this.localTracks.videoTrack?.close();
    this.localTracks.audioTrack?.close();

    this.agoraClient.remoteUsers.forEach((user) => {
      this.agoraClient.unsubscribe(user);
    });
    await this.agoraClient.leave();

    console.log('Client leaves channel');
  }
}
