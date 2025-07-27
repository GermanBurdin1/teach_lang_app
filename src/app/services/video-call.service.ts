import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
// import AgoraRTC, { IAgoraRTCClient, ILocalTrack, IRemoteVideoTrack, IRemoteAudioTrack, ILocalVideoTrack, ILocalAudioTrack } from 'agora-rtc-sdk-ng';
// import { WebSocketService } from './web-socket.service';
import { HomeworkService } from './homework.service';

// TODO : implémenter la fonctionnalité d'appel vidéo complète
@Injectable({
  providedIn: 'root'
})
export class VideoCallService {
  public showVideoCallSubject = new BehaviorSubject<boolean>(false);
  public isFloatingVideoSubject = new BehaviorSubject<boolean>(false);
  private _videoSize = { width: 640, height: 360 };
  
  // on ajoute des champs pour suivre le cours
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
  controlTimeout: any; // on déclare la propriété rtmClient
  userId!: string; // on ajoute userId, s'il n'existe pas

  // constructor(private wsService: WebSocketService, private homeworkService: HomeworkService) {
  constructor(private homeworkService: HomeworkService) {
    console.log('[VideoCallService] Service créé');
  }

  // nouvelle méthode pour définir les données de la leçon
  setLessonData(lessonId: string, userId: string) {
    this.currentLessonId = lessonId;
    this.currentUserId = userId;
    console.log(`📚 Leçon définie: lessonId=${lessonId}, userId=${userId}`);
  }

  startVideoCall(): void {
    console.log('🎥 Démarrage de l\'appel vidéo');

    this.showVideoCallSubject.next(true);
    console.log('✅ showVideoCall$ modifié:', this.showVideoCallSubject.getValue());

    // this.joinChannel().then(() => {
    //   console.log('✅ Connexion réussie au canal!');
      
    //   // On ne démarre pas automatiquement le cours lors de la connexion au canal
    //   // Le cours ne démarrera que lorsqu'une vidéo est réellement démarrée
    //   console.log('📝 Le cours n\'a pas été démarré automatiquement - on attend le démarrage réel de la vidéo');
    // }).catch(error => {
    //   console.error('❌ Erreur lors de la connexion au canal:', error);
    // });
  }

  stopVideoCall(): void {
    console.log('🔴 Arrêt de l\'appel vidéo');

    this.showVideoCallSubject.next(false);
    this.isFloatingVideoSubject.next(false);

    console.log('✅ showVideoCall$:', this.showVideoCallSubject.getValue());
    console.log('✅ isFloatingVideo$:', this.isFloatingVideoSubject.getValue());
  }

  toggleFloatingVideo(state: boolean): void {
    console.log(`🟡 toggleFloatingVideo(${state}) appelé`);
    console.log(`🧐 Avant changement: isFloatingVideo =`, this.isFloatingVideoSubject.getValue());

    // if (!this.showVideoCallSubject.getValue()) {
    //     console.log('⚠ La vidéo n\'est pas démarrée, le vidéo flottant n\'est pas créé');
    //     return;
    // }

    this.isFloatingVideoSubject.next(state);
    console.log(`🎥 toggleFloatingVideo appelé avec l'état: ${state}`);
  }

  // ...
  // Tous les méthodes liées à AgoraRTC et WebSocketService sont commentées ci-dessous
  // ...
}
