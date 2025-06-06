import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class HomeworkService {
  private homework$ = new BehaviorSubject<string[]>([
    '📚 Lire un article sur l’IA',
    '📚 Résumer une vidéo TED'
  ]);

  getHomeworkStream() {
    return this.homework$.asObservable();
  }

  addHomework(item: string) {
    const current = this.homework$.getValue();
    if (!current.includes(item)) {
      this.homework$.next([...current, item]);
    }
  }

  reset() {
    this.homework$.next([]);
  }
}
