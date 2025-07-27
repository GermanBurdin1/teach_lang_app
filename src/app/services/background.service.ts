import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BackgroundService {
  private backgroundSubject = new BehaviorSubject<string>(''); 
  background$ = this.backgroundSubject.asObservable(); 

  setBackground(imageUrl: string): void {
    const backgroundStyle = `url(${imageUrl})`;
    this.backgroundSubject.next(backgroundStyle); 
  }

  getBackground(): string {
    return this.backgroundSubject.getValue(); 
  }
}
