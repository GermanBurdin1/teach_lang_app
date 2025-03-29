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
  @ViewChildren('galaxyWrapper') galaxyWrappers!: QueryList<ElementRef>;


  searchQuery: string = '';
  searchResults: any[] = [];
  zoomStyle = {};
  isZoomingToPlanet = false;
  isZoomingToGalaxy = false;
  focusedGalaxyIndex: number | null = null;
  showGlobalAddWordOrExpressionModal: boolean = false;
  newGlobalWord: string = '';
  newGlobalTranslation: string = '';
  newGlobalType: 'word' | 'expression' = 'word';
  selectedGalaxy: string = '';
  selectedSubtopic: string = '';
  availableSubtopics: string[] = [];
  addSuccessMessage: string = '';

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
    const galaxyElement = this.galaxyWrappers.get(galaxyIndex)?.nativeElement;
    if (!galaxyElement) return;

    // Получаем координаты галактики
    const galaxyRect = galaxyElement.getBoundingClientRect();
    const centerX = galaxyRect.left + galaxyRect.width / 2;
    const centerY = galaxyRect.top + galaxyRect.height / 2;

    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;

    const offsetX = viewportCenterX - centerX;
    const offsetY = viewportCenterY - centerY;

    this.isZoomingToGalaxy = true;

    // Применяем transform к .galaxies через родительскую обёртку
    const galaxiesContainer = document.querySelector('.galaxies') as HTMLElement;
    galaxiesContainer.style.transition = 'transform 1.8s ease';
    galaxiesContainer.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(2)`;

    // Через 2 секунды — показываем zoomedGalaxy
    setTimeout(() => {
      this.isZoomingToGalaxy = false;
      galaxiesContainer.style.transform = ''; // сброс
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

  //добавление слова или выражения на глобальном уровне
  openGlobalAddWordOrExpressionModal(): void {
    this.showGlobalAddWordOrExpressionModal = true;
    this.newGlobalWord = '';
    this.newGlobalTranslation = '';
    this.newGlobalType = 'word';
    this.selectedGalaxy = '';
    this.addSuccessMessage = '';
  }

  closeGlobalAddWordOrExpressionModal(): void {
    this.showGlobalAddWordOrExpressionModal = false;
  }

  saveGlobalWordOrExpression(): void {
    if (!this.newGlobalWord.trim() || !this.selectedGalaxy || !this.selectedSubtopic) return;

    const newCard: WordCard = {
      id: Date.now(),
      word: this.newGlobalWord.trim(),
      translation: this.newGlobalTranslation.trim() || '...',
      galaxy: this.selectedGalaxy,
      subtopic: this.selectedSubtopic,
      type: this.newGlobalType,
      createdAt: Date.now()
    };

    const raw = localStorage.getItem('vocabulary_cards');
    const allCards: WordCard[] = raw ? JSON.parse(raw) : [];

    allCards.unshift(newCard);
    localStorage.setItem('vocabulary_cards', JSON.stringify(allCards));

    this.addSuccessMessage = '✅ Слово сохранено!';

    // Сброс полей
    this.newGlobalWord = '';
    this.newGlobalTranslation = '';
    this.selectedGalaxy = '';
    this.selectedSubtopic = '';
    this.availableSubtopics = [];

    // Закрытие модалки через небольшую паузу
    setTimeout(() => {
      this.addSuccessMessage = '';
      this.closeGlobalAddWordOrExpressionModal();
    }, 1000);
  }


  toggleGlobalType(): void {
    this.newGlobalType = this.newGlobalType === 'word' ? 'expression' : 'word';
  }

  onGalaxySelected(): void {
    const galaxy = this.galaxies.find(g => g.name === this.selectedGalaxy);
    if (galaxy) {
      this.availableSubtopics = galaxy.subtopics.map((s: any) => s.name);
      this.selectedSubtopic = ''; // сброс предыдущего выбора
    } else {
      this.availableSubtopics = [];
    }
  }

}
