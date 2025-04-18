import { Component, ElementRef, QueryList, ViewChildren, AfterViewInit } from '@angular/core';
import { VocabularyGptService } from '../../services/vocabulary-gpt.service';
import { Router } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { GrammarData } from '../vocabulary/models/grammar-data.model';
import textFit from 'textfit';

interface WordCard {
  id?: number;
  word: string;
  translation: string;
  galaxy: string;
  subtopic: string;
  type?: 'word' | 'expression';
  createdAt?: number;
  grammar?: GrammarData
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
  @ViewChildren('labelRef') labelElements!: QueryList<ElementRef>;

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
  isFromGalaxyShortcut: boolean = false;
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
  sourceLang: 'ru' | 'fr' | 'en' = 'ru';
  targetLang: 'ru' | 'fr' | 'en' = 'fr';
  grammarData: GrammarData | null = null;

  zoomedZoneLibre = false;
  showZoneLibre: boolean = false;
  orphanWords: WordCard[] = [];

  pendingSubtopic?: boolean;
  pendingClassificationWords: WordCard[] = [];
  pendingSubtopicWords: WordCard[] = [];
  selectedGalaxyForSubtopic: string | null = null;
  postponedWordsByGalaxy: { [galaxyName: string]: WordCard[] } = {};

  activePendingWord?: WordCard;
  collapsedPostponedList: { [galaxy: string]: boolean } = {};


  ngAfterViewInit(): void {
    this.labelElements.changes.subscribe(() => {
      this.fitSubtopicLabels();
    });
    this.fitSubtopicLabels(); // initial
  }

