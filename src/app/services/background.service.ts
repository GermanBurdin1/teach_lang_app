import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BackgroundService {
  private backgroundSubject = new BehaviorSubject<string>(''); // Изначально пустой фон
  background$ = this.backgroundSubject.asObservable(); // Экспортируем как Observable

  setBackground(imageUrl: string): void {
    const backgroundStyle = `url(${imageUrl})`;
    this.backgroundSubject.next(backgroundStyle); // Уведомляем подписчиков об изменении
  }

  getBackground(): string {
    return this.backgroundSubject.getValue(); // Возвращаем текущее значение
  }
}
