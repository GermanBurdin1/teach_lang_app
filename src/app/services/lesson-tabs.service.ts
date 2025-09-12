import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LessonTabsService {
  private activeTabSource = new BehaviorSubject<'cards' | 'lesson' | 'homework'>('cards'); // Активная вкладка
  private tabsVisibleSource = new BehaviorSubject<boolean>(false); // Видимость вкладок
  private contentViewSource = new BehaviorSubject<'default' | 'lessonView' | 'homeworkView'>('default'); // Отображение контента
  private rightPanelVisibleSource = new BehaviorSubject<boolean>(false);
  private lessonStartedSource = new BehaviorSubject<boolean>(false);
  public lessonDescriptionSource = new BehaviorSubject<{ lesson: string; course: string }>({
    lesson: 'Lesson 1',
    course: 'Course 1',
  }); // Название урока и курса
  private currentLessonIdSource = new BehaviorSubject<string>('1');

  activeTab$ = this.activeTabSource.asObservable();
  tabsVisible$ = this.tabsVisibleSource.asObservable();
  contentView$ = this.contentViewSource.asObservable();
  rightPanelVisible$ = this.rightPanelVisibleSource.asObservable();
  lessonDescription$ = this.lessonDescriptionSource.asObservable();
  lessonStarted$ = this.lessonStartedSource.asObservable();
  currentLessonId$ = this.currentLessonIdSource.asObservable();

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

  setRightPanelVisible(isVisible: boolean): void {
    this.rightPanelVisibleSource.next(isVisible);
    console.log('Right panel visibility:', isVisible);
  }

  setLessonDescription(description: { lesson: string; course: string }): void {
    this.lessonDescriptionSource.next(description);
  }

  setLessonStarted(started: boolean): void {
    this.lessonStartedSource.next(started);
  }

  setCurrentLessonId(id: string): void {
    console.log(`📌 Устанавливаем ID урока: ${id}`);
    this.currentLessonIdSource.next(id);
  }

  getCurrentLessonId(): string {
    return this.currentLessonIdSource.value;
  }

  //для lesson-material.component.ts
  private currentLessonDataSource = new BehaviorSubject<unknown | null>(null);
  currentLessonData$ = this.currentLessonDataSource.asObservable();

  setCurrentLessonData(data: unknown): void {
    console.log('📚 Установлен урок:', data);
    this.currentLessonDataSource.next(data);
  }

  getCurrentLessonData(): unknown | null {
    return this.currentLessonDataSource.value;
  }

}
