import { Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { Router } from '@angular/router';

interface WordCard {
  id?: number;
  word: string;
  translation: string;
  galaxy: string;
  subtopic: string;
  type?: 'word' | 'expression';
  createdAt?: number;
}


@Component({
  selector: 'app-words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.css']
})
export class WordsComponent {
  @ViewChildren('subtopicElement') subtopicElements!: QueryList<ElementRef>;
  @ViewChildren('galaxyElement') galaxyElements!: QueryList<ElementRef>;
  searchQuery: string = '';
  searchResults: any[] = [];
  zoomStyle = {};
  isZoomingToPlanet = false;
  isZoomingToGalaxy = false;
  focusedGalaxyIndex: number | null = null;

  galaxies = [
    {
      name: 'Кругозор',
      sanitizedName: 'Кругозор'.replace(/\s+/g, '-'), // Убираем пробелы для id
      subtopics: this.generateSubtopics(6, ['История', 'Наука', 'Искусство', 'Философия', 'Технологии', 'Культура'])
    },
    {
      name: 'Социальные связи',
      sanitizedName: 'Социальные-связи'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(5, ['Семья', 'Друзья', 'Работа', 'Социальные сети', 'Коммуникация'])
    },
    {
      name: 'Работа и карьера',
      sanitizedName: 'Работа-и-карьера'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(4, ['Вакансии', 'Навыки', 'Резюме', 'Собеседование'])
    },
    {
      name: 'Предметы',
      sanitizedName: 'Предметы'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(6, ['Мебель', 'Техника', 'Инструменты', 'Одежда', 'Украшения', 'Игрушки'])
    },
    {
      name: 'Медицина и здоровье',
      sanitizedName: 'Медицина-и-здоровье'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(5, ['Болезни', 'Лечение', 'Профилактика', 'Здоровый образ жизни', 'Аптеки'])
    },
    {
      name: 'Ситуации и события',
      sanitizedName: 'Ситуации-и-события'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(4, ['Праздники', 'Катастрофы', 'Спорт', 'Политика'])
    }
  ];
  zoomedGalaxy: any = null;

  constructor(private router: Router) { }

  hoverGalaxy(galaxy: any) {
    // Можно добавить анимацию
  }

  hoverSubtopic(subtopic: any) {
    // Можно добавить эффект при наведении
  }

  zoomIntoGalaxy(galaxy: any) {
    this.zoomedGalaxy = galaxy;
    this.isZoomingToPlanet = false; // <-- обязательно!
    this.zoomStyle = {}; // сброс
  }


  resetZoom() {
    this.zoomedGalaxy = null;
    this.zoomStyle = {};
    this.focusedGalaxyIndex = null;

    const galaxyWrappers = document.querySelectorAll('.galaxy-wrapper');
    galaxyWrappers.forEach(el => el.classList.remove('focused'));
  }



  generateSubtopics(count: number, names: string[]) {
    let subtopics = [];
    for (let i = 0; i < count; i++) {
      let angle = (i / count) * Math.PI * 2;
      let x = 100 + Math.cos(angle) * 90; // Используем радиус RX эллипса
      let y = 100 + Math.sin(angle) * 60; // Используем радиус RY эллипса

      subtopics.push({
        x,
        y,
        name: names[i]
      });
    }
    return subtopics;
  }



  onSubtopicClick(galaxyName: string, subtopicName: string) {
    this.router.navigate(['/student/wordsTeaching', galaxyName, subtopicName]); // <-- Редирект на страницу карточек
  }

  ////////////////////////////////поиск слов

  searchWord() {
    if (!this.searchQuery.trim()) {
      this.searchResults = [];
      return;
    }

    const raw = localStorage.getItem('vocabulary_cards');
    console.log('📦 Из localStorage:', raw);

    const allWords: WordCard[] = JSON.parse(raw || '[]');
    console.log('📄 Всего слов:', allWords.length);

    this.searchResults = allWords
      .filter(card =>
        card.word.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        card.translation.toLowerCase().includes(this.searchQuery.toLowerCase())
      )
      .map(card => ({
        ...card,
        display: `${card.word} → ${card.translation}`,
        fullPath: `${card.subtopic} → ${card.galaxy}`
      }));

    console.log('🔎 Найдено результатов:', this.searchResults.length);
  }

  navigateToWord(result: any) {
    const galaxy = this.galaxies.find(g => g.name === result.galaxy);
    if (!galaxy) return;

    const galaxyIndex = this.galaxies.indexOf(galaxy);
    const galaxyElement = this.galaxyElements.get(galaxyIndex)?.nativeElement;

    if (!galaxyElement) return;

    // Удалим класс у всех
    this.galaxyElements.forEach(el => el.nativeElement.classList.remove('scale-up-galaxy'));

    // Применим зум к нужной
    galaxyElement.classList.add('scale-up-galaxy');

    this.isZoomingToGalaxy = true;

    // Шаг 1 — прокручиваем прямо к галактике в SVG
    galaxyElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    // Шаг 2 — через 2 секунды приближаем
    setTimeout(() => {
      this.isZoomingToGalaxy = false;
      this.zoomedGalaxy = galaxy;
      this.isZoomingToPlanet = true;

      setTimeout(() => {
        const subtopic = galaxy.subtopics.find(s => s.name === result.subtopic);
        if (!subtopic) return;

        const targetX = subtopic.x * 3;
        const targetY = subtopic.y * 3;
        const offsetX = 300 - targetX;
        const offsetY = 300 - targetY;

        this.zoomStyle = {
          transition: 'transform 2s ease',
          transform: `translate(${offsetX}px, ${offsetY}px) scale(2)`
        };

        setTimeout(() => {
          this.isZoomingToPlanet = false;
          this.onSubtopicClick(galaxy.name, result.subtopic);
        }, 2500);
      }, 200);
    }, 2000);
  }





}
