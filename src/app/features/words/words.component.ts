import { Component, ElementRef, QueryList, ViewChildren, AfterViewInit, OnDestroy} from '@angular/core';
import { VocabularyGptService } from '../../services/vocabulary-gpt.service';
import { Router } from '@angular/router';
import { TranslationService } from '../../services/translation.service';
import { ExpressionGrammar, GrammarData } from '../vocabulary/models/grammar-data.model';
import textFit from 'textfit';
import { WordEntry } from './models/words.model';
import { LexiconService } from '../../services/lexicon.service';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { AnalyticsService } from '../../services/analytics.service';
import { BackToHomeButtonComponent } from '../../shared/components/back-to-home-button/back-to-home-button.component';

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

interface Subtopic {
  x: number;
  y: number;
  name: string;
  wordCount?: number;
  expressionCount?: number;
}



@Component({
  selector: 'app-words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.css']
})
export class WordsComponent implements OnDestroy {
  @ViewChildren('subtopicElement') subtopicElements!: QueryList<ElementRef>;
  @ViewChildren('galaxyElement') galaxyElements!: QueryList<ElementRef>;
  @ViewChildren('galaxyWrapper') galaxyWrappers!: QueryList<ElementRef>;
  @ViewChildren('labelRef') labelElements!: QueryList<ElementRef>;
  @ViewChildren('grammarFieldsRef') grammarFieldsComponents!: QueryList<any>;

