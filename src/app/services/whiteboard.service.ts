import { Injectable } from '@angular/core';
import { WhiteWebSdk, Room, JoinRoomParams, RoomPhase } from 'white-web-sdk';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

// TODO : ajouter sauvegarde automatique des dessins
@Injectable({
  providedIn: 'root',
})
export class WhiteboardService {
  private sdk: WhiteWebSdk;
  private room?: Room;
  private roomUuid: string = '';
  private apiUrl = 'http://localhost:3000/whiteboard/create-room';
  private roomSubject = new BehaviorSubject<Room | null>(null);
  room$ = this.roomSubject.asObservable(); // accès à l'observable

  constructor(private http: HttpClient) {
    this.sdk = new WhiteWebSdk({
      appIdentifier: 'tmuA4P_vEe-XRGk9GboPXw/t7oX_QbCKG52Pw',
      region: 'eu',
    });
  }

  /** Obtient roomUuid et roomToken depuis le backend */
  async createRoomAndJoin(userId: string, container: HTMLDivElement): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ roomUuid: string; roomToken: string }>(this.apiUrl, {})
      );

      if (!response || !response.roomUuid || !response.roomToken) {
        throw new Error('[WhiteboardService] Erreur: roomUuid ou roomToken manquant !');
      }

      console.log('[WhiteboardService] roomUuid reçu:', response.roomUuid);
      console.log('[WhiteboardService] roomToken reçu:', response.roomToken);

      // on se connecte à la salle
      await this.joinRoom(response.roomUuid, response.roomToken, userId, container);
    } catch (error) {
      console.error('[WhiteboardService] Erreur lors de la création de salle et connexion:', error);
    }
  }

  /** Se connecte au Whiteboard */
  async joinRoom(uuid: string, roomToken: string, userId: string, container: HTMLDivElement): Promise<void> {
    this.roomUuid = uuid;

    if (!roomToken) {
      console.error('[WhiteboardService] Erreur: roomToken manquant');
      return;
    }

    try {
      const joinRoomParams: JoinRoomParams = {
        uuid,
        roomToken,
        uid: userId,
        isWritable: true,
      };

      console.log('[WhiteboardService] Connexion à la salle avec les paramètres:', joinRoomParams);

      this.room = await this.sdk.joinRoom(joinRoomParams);
      
      console.log('[WhiteboardService] Connexion réussie à la salle !');

      this.room.bindHtmlElement(container);
      this.roomSubject.next(this.room); // on émet la salle via BehaviorSubject

    } catch (error) {
      console.error('[WhiteboardService] Erreur lors de la connexion à la salle:', error);
    }
  }

}
