import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LessonTabsService {
  private activeTabSource = new BehaviorSubject<'cards' | 'lesson' | 'homework'>('cards'); // Активная вкладка
  private tabsVisibleSource = new BehaviorSubject<boolean>(false); // Видимость вкладок
  private contentViewSource = new BehaviorSubject<'default' | 'lessonView'>('default'); // Отображение контента

  activeTab$ = this.activeTabSource.asObservable();
  tabsVisible$ = this.tabsVisibleSource.asObservable();
  contentView$ = this.contentViewSource.asObservable();

  setActiveTab(tab: 'cards' | 'lesson' | 'homework'): void {
    this.activeTabSource.next(tab);
  }

  setTabsVisible(isVisible: boolean): void {
    this.tabsVisibleSource.next(isVisible);
  }

  setContentView(view: 'default' | 'lessonView'): void {
    this.contentViewSource.next(view);
    console.log('Setting content view to:', view);
  }

  get contentView(): 'default' | 'lessonView' {
    return this.contentViewSource.value;
  }
}

