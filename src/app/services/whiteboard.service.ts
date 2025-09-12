import { Injectable } from '@angular/core';
import { WhiteWebSdk, Room, JoinRoomParams, RoomPhase as _RoomPhase } from 'white-web-sdk';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../../environment';


@Injectable({
  providedIn: 'root',
})
export class WhiteboardService {
  private sdk: WhiteWebSdk;
  private room?: Room;
  private roomUuid: string = '';
  private apiUrl = 'http://localhost:3000/whiteboard/create-room';
  private roomSubject = new BehaviorSubject<Room | null>(null);
  room$ = this.roomSubject.asObservable(); // Доступ к observable

  constructor(private http: HttpClient) {
    this.sdk = new WhiteWebSdk({
      appIdentifier: 'tmuA4P_vEe-XRGk9GboPXw/t7oX_QbCKG52Pw',
      region: 'eu',
    });
  }

  /** Получает roomUuid и roomToken с бэкенда */
  async createRoomAndJoin(userId: string, container: HTMLDivElement): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ roomUuid: string; roomToken: string }>(this.apiUrl, {})
      );

      if (!response || !response.roomUuid || !response.roomToken) {
        throw new Error('❌ Ошибка: roomUuid или roomToken отсутствует!');
      }

      if (!environment.production) {
        console.log('✅ Получен roomUuid:', response.roomUuid);
        console.log('✅ Получен roomToken:', response.roomToken);
      }

      // Подключаемся к комнате
      await this.joinRoom(response.roomUuid, response.roomToken, userId, container);
    } catch (error) {
      if (!environment.production) {
        console.error('❌ Ошибка при создании комнаты и подключении:', error);
      }
    }
  }

  /** Подключается к Whiteboard */
  async joinRoom(uuid: string, roomToken: string, userId: string, container: HTMLDivElement): Promise<void> {
    this.roomUuid = uuid;

    if (!roomToken) {
      if (!environment.production) {
        console.error('❌ Ошибка: Room Token отсутствует!');
      }
      return;
    }

    if (!environment.production) {
      console.log("📌 Используемый токен:", roomToken);
    }

    const roomParams: JoinRoomParams = {
      uuid,
      roomToken,
      uid: userId,
      isWritable: true,
    };

    try {
      this.room = await this.sdk.joinRoom(roomParams);
      this.roomSubject.next(this.room);
      if (!environment.production) {
        console.log('✅ Подключено к Whiteboard');
        console.log("🔍 Writable:", this.room?.isWritable);
        console.log(this.room);
      }

      // 🔹 Привязываем доску к контейнеру
      if (!environment.production) {
        console.log("📌 Привязываем whiteboard...");
      }
      await this.bindWhiteboardToContainer(container);
      if (!environment.production) {
        console.log("✅ Whiteboard привязан!");
      }

    } catch (error) {
      if (!environment.production) {
        console.error('❌ Ошибка при подключении к доске:', error);
      }
    }
  }

  /** 🔹 Функция привязки whiteboard к контейнеру */
  private async bindWhiteboardToContainer(container: HTMLDivElement): Promise<void> {
    if (!this.room) {
      if (!environment.production) {
        console.error("❌ Ошибка: Комната (room) не определена, невозможно привязать контейнер!");
      }
      return;
    }

    try {
      await this.room.bindHtmlElement(container);
      if (!environment.production) {
        console.log("🎨 Холст успешно привязан к контейнеру!");
      }
    } catch (error) {
      if (!environment.production) {
        console.error("❌ Ошибка при привязке холста:", error);
      }
    }
  }

  /** Получает текущую комнату */
  getRoom(): Room | undefined {
    return this.room;
  }

}
