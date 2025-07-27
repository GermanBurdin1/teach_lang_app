import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  constructor() {}

  getToken(channelName: string): Promise<string> {
    return Promise.resolve('mock-token-12345');
  }
}
