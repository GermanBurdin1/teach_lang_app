import { Component, OnDestroy, OnInit } from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-lesson-material',
  templateUrl: './lesson-material.component.html',
  styleUrls: ['./lesson-material.component.css'],
})
export class LessonMaterialComponent implements OnInit, OnDestroy {
  backgroundStyle: string = '';
  private backgroundSubscription: Subscription | undefined;

  constructor(private backgroundService: BackgroundService) {}

  listIcons: string[] = [
    'icon-empty', // Заглушка для первой иконки
    'icon-empty', // Заглушка для второй иконки
    'icon-empty', // Заглушка для третьей иконки
    'fas fa-chalkboard', // Заполненная иконка
  ];

  trackByIndex(index: number, item: string): number {
    return index;
  }


  ngOnInit(): void {
    // Подписываемся на изменения фона
    this.backgroundSubscription = this.backgroundService.background$.subscribe(
      (newBackground) => {
        this.backgroundStyle = newBackground;
      }
    );
  }

  ngOnDestroy(): void {
    // Отписываемся при уничтожении компонента
    if (this.backgroundSubscription) {
      this.backgroundSubscription.unsubscribe();
    }
  }

  // стилизация
  highlight: string | null = null;

  highlightCard(card: string) {
    this.highlight = card;
  }

  resetCard(card: string) {
    if (this.highlight === card) {
      this.highlight = null;
    }
  }

  //
  showLanguageModal: boolean = false; // Отображение модального окна
  selectedLanguage: string = ''; // Выбранный язык

  // Открыть модалку
  openLanguageModal(): void {
    this.showLanguageModal = true;
  }

  // Закрыть модалку
  closeLanguageModal(): void {
    this.showLanguageModal = false;
  }

  languages = [
    { label: 'English', value: 'en', icon: 'fas fa-flag-usa' },
    { label: 'French', value: 'fr', icon: 'fas fa-flag-france' },
    { label: 'German', value: 'de', icon: 'fas fa-flag-germany' },
    { label: 'Spanish', value: 'es', icon: 'fas fa-flag-spain' },
    { label: 'Italian', value: 'it', icon: 'fas fa-flag-italy' },
    { label: 'Polish', value: 'pl', icon: 'fas fa-flag-poland' },
    { label: 'Russian', value: 'ru', icon: 'fas fa-flag-russia' },
    { label: 'Portuguese', value: 'pt', icon: 'fas fa-flag-portugal' },
    { label: 'Dutch', value: 'nl', icon: 'fas fa-flag-netherlands' },
    { label: 'Swedish', value: 'sv', icon: 'fas fa-flag-sweden' },
  ];

  saveLanguage(): void {
    console.log('Выбранный язык:', this.selectedLanguage);

    // Обновляем массив иконок
    this.listIcons = [
        'fas fa-comment-alt', // Chat icon
        'fas fa-language', // Translate icon
        'fas fa-clock', // Timer icon
        'fas fa-chalkboard', // Board icon
    ];

    console.log('Updated icons:', this.listIcons);

    // Закрываем модалку
    this.closeLanguageModal();
}


}
