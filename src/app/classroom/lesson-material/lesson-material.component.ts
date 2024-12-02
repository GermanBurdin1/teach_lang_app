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

  ngOnInit(): void {
    // Подписываемся на изменения фона
    this.backgroundSubscription = this.backgroundService.background$.subscribe(
      (newBackground) => {
        this.backgroundStyle = newBackground;
      }
    );

    this.listIcons = ['icon iconedv-Board page-section-left-items_board'];
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

  //левая часть страницы
  listIcons: string[] = ['icon iconedv-Board page-section-left-items_board']; // Изначально одна иконка

  saveLanguage(): void {
    console.log('Выбранный язык:', this.selectedLanguage);

    // Обновляем список иконок
    this.listIcons = [
      'tir-badge iconedv-Chat',
      'iconedv-Translate',
      'icon-timer iconedv-Timer',
      'icon iconedv-Board page-section-left-items_board'
    ];

    // Закрываем модалку
    this.closeLanguageModal();
  }



}
