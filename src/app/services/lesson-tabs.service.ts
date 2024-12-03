import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LessonTabsService {
  private activeTabSource = new BehaviorSubject<'cards' | 'lesson' | 'homework'>('cards');
  private tabsVisibleSource = new BehaviorSubject<boolean>(false);

  activeTab$ = this.activeTabSource.asObservable();
  tabsVisible$ = this.tabsVisibleSource.asObservable();

  setActiveTab(tab: 'cards' | 'lesson' | 'homework'): void {
    this.activeTabSource.next(tab);
  }

  setTabsVisible(isVisible: boolean): void {
    this.tabsVisibleSource.next(isVisible);
  }
}
