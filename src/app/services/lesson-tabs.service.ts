import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LessonTabsService {
  private activeTabSource = new BehaviorSubject<'cards' | 'lesson' | 'homework'>('cards'); // Активная вкладка
  private tabsVisibleSource = new BehaviorSubject<boolean>(false); // Видимость вкладок
  private contentViewSource = new BehaviorSubject<'default' | 'lessonView' | 'homeworkView'>('default'); // Отображение контента

  activeTab$ = this.activeTabSource.asObservable();
  tabsVisible$ = this.tabsVisibleSource.asObservable();
  contentView$ = this.contentViewSource.asObservable();

  setActiveTab(tab: 'cards' | 'lesson' | 'homework'): void {
    this.activeTabSource.next(tab);

    // Автоматически переключаем contentView в зависимости от activeTab
    if (tab === 'lesson') {
      this.setContentView('lessonView');
    } else if (tab === 'homework') {
      this.setContentView('homeworkView');
    } else {
      this.setContentView('default');
    }
  }

  setTabsVisible(isVisible: boolean): void {
    this.tabsVisibleSource.next(isVisible);
  }

  setContentView(view: 'default' | 'lessonView' | 'homeworkView'): void {
    this.contentViewSource.next(view);
    console.log('Setting content view to:', view);
  }

  get contentView(): 'default' | 'lessonView' | 'homeworkView' {
    return this.contentViewSource.value;
  }
}