  // RxJS для оптимизации поиска
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

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
      name: 'Galaxie Érudition',
      sanitizedName: 'Galaxie-Érudition'.replace(/\s+/g, '-'), // Убираем пробелы для id
      subtopics: this.generateSubtopics(6, ['Histoire', 'Science', 'Art', 'Philosophie', 'Technologies', 'Culture'])
    },
    {
      name: 'Galaxie Relations',
      sanitizedName: 'Galaxie-Relations'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(5, ['Famille', 'Amis', 'Travail', 'Réseaux sociaux', 'Communication'])
    },
    {
      name: 'Galaxie Carrière',
      sanitizedName: 'Galaxie-Carrière'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(4, ['Emplois', 'Compétences', 'CV', 'Entretien'])
    },
    {
      name: 'Galaxie Objets',
      sanitizedName: 'Galaxie-Objets'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(6, ['Meubles', 'Technologie', 'Outils', 'Vêtements', 'Bijoux', 'Jouets'])
    },
    {
      name: 'Galaxie Santé',
      sanitizedName: 'Galaxie-Santé'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(5, ['Maladies', 'Traitement', 'Prévention', 'Mode de vie sain', 'Pharmacies'])
    },
    {
      name: 'Galaxie Événements',
      sanitizedName: 'Galaxie-Événements'.replace(/\s+/g, '-'),
      subtopics: this.generateSubtopics(4, ['Fêtes', 'Catastrophes', 'Sport', 'Politique'])
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

  //множественное добавление слов
  entries: WordEntry[] = [{ word: '', translation: '', grammar: undefined }];
  maxEntries = 10;
  hasStartedTypingFirstEntry: boolean = false;
  isMultiEntryMode: boolean = false;

  confirmationMessage: string = '';
  showPostAddModal: boolean = false;
  targetGalaxyForPostponed?: any; // запоминаем, в какую галактику потом зумировать

  private loadPostponedWords() {
    const raw = localStorage.getItem('postponed_words');
    if (raw) {
      this.postponedWordsByGalaxy = JSON.parse(raw);
    }
  }

  private savePostponedWords() {
    localStorage.setItem('postponed_words', JSON.stringify(this.postponedWordsByGalaxy));
  }


  ngOnInit(): void {
    this.loadPostponedWords();
    this.initializeSearch();
  }

  private initializeSearch(): void {
    // Оптимизированный поиск с debounceTime для улучшения INP
    this.searchSubject$.pipe(
      debounceTime(300), // Ждем 300ms после последнего ввода
      distinctUntilChanged(), // Игнорируем повторяющиеся значения
      takeUntil(this.destroy$) // Отписываемся при уничтожении компонента
    ).subscribe(searchTerm => {
      this.performSearch(searchTerm);
    });
  }

  ngAfterViewInit(): void {
    this.labelElements.changes.subscribe(() => {
      this.fitSubtopicLabels();
    });
    this.fitSubtopicLabels(); // initial
  }

  ngOnDestroy(): void {
    // Отписываемся от всех подписок для предотвращения memory leaks
    this.destroy$.next();
    this.destroy$.complete();
  }

  constructor(
    private router: Router, 
    private gptService: VocabularyGptService, 
    private translationService: TranslationService, 
    private lexiconService: LexiconService,
    private analyticsService: AnalyticsService
  ) { }

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
    let subtopics: Subtopic[] = [];
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
    // Отправляем запрос в Subject для debounced обработки
    this.searchSubject$.next(this.searchQuery);
  }

  private performSearch(searchTerm: string): void {
    if (!searchTerm.trim()) {
      this.searchResults = [];
      return;
    }

    const raw = localStorage.getItem('vocabulary_cards');
    console.log('📦 Из localStorage:', raw);

    const allWords: WordCard[] = JSON.parse(raw || '[]');
    console.log('📄 Всего слов:', allWords.length);

    this.searchResults = allWords
      .filter(card =>
        card.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.translation.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .map(card => ({
        ...card,
        display: `${card.word} → ${card.translation}`,
        fullPath: `${card.subtopic} → ${card.galaxy}`
      }));

    console.log('🔎 Найдено результатов:', this.searchResults.length);
    
    // 🔑 GA4: Track search event
    this.analyticsService.trackSearch(searchTerm, this.searchResults.length, 'words');
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
    this.entries = [{ word: '', translation: '', grammar: undefined }];
    this.isMultiEntryMode = false;
    this.hasStartedTypingFirstEntry = false;
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
    this.grammarFieldsComponents.forEach(comp => {
      comp.validate();
    });

    const firstEntry = this.entries[0];

    if (!firstEntry.word.trim()) {
      console.warn('🚫 Пустое слово!');
      return;
    }

    console.log('💡 Слово:', firstEntry.word);

    const previousSelectedGalaxy = this.selectedGalaxy; // 🛑 СОХРАНЯЕМ ПЕРЕД ОБНУЛЕНИЕМ
    const previousSelectedSubtopic = this.selectedSubtopic; // 🛑 И подтему тоже

    const newCard: WordCard = {
      id: Date.now(),
      word: firstEntry.word.trim(),
      translation: firstEntry.translation.trim() || '...',
      galaxy: this.selectedGalaxy || '',
      subtopic: this.selectedSubtopic || '',
      type: (this.newGlobalType ?? 'word') as 'word' | 'expression',
      createdAt: Date.now(),
      grammar: firstEntry.grammar ?? undefined,
    };

    // 🛠 Создаём сразу перевод
    const translations = firstEntry.translation.trim()
      ? [{
        id: 0, // временно
        lexiconId: 0, // временно
        source: firstEntry.word.trim(),
        target: firstEntry.translation.trim(),
        sourceLang: this.sourceLang,
        targetLang: this.targetLang,
        meaning: '',
        example: null,
      }]
      : [];


    // 👉 Сначала пытаемся отправить на backend
    try {
      this.lexiconService.addWord({
        word: newCard.word,
        translations,
        galaxy: newCard.galaxy,
        subtopic: newCard.subtopic,
        type: newCard.type ?? 'word',
        grammar: firstEntry.grammar
      }).subscribe({
        next: (res) => {
          console.log('✅ Слово добавлено на backend:', res);
        },
        error: (err) => {
          console.error('❌ Ошибка при добавлении слова:', err);
        }
      });
    } catch (e) {
      console.error('❌ Ошибка выполнения запроса:', e);
    }

    // ⛑ А пока сразу добавим и в localStorage для UI
    this.saveLocally(newCard);
    this.getOrphanWords();

    // Сброс полей
    this.newGlobalWord = '';
    this.newGlobalTranslation = '';
    this.selectedGalaxy = '';
    this.selectedSubtopic = '';
    this.availableSubtopics = [];
    this.grammarData = null;

    if ((this.isFromGalaxyShortcut || !previousSelectedGalaxy) && !previousSelectedSubtopic) {
      const galaxy = this.galaxies.find(g => g.name === previousSelectedGalaxy);
      if (galaxy) {
        // ДОБАВЛЯЕМ ОТЛОЖЕННОЕ СЛОВО
        if (!this.postponedWordsByGalaxy[previousSelectedGalaxy]) {
          this.postponedWordsByGalaxy[previousSelectedGalaxy] = [];
        }
        this.postponedWordsByGalaxy[previousSelectedGalaxy].push(newCard);
        this.savePostponedWords();

        this.targetGalaxyForPostponed = galaxy;
        this.confirmationMessage = `✅ Слово перемещено в некатегоризированные слова галактики "${galaxy.name}", вы можете добавить его в нужную подтему как только этого захотите.`;

        this.closeGlobalAddWordOrExpressionModal();

        setTimeout(() => {
          this.showPostAddModal = true;
        }, 200);
      }
    } else if (this.isFromGalaxyShortcut && previousSelectedSubtopic) {
      const card = {
        galaxy: previousSelectedGalaxy,
        subtopic: previousSelectedSubtopic,
        word: firstEntry.word.trim(),
      };
      this.showNavigateToSubtopicModal(card as WordCard);
      this.closeGlobalAddWordOrExpressionModal();
    } else {
      this.addSuccessMessage = '✅ Слово сохранено!';
      setTimeout(() => {
        this.addSuccessMessage = '';
        this.closeGlobalAddWordOrExpressionModal();
      }, 2000);
    }


    // Обновим orphanWords если нужно
    if (!newCard.galaxy && !newCard.subtopic) {
      this.orphanWords.unshift(newCard);
    }

  }

  private saveLocally(card: WordCard): void {
    const raw = localStorage.getItem('vocabulary_cards');
    const allCards: WordCard[] = raw ? JSON.parse(raw) : [];

    allCards.unshift(card);
    localStorage.setItem('vocabulary_cards', JSON.stringify(allCards));
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
    const firstWord = this.entries[0].word.trim();
    if (!firstWord) return;

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
  autoTranslateWord(index: number): void {
    const entry = this.entries[index];
    const word = entry.word.trim();
    if (!word) return;

    const detectedLang = this.detectLang(word);
    if (detectedLang !== this.sourceLang) {
      const langNames: any = { ru: 'русский', fr: 'французский', en: 'английский' };
      const confirmSwitch = confirm(
        `Введённое слово похоже на слово на языке "${langNames[detectedLang]}", а вы выбрали "${langNames[this.sourceLang]}". Переключиться?`
      );
      if (confirmSwitch) {
        this.sourceLang = detectedLang;
      } else {
        return;
      }
    }

    this.translationService.requestTranslation(word, this.sourceLang, this.targetLang).subscribe({
      next: (res) => {
        if (res.translations.length) {
          entry.translation = res.translations[0];
          entry.grammar = res.grammar ?? { partOfSpeech: 'noun' };
          this.showConfetti();
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
    if (this.newGlobalTranslation.trim()) {
      if (this.newGlobalType === 'word') {
        this.grammarData = {
          partOfSpeech: 'noun'
        };
      } else if (this.newGlobalType === 'expression') {
        this.grammarData = {
          partOfSpeech: 'expression',
          expressionType: 'other' // или по умолчанию 'выражение'
        };
      }
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

    this.orphanWords = all.filter(w =>
      (!w.galaxy || w.galaxy.trim() === '') &&
      (!w.subtopic || w.subtopic.trim() === '')
    );
  }


  onDropToGalaxy(event: DragEvent, galaxyName: string): void {
    event.preventDefault();

    const rawData = event.dataTransfer?.getData('text/plain');
    if (!rawData) return;

    const word: WordCard = JSON.parse(rawData);
    word.galaxy = galaxyName;
    word.subtopic = '';

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

      if (this.postponedWordsByGalaxy[galaxyName]) {
        this.postponedWordsByGalaxy[galaxyName] = this.postponedWordsByGalaxy[galaxyName].filter(w => w.id !== word.id);
      }
      this.savePostponedWords();

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
    this.savePostponedWords();
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

  onEntryChanged(index: number): void {
    const entry = this.entries[index];

    if (index === 0) {
      const isFilled = !!(entry.word.trim() || entry.translation.trim());

      this.hasStartedTypingFirstEntry = isFilled;

      // Если пользователь стёр всё — выйти из multiEntry режима
      if (!isFilled) {
        this.isMultiEntryMode = false;

        // Удалить все кроме первого
        this.entries = [this.entries[0]];
      }
    }
  }

  removeEntry(index: number): void {
    this.entries.splice(index, 1);
    if (this.entries.length <= 1) {
      this.isMultiEntryMode = false;
    }
  }

  saveAll(): void {
    const validEntries = this.entries.filter(e => e.word.trim());
    if (!validEntries.length) return;

    const now = Date.now();

    const backendCards = validEntries.map(entry => ({
      word: entry.word.trim(),
      translations: [],
      galaxy: '',
      subtopic: '',
      type: this.newGlobalType, // 🟢 используем актуальный тип
      createdAt: Date.now(),
      grammar: entry.grammar ?? undefined,
    }));

    try {
      this.lexiconService.addMultipleWords(backendCards).subscribe({
        next: (res) => {
          console.log('✅ Все слова добавлены в БД:', res);
          this.saveAllLocally(validEntries, backendCards, now);
          this.resetEntryModal(true, validEntries.length);
        },
        error: (err) => {
          console.error('❌ Ошибка при сохранении слов. Сохраняем локально:', err);
          this.saveAllLocally(validEntries, backendCards, now);
          this.resetEntryModal(false, validEntries.length);
        }
      });
    } catch (e) {
      console.error('❌ Ошибка до отправки на сервер:', e);
      this.saveAllLocally(validEntries, backendCards, now);
      this.resetEntryModal(false, validEntries.length);
    }
  }

  private saveAllLocally(validEntries: WordEntry[], backendCards: any[], now: number) {
    const raw = localStorage.getItem('vocabulary_cards');
    const allCards: WordCard[] = raw ? JSON.parse(raw) : [];

    backendCards.forEach((card, index) => {
      const localCard: WordCard = {
        id: now + index,
        word: card.word,
        translation: validEntries[index].translation.trim(),
        galaxy: '',
        subtopic: '',
        type: card.type,
        createdAt: card.createdAt,
        grammar: card.grammar
      };

      allCards.unshift(localCard);

      if (!localCard.galaxy && !localCard.subtopic) {
        this.orphanWords.unshift(localCard);
      }
    });

    localStorage.setItem('vocabulary_cards', JSON.stringify(allCards));
  }

  private resetEntryModal(success: boolean, count: number): void {
    this.entries = [{ word: '', translation: '', grammar: undefined }];
    this.showGlobalAddWordOrExpressionModal = false;
    const message = success
      ? `✅ Добавлено в БД: ${count} элементов`
      : `⚠️ Слова не отправлены в БД. Сохранено локально: ${count}`;
    alert(message);
  }


  onLangChangeAttempt(): void {
    if (this.isMultiEntryMode) {
      alert('⚠️ Нельзя менять язык при множественном добавлении слов.');
    }
  }


  enableMultiEntry(): void {
    if (this.entries.length < this.maxEntries) {
      this.entries.push({ word: '', translation: '', grammar: undefined });
      this.isMultiEntryMode = true;
    }
  }

  onTranslationChanged(entry: WordEntry): void {
    if (entry.translation.trim() && !entry.grammar) {
      if (this.newGlobalType === 'word') {
        entry.grammar = { partOfSpeech: 'noun' };
      } else if (this.newGlobalType === 'expression') {
        entry.grammar = {
          partOfSpeech: 'expression',
          expressionType: 'other'
        };
      }
    }

    if (!entry.translation.trim()) {
      entry.grammar = undefined;
    }
  }

  onGrammarValidate(updatedGrammar: GrammarData, entry: WordEntry) {
    console.log('✅ Grammar validated:', updatedGrammar);

    // Обновляем грамматику для конкретной записи
    entry.grammar = updatedGrammar;

    // Здесь можно сразу отправить на сервер, если хочешь
    // Например: this.saveGrammarImmediately(entry);
  }

  showNavigateToSubtopicModal(card: WordCard) {
    const goToSubtopic = confirm(`✅ Слово "${card.word}" добавлено в подтему "${card.subtopic}".\nПерейти к подтеме?`);

    if (goToSubtopic) {
      this.router.navigate(['/student/wordsTeaching', card.galaxy, card.subtopic]);
    } else {
      // ничего не делаем, пользователь остаётся в галактиках
    }
  }

  stayOnGlobalPage() {
    this.showPostAddModal = false;
    this.targetGalaxyForPostponed = undefined;
  }

  goToPostponedWords() {
    if (!this.targetGalaxyForPostponed) return;

    this.showPostAddModal = false;

    this.zoomIntoGalaxy(this.targetGalaxyForPostponed);

    // Открываем список отложенных слов сразу
    setTimeout(() => {
      this.collapsedPostponedList[this.targetGalaxyForPostponed.name] = false;
    }, 500);
  }

  updatePostponedStatus(wordId: number, postponed: boolean): void {
    this.lexiconService.updateWord(wordId, { postponed }).subscribe({
      next: () => console.log(`✅ Статус postponed обновлён для слова id=${wordId}: ${postponed}`),
      error: (err) => console.error('❌ Ошибка при обновлении postponed:', err)
    });
  }


}