  constructor(private router: Router, private gptService: VocabularyGptService, private translationService: TranslationService) { }

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
    this.isFromGalaxyShortcut = false; // глобальное добавление
    this.showGlobalAddWordOrExpressionModal = true;
    this.newGlobalWord = '';
    this.newGlobalTranslation = '';
    this.newGlobalType = 'word';
    this.selectedGalaxy = '';
    this.selectedSubtopic = '';
    this.availableSubtopics = [];
    this.addSuccessMessage = '';
  }

  openAddWordOrExpressionForGalaxy(galaxyName: string): void {
    this.isFromGalaxyShortcut = true;
    this.selectedGalaxy = galaxyName;
    this.availableSubtopics = this.galaxies.find(g => g.name === galaxyName)?.subtopics.map(s => s.name) || [];
    this.selectedSubtopic = '';
    this.newGlobalWord = '';
    this.newGlobalTranslation = '';
    this.newGlobalType = 'word';
    this.showGlobalAddWordOrExpressionModal = true;
  }

  onGalaxyAddButtonClick(event: MouseEvent, galaxyName: string): void {
    event.stopPropagation();
    this.openAddWordOrExpressionForGalaxy(galaxyName);
  }


  closeGlobalAddWordOrExpressionModal(): void {
    this.showGlobalAddWordOrExpressionModal = false;
  }

  saveGlobalWordOrExpression(): void {
    if (!this.newGlobalWord.trim()) return;

    const newCard: WordCard = {
      id: Date.now(),
      word: this.newGlobalWord.trim(),
      translation: this.newGlobalTranslation.trim() || '...',
      galaxy: this.selectedGalaxy || '',            // пустое значение, если не выбрана категория
      subtopic: this.selectedSubtopic || '',
      type: this.newGlobalType,
      createdAt: Date.now(),
      grammar: this.grammarData ?? undefined,
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

    this.grammarData = null;
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

  // классификации слов
  generateWithGPT(): void {
    if (!this.newGlobalWord.trim()) return;

    this.gptService.classifyWord(this.newGlobalWord, 'user123').subscribe({
      next: (res) => {
        this.selectedGalaxy = res.theme;
        this.onGalaxySelected(); // обновим подтемы
        this.selectedSubtopic = res.subtheme;
      },
      error: (err) => {
        console.error('Ошибка при классификации GPT:', err);
      }
    });
  }

  // перевод
  autoTranslateWord(): void {
    if (!this.newGlobalWord.trim()) return;

    const detectedLang = this.detectLang(this.newGlobalWord);
    if (detectedLang !== this.sourceLang) {
      const langNames: any = { ru: 'русский', fr: 'французский', en: 'английский' };
      const confirmSwitch = confirm(`Введённое слово похоже на слово на языке "${langNames[detectedLang]}", а вы выбрали "${langNames[this.sourceLang]}". Переключиться?`);
      if (confirmSwitch) {
        this.sourceLang = detectedLang;
      } else {
        return;
      }
    }

    this.translationService.requestTranslation(this.newGlobalWord, this.sourceLang, this.targetLang).subscribe({
      next: (res) => {
        if (res.translations.length) {
          this.newGlobalTranslation = res.translations[0];
          this.showConfetti(); // 🎉
          alert(`✅ Перевод: ${res.translations[0]}`);
        } else {
          alert('⚠️ Перевод не найден.');
        }
      },
      error: (err) => {
        alert('❌ Ошибка при попытке перевода.');
        console.error('❌ Ошибка перевода:', err);
      }
    });
  }

  showConfetti(): void {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.onload = () => {
      (window as any).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    };
    document.body.appendChild(script);
  }


  detectLang(word: string): 'ru' | 'fr' | 'en' {
    if (/^[а-яё\s]+$/i.test(word)) return 'ru';
    if (/^[a-z\s]+$/i.test(word)) return 'en';
    if (/^[a-zàâçéèêëîïôûùüÿñæœ\s]+$/i.test(word)) return 'fr';
    return 'en'; // fallback
  }


  // info combien de mots ou expressions
  getWordAndExpressionCount(subtopicName: string, galaxyName: string): string {
    const raw = localStorage.getItem('vocabulary_cards');
    const all: WordCard[] = raw ? JSON.parse(raw) : [];

    const relevant = all.filter(item => item.galaxy === galaxyName && item.subtopic === subtopicName);
    const wordCount = relevant.filter(item => item.type === 'word').length;
    const exprCount = relevant.filter(item => item.type === 'expression').length;

    return `${wordCount} mots / ${exprCount} expressions`;
  }

  fitSubtopicLabels(): void {
    setTimeout(() => {
      this.labelElements.forEach(el => {
        textFit(el.nativeElement, {
          alignHoriz: true,
          alignVert: true,
          multiLine: false,
          maxFontSize: 20,
          minFontSize: 8
        });
      });
    }, 0);
  }

  // ajouter l'info liée aux champs grammatiques
  onGlobalTranslationInput() {
    if (this.newGlobalTranslation.trim() && this.newGlobalType === 'word') {
      this.grammarData = {
        partOfSpeech: 'noun'
      };
    } else {
      this.grammarData = null;
    }
  }

  onGrammarChange(updated: GrammarData) {
    this.grammarData = updated;
  }

  toggleZoneLibre() {
    this.showZoneLibre = !this.showZoneLibre;

    // получаем заново при каждом открытии
    if (this.showZoneLibre) {
      this.getOrphanWords();
    }

    setTimeout(() => {
      this.zoomedZoneLibre = this.showZoneLibre;
    }, 100);
  }


  getOrphanWords() {
    const raw = localStorage.getItem('vocabulary_cards');
    const all: WordCard[] = raw ? JSON.parse(raw) : [];
    this.orphanWords = all.filter(w => !w.galaxy || !w.subtopic);
  }

  onDropToGalaxy(event: DragEvent, galaxyName: string): void {
    event.preventDefault();

    const rawData = event.dataTransfer?.getData('text/plain');
    if (!rawData) return;

    const word: WordCard = JSON.parse(rawData);
    word.galaxy = galaxyName;
    word.subtopic = ''; // пока без подтемы

    const raw = localStorage.getItem('vocabulary_cards');
    const allCards: WordCard[] = raw ? JSON.parse(raw) : [];

    const index = allCards.findIndex(c => c.id === word.id);
    if (index !== -1) {
      allCards[index] = word;
      localStorage.setItem('vocabulary_cards', JSON.stringify(allCards));

      // ✅ ДОБАВЛЯЕМ в список ожидающих подтему
      this.pendingSubtopicWords.push(word);
      this.activePendingWord = word;
      this.orphanWords = this.orphanWords.filter(w => w.id !== word.id);

      this.selectedGalaxyForSubtopic = galaxyName;

      alert(`✅ Добавлено в галактику "${galaxyName}"`);

      // Обновим список слов без категории
      this.getOrphanWords();

      // Зумируемся в выбранную галактику
      this.zoomIntoGalaxy(this.galaxies.find(g => g.name === galaxyName));
    }
  }


  onDragOver(event: DragEvent): void {
    event.preventDefault(); // Разрешаем drop
  }

  onDragStart(event: DragEvent, word: WordCard): void {
    event.dataTransfer?.setData('text/plain', JSON.stringify(word));
  }

  assignSubtopicToPendingWord(subtopicName: string): void {
    const word = this.pendingSubtopicWords.shift();
    if (!word || !this.selectedGalaxyForSubtopic) return;

    word.subtopic = subtopicName;

    const raw = localStorage.getItem('vocabulary_cards');
    const all: WordCard[] = raw ? JSON.parse(raw) : [];

    all.unshift(word);
    localStorage.setItem('vocabulary_cards', JSON.stringify(all));

    this.addSuccessMessage = `✅ "${word.word}" добавлено в подтему "${subtopicName}"`;

    setTimeout(() => {
      this.addSuccessMessage = '';
    }, 2000);

    this.activePendingWord = undefined;

  }

  postponePendingWord(): void {
    const word = this.pendingSubtopicWords.shift();
    if (!word || !this.selectedGalaxyForSubtopic) return;

    if (!this.postponedWordsByGalaxy[this.selectedGalaxyForSubtopic]) {
      this.postponedWordsByGalaxy[this.selectedGalaxyForSubtopic] = [];
    }

    this.postponedWordsByGalaxy[this.selectedGalaxyForSubtopic].push(word);

    // 💡 Слово должно остаться доступным для drag-and-drop — добавим обратно в localStorage
    const raw = localStorage.getItem('vocabulary_cards');
    const all: WordCard[] = raw ? JSON.parse(raw) : [];

    const index = all.findIndex(c => c.id === word.id);
    if (index !== -1) {
      all[index] = word;
    } else {
      all.push(word); // если вдруг не найдено — добавим
    }

    localStorage.setItem('vocabulary_cards', JSON.stringify(all));

    this.activePendingWord = undefined;

  }

  getSubtopicsForSelectedGalaxy(): string[] {
    const galaxy = this.galaxies.find(g => g.name === this.selectedGalaxyForSubtopic);
    return galaxy?.subtopics.map(s => s.name) || [];
  }

  onDropToSubtopic(event: DragEvent, galaxyName: string, subtopicName: string): void {
    event.preventDefault();

    const rawData = event.dataTransfer?.getData('text/plain');
    if (!rawData) return;

    const word: WordCard = JSON.parse(rawData);
    word.galaxy = galaxyName;
    word.subtopic = subtopicName;

    const raw = localStorage.getItem('vocabulary_cards');
    const allCards: WordCard[] = raw ? JSON.parse(raw) : [];

    const index = allCards.findIndex(c => c.id === word.id);
    if (index !== -1) {
      allCards[index] = word;
      localStorage.setItem('vocabulary_cards', JSON.stringify(allCards));
      alert(`✅ Добавлено в подтему "${subtopicName}"`);

      this.pendingSubtopicWords = this.pendingSubtopicWords.filter(w => w.id !== word.id);
    }
  }

  togglePostponedList(galaxy: string): void {
    this.collapsedPostponedList[galaxy] = !this.collapsedPostponedList[galaxy];
  }


}
