import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  //private socket: Socket;

  constructor() {
    //this.socket = io('http://localhost:3000'); // on se connecte au serveur NestJS
  }

  // sendMessage(event: string, data: any) {
  //   this.socket.emit(event, data);
  // }

  // listen(event: string): Observable<any> {
  //   return new Observable(observer => {
  //     this.socket.on(event, (data) => {
  //       observer.next(data);
  //     });
  //   });
  // }

  // registerUser(userId: string) {
  //   this.sendMessage('register', userId);
  // }
}
