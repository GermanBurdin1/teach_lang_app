import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LexiconService } from '../../services/lexicon.service';
import { TranslationService } from '../../services/translation.service';
import * as Grammar from './models/grammar-data.model';
import { GrammarData } from './models/grammar-data.model';

interface TranslationEntry {
  id?: number;
  target: string;
  examples?: string[];
}

interface WordCard {
  id: number;
  word: string;
  translations: TranslationEntry[];
  userInput: string;
  flipped: boolean;
  hintVisible: boolean;
  isCorrect: boolean | null;
  hintIndex: number;
  showTranslation: boolean;
  status: 'learned' | 'repeat' | 'error' | null;
  revealed?: boolean;
  type: 'word' | 'expression';
  createdAt: number;
  galaxy: string;
  subtopic: string;
  grammar?: GrammarData;
}

@Component({
  selector: 'app-vocabulary',
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.css'],
})
export class VocabularyComponent implements OnInit {

  @Input() currentGalaxy: string = '';
  @Input() currentSubtopic: string = '';
  words: WordCard[] = [];
  expressions: WordCard[] = [];
  newWord: string = '';
  newTranslation: string = '';
  showHint: boolean = true; // Подсказка "Кликни, чтобы увидеть перевод"
  sortBy: string = 'all';
  sortOrderWords: 'asc' | 'desc' = 'desc';
  sortOrderExpressions: 'asc' | 'desc' = 'desc';
  newWordType: 'word' | 'expression' = 'word';
  // Переменная для управления отображением формы ввода
  showInputFields: boolean = false;
  wordsPerPage = 10;
  expressionsPerPage = 10;
  currentWordsPage = 1;
  currentExpressionsPage = 1;
  viewMode: 'cards' | 'list' = 'cards'; // по умолчанию карточки
  filterType: 'all' | 'word' | 'expression' = 'all';
  showAddCardModal: boolean = false;
  editingCard: WordCard | null = null;
  manualTranslation: string = '';
  sourceLang: 'ru' | 'fr' | 'en' = 'fr';
  targetLang: 'ru' | 'fr' | 'en' = 'ru';
  isManualTranslation: boolean = false;
  isAutoTranslation: boolean = false;
  selectedTranslationIndex: number | null = null;
  showExtraModal: boolean = false;
  newExample: string = '';
  showExtraTranslationModal: boolean = false;
  showExamplesView: boolean = false;
  showTranslationsView: boolean = false;
  enlargedCardId: number | null = null;
  newGrammarData: Grammar.GrammarData | null = null;
  newTranslationGrammar: Grammar.GrammarData | null = null;

  constructor(private route: ActivatedRoute, private lexiconService: LexiconService, private translationService: TranslationService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.currentGalaxy = params.get('galaxy') || '';
      this.currentSubtopic = params.get('subtopic') || '';

      console.log('📌 Galaxy from route:', this.currentGalaxy);
      console.log('📌 Subtopic from route:', this.currentSubtopic);

      // 🔁 Пытаемся загрузить с backend
      this.lexiconService.getWordsByGalaxyAndSubtopic(this.currentGalaxy, this.currentSubtopic)
        .subscribe({

          next: (data) => {
            console.log('📦 Данные от backend:', data);
            const enriched = data.map(card => {
              const translations = (card.translations ?? []).map(t => ({
                id: t.id,
                target: t.target,
                examples: t.example ? [t.example] : [],
              }));


              return {
                ...card,
                id: card.id ?? Date.now(),
                translations,
                userInput: '',
                flipped: false,
                hintVisible: true,
                isCorrect: null,
                hintIndex: 0,
                showTranslation: card?.revealed ?? false,
                status: card.status ?? null,
                createdAt: card.createdAt ?? Date.now(),
              };
            });

            this.words = enriched.filter(item => item.type === 'word');
            this.expressions = enriched.filter(item => item.type === 'expression');
            // ✅ Сохраняем резервную копию
            this.saveToLocalStorage(enriched);

            console.log('✅ Загрузили карточки с backend:', enriched);
          },
          error: (err) => {
            console.error('❌ Ошибка при загрузке с backend. Пробуем localStorage:', err);

            const updated = this.loadFromLocalStorage();
            if (!updated) return;

            const relevant = updated.filter(
              item => item.galaxy === this.currentGalaxy && item.subtopic === this.currentSubtopic
            );
            this.words = relevant.filter(item => item.type === 'word');
            this.expressions = relevant.filter(item => item.type === 'expression');

            console.log('✅ Загружено из localStorage:', relevant);
          }
        });
    });
  }


  // Загрузка карточек (пока что просто статичный массив)
  loadWords(): void {
    const rawItems: WordCard[] = [
      // КРУГОЗОР
      { id: 1, word: 'революция', translations: [{ target: 'revolution' }], type: 'word', galaxy: 'Кругозор', subtopic: 'История', ...this.defaultCard() },
      { id: 2, word: 'империя', translations: [{ target: 'empire' }], type: 'word', galaxy: 'Кругозор', subtopic: 'История', ...this.defaultCard() },
      { id: 3, word: 'атом', translations: [{ target: 'atom' }], type: 'word', galaxy: 'Кругозор', subtopic: 'Наука', ...this.defaultCard() },
      { id: 4, word: 'эксперимент', translations: [{ target: 'experiment' }], type: 'word', galaxy: 'Кругозор', subtopic: 'Наука', ...this.defaultCard() },
      { id: 5, word: 'пьеса', translations: [{ target: 'play (theater)' }], type: 'word', galaxy: 'Кругозор', subtopic: 'Искусство', ...this.defaultCard() },
      { id: 6, word: 'палитра', translations: [{ target: 'palette' }], type: 'word', galaxy: 'Кругозор', subtopic: 'Искусство', ...this.defaultCard() },
      { id: 7, word: 'мыслитель', translations: [{ target: 'thinker' }], type: 'word', galaxy: 'Кругозор', subtopic: 'Философия', ...this.defaultCard() },
      { id: 8, word: 'вопрос бытия', translations: [{ target: 'question of being' }], type: 'expression', galaxy: 'Кругозор', subtopic: 'Философия', ...this.defaultCard() },
      { id: 9, word: 'инновация', translations: [{ target: 'innovation' }], type: 'word', galaxy: 'Кругозор', subtopic: 'Технологии', ...this.defaultCard() },
      { id: 10, word: 'искусственный интеллект', translations: [{ target: 'artificial intelligence' }], type: 'expression', galaxy: 'Кругозор', subtopic: 'Технологии', ...this.defaultCard() },
      { id: 11, word: 'наследие', translations: [{ target: 'heritage' }], type: 'word', galaxy: 'Кругозор', subtopic: 'Культура', ...this.defaultCard() },
      { id: 12, word: 'традиции народа', translations: [{ target: 'folk traditions' }], type: 'expression', galaxy: 'Кругозор', subtopic: 'Культура', ...this.defaultCard() },

      // СОЦИАЛЬНЫЕ СВЯЗИ
      { id: 13, word: 'мама', translations: [{ target: 'mom' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Семья', ...this.defaultCard() },
      { id: 14, word: 'брат', translations: [{ target: 'brother' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Семья', ...this.defaultCard() },
      { id: 15, word: 'лучший друг', translations: [{ target: 'best friend' }], type: 'expression', galaxy: 'Социальные связи', subtopic: 'Друзья', ...this.defaultCard() },
      { id: 16, word: 'дружить', translations: [{ target: 'be friends' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Друзья', ...this.defaultCard() },
      { id: 17, word: 'начальник', translations: [{ target: 'boss' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Работа', ...this.defaultCard() },
      { id: 18, word: 'рабочий процесс', translations: [{ target: 'workflow' }], type: 'expression', galaxy: 'Социальные связи', subtopic: 'Работа', ...this.defaultCard() },
      { id: 19, word: 'поделиться постом', translations: [{ target: 'share a post' }], type: 'expression', galaxy: 'Социальные связи', subtopic: 'Социальные сети', ...this.defaultCard() },
      { id: 20, word: 'подписчик', translations: [{ target: 'follower' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Социальные сети', ...this.defaultCard() },
      { id: 21, word: 'вести диалог', translations: [{ target: 'have a dialogue' }], type: 'expression', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 31, word: 'контакт', translations: [{ target: 'contact' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 32, word: 'диалог', translations: [{ target: 'dialogue' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 33, word: 'общение', translations: [{ target: 'communication' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 34, word: 'разговор', translations: [{ target: 'conversation' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 35, word: 'вопрос', translations: [{ target: 'question' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 36, word: 'ответ', translations: [{ target: 'answer' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 37, word: 'обсуждение', translations: [{ target: 'discussion' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 38, word: 'высказывание', translations: [{ target: 'statement' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 39, word: 'недопонимание', translations: [{ target: 'misunderstanding' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 40, word: 'аргумент', translations: [{ target: 'argument' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 41, word: 'мнение', translations: [{ target: 'opinion' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 42, word: 'переписка', translations: [{ target: 'correspondence' }], type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },

      // РАБОТА И КАРЬЕРА
      { id: 23, word: 'вакансия', translations: [{ target: 'job opening' }], type: 'word', galaxy: 'Работа и карьера', subtopic: 'Вакансии', ...this.defaultCard() },
      { id: 24, word: 'резюме', translations: [{ target: 'resume' }], type: 'word', galaxy: 'Работа и карьера', subtopic: 'Вакансии', ...this.defaultCard() },
      { id: 25, word: 'коммуникабельность', translations: [{ target: 'communication skills' }], type: 'word', galaxy: 'Работа и карьера', subtopic: 'Навыки', ...this.defaultCard() },
      { id: 26, word: 'решать задачи', translations: [{ target: 'solve tasks' }], type: 'expression', galaxy: 'Работа и карьера', subtopic: 'Навыки', ...this.defaultCard() },
      { id: 27, word: 'описание опыта', translations: [{ target: 'experience description' }], type: 'expression', galaxy: 'Работа и карьера', subtopic: 'Резюме', ...this.defaultCard() },
      { id: 28, word: 'образование', translations: [{ target: 'education' }], type: 'word', galaxy: 'Работа и карьера', subtopic: 'Резюме', ...this.defaultCard() },
      { id: 29, word: 'вопрос на собеседовании', translations: [{ target: 'interview question' }], type: 'expression', galaxy: 'Работа и карьера', subtopic: 'Собеседование', ...this.defaultCard() },
      { id: 30, word: 'работодатель', translations: [{ target: 'employer' }], type: 'word', galaxy: 'Работа и карьера', subtopic: 'Собеседование', ...this.defaultCard() }
    ];

    const enrichedItems = rawItems.map(item => ({
      ...item,
      type: item.type,
      userInput: '',
      flipped: false,
      hintVisible: true,
      isCorrect: null,
      hintIndex: 0,
      status: null,
      showTranslation: false
    }));

    this.saveToLocalStorage(enrichedItems);
    // Оставляем только актуальные карточки по текущей галактике и подтеме
    const relevant = enrichedItems.filter(
      item => item.galaxy === this.currentGalaxy && item.subtopic === this.currentSubtopic
    );
    this.words = relevant.filter(item => item.type === 'word');
    this.expressions = relevant.filter(item => item.type === 'expression');

  }

  defaultCard() {
    return {
      userInput: '',
      flipped: false,
      hintVisible: true,
      isCorrect: null,
      hintIndex: 0,
      showTranslation: false,
      status: null,
      createdAt: Date.now()
    };
  }

  // Метод добавления слова или выражения
  addItem(): void {
    if (!this.newWord.trim()) return;

    const newCard: WordCard = {
      id: Date.now(),
      createdAt: Date.now(),
      word: this.newWord.trim(),
      translations: [{ target: this.newTranslation }],
      userInput: '',
      flipped: false,
      hintVisible: true,
      isCorrect: null,
      hintIndex: 0,
      showTranslation: false,
      status: null,
      type: this.newWordType,
      galaxy: this.currentGalaxy,
      subtopic: this.currentSubtopic
    };

    console.log('📤 Отправка на backend:', {
      word: newCard.word,
      galaxy: newCard.galaxy,
      subtopic: newCard.subtopic,
      type: newCard.type
    });

    // Пытаемся отправить на backend
    this.lexiconService.addWord({
      word: newCard.word,
      galaxy: newCard.galaxy!,
      subtopic: newCard.subtopic!,
      type: newCard.type
    }).subscribe({
      next: (res) => {
        console.log('✅ Слово добавлено в БД:', res);
      },
      error: (err) => {
        console.warn('⚠️ Ошибка при отправке в БД. Сохраняем локально:', err);
      }
    });

    // В любом случае сохраняем в localStorage и отображаем в UI
    if (this.newWordType === 'word') {
      this.words.unshift(newCard);
    } else {
      this.expressions.unshift(newCard);
    }

    this.saveToLocalStorage();

    // Очистка полей
    this.newWord = '';
    this.newTranslation = '';

    this.closeAddCardModal();
  }

  // Удаление карточки
  deleteWord(id: number): void {
    this.words = this.words.filter(word => word.id !== id);
  }

  // Выбор типа карточки (слово/выражение) — сразу отображает поля ввода
  openAddCardModal(type: 'word' | 'expression'): void {
    this.newWordType = type;
    this.showAddCardModal = true;
  }

  closeAddCardModal(): void {
    this.showAddCardModal = false;
  }

  // Удаление карточки
  deleteItem(id: number, type: 'word' | 'expression'): void {
    if (type === 'word') {
      this.words = this.words.filter(word => word.id !== id);
    } else {
      this.expressions = this.expressions.filter(expression => expression.id !== id);
    }
    this.saveToLocalStorage();
  }

  // Переворот карточки
  flipCard(card: WordCard): void {
    if (!card.translations[0] || card.translations[0].target === '...') {
      this.openTranslationForm(card); // <-- покажем форму
      return;
    }

    card.flipped = !card.flipped;
    card.hintVisible = false;
  }

  // Проверка перевода
  checkTranslation(card: WordCard): void {
    const userAnswer = card.userInput.trim().toLowerCase();
    const correctAnswer = card.translations[0]?.target?.toLowerCase();

    if (userAnswer === correctAnswer) {
      card.isCorrect = true;
      card.status = 'learned';

      this.lexiconService.updateWordStatus(card.id, 'learned').subscribe({
        next: () => console.log(`✅ Статус "learned" успешно отправлен для id=${card.id}`),
        error: (err) => console.error(`❌ Ошибка при отправке "learned" для id=${card.id}:`, err)
      });

    } else {
      card.isCorrect = false;
      card.status = 'error';

      this.lexiconService.updateWordStatus(card.id, 'error').subscribe({
        next: () => console.log(`⚠️ Статус "error" успешно отправлен для id=${card.id}`),
        error: (err) => console.error(`❌ Ошибка при отправке "error" для id=${card.id}:`, err)
      });
    }

    this.saveToLocalStorage();
  }


  // Сортировка карточек
  sortWords(): void {
    const allItems = this.loadFromLocalStorage() || [];

    const relevantItems = allItems.filter(
      card =>
        card.galaxy === this.currentGalaxy &&
        card.subtopic === this.currentSubtopic
    );

    let filtered = relevantItems;

    switch (this.sortBy) {
      case 'repeat':
        filtered = relevantItems.filter(card => card.status === 'repeat');
        break;
      case 'learned':
        filtered = relevantItems.filter(card => card.status === 'learned');
        break;
      case 'untranslated':
        filtered = relevantItems.filter(card => !card.translations[0] || card.translations[0].target === '...');
        break;
      case 'hardest':
        filtered = relevantItems.filter(card => card.status === 'error');
        break;
      case 'all':
      default:
        // ничего не фильтруем
        break;
    }

    this.words = filtered
      .filter(card => card.type === 'word')
      .sort((a, b) =>
        this.sortOrderWords === 'desc'
          ? b.createdAt - a.createdAt
          : a.createdAt - b.createdAt
      );

    this.expressions = filtered
      .filter(card => card.type === 'expression')
      .sort((a, b) =>
        this.sortOrderExpressions === 'desc'
          ? b.createdAt - a.createdAt
          : a.createdAt - b.createdAt
      );
  }

  toggleSortOrderWords(): void {
    this.sortOrderWords = this.sortOrderWords === 'desc' ? 'asc' : 'desc';
    this.sortWords();
  }

  toggleSortOrderExpressions(): void {
    this.sortOrderExpressions = this.sortOrderExpressions === 'desc' ? 'asc' : 'desc';
    this.sortWords();
  }

  getAllItems(): WordCard[] {
    return [...this.words, ...this.expressions];
  }


  getHint(card: WordCard): string {
    if (!card.translations[0] || card.translations[0].target === '...') {
      return 'Добавить перевод';
    }

    const full = card.translations[0].target;
    const visible = full
      .slice(0, card.hintIndex ?? 0)
      .split('')
      .join(' ');
    const hidden = full
      .slice(card.hintIndex ?? 0)
      .replace(/./g, '_')
      .split('')
      .join(' ');
    return `${visible} ${hidden}`.trim();
  }


  revealNextHint(card: WordCard): void {
    if ((card.hintIndex ?? 0) < card.translations[0].target.length - 1) {
      card.hintIndex = (card.hintIndex ?? 0) + 1;
    } else {
      card.showTranslation = true;
      this.lexiconService.revealWord(card.id).subscribe({
        next: () => console.log('📘 Перевод показан (revealed = true)'),
        error: (err) => console.error('❌ Ошибка при вызове revealWord:', err)
      });
    }
    this.saveToLocalStorage();
  }

  showFullTranslation(card: WordCard): void {
    card.showTranslation = true;

    this.lexiconService.revealWord(card.id).subscribe({
      next: () => console.log('📘 Перевод показан (revealed = true)'),
      error: (err) => console.error('❌ Ошибка при вызове revealWord:', err)
    });
    this.saveToLocalStorage();
  }

  // showFullTranslation(card: WordCard): void {
  //   card.showTranslation = true;
  //   this.lexiconService.markAsRevealed(card.id).subscribe({
  //     next: () => console.log('👁 Отправили revealed=true'),
  //     error: err => console.error('❌ Ошибка при отправке revealed:', err)
  //   });
  // }

  ///////////////////////////////////////////обработка слов

  markAsLearned(card: WordCard): void {
    card.status = 'learned';

    this.lexiconService.updateWordStatus(card.id, 'learned').subscribe({
      next: () => console.log(`✅ Статус "learned" обновлён в БД для id=${card.id}`),
      error: (err) => console.error(`❌ Ошибка при обновлении "learned" для id=${card.id}:`, err)
    });

    this.saveToLocalStorage();
  }


  markForRepetition(card: WordCard): void {
    card.status = 'repeat';

    this.lexiconService.updateWordStatus(card.id, 'repeat').subscribe({
      next: () => console.log(`🔁 Статус "repeat" обновлён в БД для id=${card.id}`),
      error: (err) => console.error(`❌ Ошибка при обновлении "repeat" для id=${card.id}:`, err)
    });

    this.saveToLocalStorage();
  }



  saveToLocalStorage(cards?: WordCard[]): void {
    const allItems = cards ?? [...this.words, ...this.expressions];
    localStorage.setItem('vocabulary_cards', JSON.stringify(allItems));
    console.log('💾 Сохранили в localStorage:', allItems); // <--- добавь это!
  }

  loadFromLocalStorage(): WordCard[] | null {
    const data = localStorage.getItem('vocabulary_cards');
    if (!data) return null;

    const parsed = JSON.parse(data);
    return parsed.map((item: any) => ({
      ...item,
      createdAt: item.createdAt || Date.now() // <-- добавим дату, если не было
    }));
  }


  /////////////////////////////////////////////////////
  get paginatedWords(): WordCard[] {
    const start = (this.currentWordsPage - 1) * this.wordsPerPage;
    return this.words.slice(start, start + this.wordsPerPage);
  }

  get paginatedExpressions(): WordCard[] {
    const start = (this.currentExpressionsPage - 1) * this.expressionsPerPage;
    return this.expressions.slice(start, start + this.expressionsPerPage);
  }

  get totalWords(): number {
    return this.words.length;
  }

  get totalExpressions(): number {
    return this.expressions.length;
  }

  get wordsRangeLabel(): string {
    const start = (this.currentWordsPage - 1) * this.wordsPerPage + 1;
    const end = Math.min(this.currentWordsPage * this.wordsPerPage, this.totalWords);
    return `Карточки: ${start}–${end} из ${this.totalWords}`;
  }

  get hasNextWordsPage(): boolean {
    return this.currentWordsPage * this.wordsPerPage < this.totalWords;
  }

  get hasPrevWordsPage(): boolean {
    return this.currentWordsPage > 1;
  }

  get expressionsPaginationLabel(): string {
    const total = this.expressions.length;
    const start = (this.currentExpressionsPage - 1) * this.expressionsPerPage + 1;
    const end = Math.min(start + this.expressionsPerPage - 1, total);
    return `Выражения: ${start}–${end} из ${total}`;
  }

  get hasNextExpressionsPage(): boolean {
    return this.currentExpressionsPage * this.expressionsPerPage < this.expressions.length;
  }

  get hasPrevExpressionsPage(): boolean {
    return this.currentExpressionsPage > 1;
  }

  get filteredWords(): WordCard[] {
    return this.filterType === 'all' || this.filterType === 'word' ? this.words : [];
  }

  get filteredExpressions(): WordCard[] {
    return this.filterType === 'all' || this.filterType === 'expression' ? this.expressions : [];
  }

  get selectedTranslation(): TranslationEntry | null {
    if (this.editingCard && this.selectedTranslationIndex !== null) {
      return this.editingCard.translations[this.selectedTranslationIndex] || null;
    }
    return null;
  }


  changeWordsPage(delta: number): void {
    const maxPage = Math.ceil(this.words.length / this.wordsPerPage);
    this.currentWordsPage = Math.max(1, Math.min(this.currentWordsPage + delta, maxPage));
  }

  changeExpressionsPage(delta: number): void {
    const maxPage = Math.ceil(this.expressions.length / this.expressionsPerPage);
    this.currentExpressionsPage = Math.max(1, Math.min(this.currentExpressionsPage + delta, maxPage));
  }

  resetToPractice(card: WordCard): void {
    card.status = null;
    card.userInput = '';
    card.isCorrect = null;
    card.hintIndex = 0;
    card.showTranslation = false;
    card.flipped = false; // опционально: вернуть карточку на лицевую сторону
    card.hintVisible = true; // снова показать «Кликни, чтобы увидеть перевод»
    this.saveToLocalStorage();
  }

  //подсчет слов и/или выражений
  getWordAndExpressionCount(): string {
    const raw = localStorage.getItem('vocabulary_cards');
    const all: WordCard[] = raw ? JSON.parse(raw) : [];

    const relevant = all.filter(item =>
      item.galaxy === this.currentGalaxy &&
      item.subtopic === this.currentSubtopic
    );

    const wordCount = relevant.filter(item => item.type === 'word').length;
    const exprCount = relevant.filter(item => item.type === 'expression').length;

    return `${wordCount} слов / ${exprCount} выражений`;
  }

  //для непереведенных
  openTranslationForm(card: WordCard, forceShow = false): void {
    this.editingCard = card;
    this.manualTranslation = '';
  }


  saveManualTranslation(): void {
    if (this.editingCard && this.manualTranslation.trim()) {
      const translationText = this.manualTranslation.trim();
      // ✅ Отправка перевода в backend
      this.translationService.saveTranslation({
        source: "manual",
        sourceText: this.editingCard.word,
        translation: translationText,
        sourceLang: this.sourceLang,
        targetLang: this.targetLang,
        wordId: this.editingCard.id,
      }).subscribe({
        next: (res) => {
          console.log('✅ Перевод сохранён в БД (ручной):', res);
          this.editingCard!.translations[0].target = translationText;
          this.saveToLocalStorage();

          this.editingCard = null;
          this.manualTranslation = '';
        },
        error: (err) => {
          console.error('❌ Ошибка при сохранении ручного перевода:', err);
          alert('Упс 😓 Не удалось сохранить перевод. Повторите попытку.');
        }
      });
    }
  }


  cancelTranslationEdit({ keepActionChoiceModal = true } = {}): void {
    this.editingCard = null;
    this.manualTranslation = '';
  }



  detectLanguage(word: string): 'ru' | 'fr' | 'en' {
    if (/^[а-яё\s]+$/i.test(word)) return 'ru';
    if (/^[a-z\s]+$/i.test(word)) return 'en';
    if (/^[a-zàâçéèêëîïôûùüÿñæœ\s\-']+$/i.test(word)) return 'fr';
    return 'en'; // по умолчанию
  }

  requestTranslation(card: WordCard | null = null): void {
    if (this.newWord.trim() === '') return;

    const detectedLang = this.detectLanguage(this.newWord);

    if (detectedLang !== this.sourceLang) {
      const langNames = { ru: 'русский', fr: 'французский', en: 'английский' };
      const confirmed = confirm(
        `Вы выбрали перевод с языка: ${langNames[this.sourceLang]}, но слово "${this.newWord}" выглядит как на ${langNames[detectedLang]}. Переключить язык на ${langNames[detectedLang]}?`
      );
      if (confirmed) {
        this.sourceLang = detectedLang;
      } else {
        return;
      }
    }

    this.translationService.requestTranslation(this.newWord, this.sourceLang, this.targetLang).subscribe({
      next: (res) => {
        if (res.translations.length) {
          this.newTranslation = res.translations[0];
          this.isAutoTranslation = true;
          this.isManualTranslation = false;

          this.showConfetti();

          console.log(`✅ Перевод получен из ${res.from}:`, res.translations);

          // 👉 Добавим карточку
          const newCard: WordCard = {
            id: Date.now(),
            createdAt: Date.now(),
            word: this.newWord.trim(),
            translations: [{ target: this.newTranslation }],
            userInput: '',
            flipped: false,
            hintVisible: true,
            isCorrect: null,
            hintIndex: 0,
            showTranslation: card?.revealed ?? false,
            status: null,
            type: this.newWordType,
            galaxy: this.currentGalaxy,
            subtopic: this.currentSubtopic
          };

          // Попробуем отправить на backend
          this.lexiconService.addWord({
            word: newCard.word,
            galaxy: newCard.galaxy!,
            subtopic: newCard.subtopic!,
            type: newCard.type
          }).subscribe({
            next: (res) => console.log('✅ Слово добавлено в БД:', res),
            error: (err) => console.warn('⚠️ Ошибка при отправке в БД. Сохраняем локально:', err)
          });

          if (this.newWordType === 'word') {
            this.words.unshift(newCard);
          } else {
            this.expressions.unshift(newCard);
          }

          this.saveToLocalStorage();
          this.newWord = '';
          this.newTranslation = '';
          this.closeAddCardModal(); // ✅ Закроем модалку
        }
      },
      error: (err) => {
        console.error('❌ Ошибка при переводе:', err);
      }
    });
  }

  showConfetti(): void {
    const confettiScript = document.createElement('script');
    confettiScript.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    confettiScript.onload = () => {
      (window as any).confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
    };
    document.body.appendChild(confettiScript);
  }

  onManualTranslationInput(): void {
    if (this.newTranslation.trim()) {
      this.isManualTranslation = true;
      this.isAutoTranslation = false;
    } else {
      this.isManualTranslation = false;
    }
  }

  openExtraModal(card: WordCard, index: number): void {
    this.enlargedCardId = card.id;
    this.editingCard = card;
    this.selectedTranslationIndex = index;
    this.newExample = '';
    this.resetModals(); // добавь этот вызов
  }

  closeExtraModal(): void {
    this.showExtraModal = false;
    this.newExample = '';
    this.editingCard = null;
    this.selectedTranslationIndex = null;
  }

  openExampleModal(): void {
    // this.resetModals();
    this.showExtraModal = true;
  }

  openExtraTranslationModal(): void {
    // this.resetModals();
    this.showExtraTranslationModal = true;
  }

  viewExamples(): void {
    this.resetModals();
    this.showExamplesView = true;
  }

  viewTranslations(): void {
    this.resetModals();
    this.showTranslationsView = true;
  }

  closeAllModals(): void {
    this.resetModals();
    this.editingCard = null;
    this.selectedTranslationIndex = null;
  }

  resetModals(): void {
    this.showAddCardModal = false;
    this.showExtraModal = false;
    this.showExtraTranslationModal = false;
    this.showExamplesView = false;
    this.showTranslationsView = false;
  }

  addExample(): void {
    if (!this.editingCard || this.selectedTranslationIndex === null) return;
    const example = this.newExample.trim();
    if (!example) return;

    const translation = this.editingCard.translations[this.selectedTranslationIndex];
    translation.examples = translation.examples || [];
    translation.examples.push(example);

    // Обновляем на backend:
    if (!translation?.id) return;
    this.translationService.updateTranslationExample({
      translationId: translation.id,
      examples: translation.examples
    }).subscribe({
      next: () => {
        console.log('✅ Пример добавлен');
        this.saveToLocalStorage();
        this.newExample = '';
      },
      error: (err) => console.error('❌ Ошибка при добавлении примера', err)
    });
  }

  enlargeCard(card: WordCard): void {
    this.enlargedCardId = card.id;
    this.editingCard = card;
  }

  closeEnlargedCard(): void {
    this.enlargedCardId = null;
    this.editingCard = null;
    this.resetModals();
  }

  toggleEnlargedCard(card: WordCard, index: number): void {
    if (this.enlargedCardId === card.id) {
      this.closeEnlargedCard();
    } else {
      this.enlargeCard(card);
      this.selectedTranslationIndex = index;
    }
  }

  // код связаный с частями речи
  onPartOfSpeechChange(partOfSpeech: Grammar.PartOfSpeech): void {
    switch (partOfSpeech) {
      case 'noun':
        this.newGrammarData = { partOfSpeech: 'noun' };
        break;
      case 'verb':
        this.newGrammarData = { partOfSpeech: 'verb' };
        break;
      case 'adjective':
        this.newGrammarData = { partOfSpeech: 'adjective' };
        break;
      case 'adverb':
        this.newGrammarData = { partOfSpeech: 'adverb' };
        break;
      case 'pronoun':
        this.newGrammarData = { partOfSpeech: 'pronoun' };
        break;
      case 'preposition':
        this.newGrammarData = { partOfSpeech: 'preposition' };
        break;
      case 'conjunction':
        this.newGrammarData = { partOfSpeech: 'conjunction' };
        break;
      case 'interjection':
        this.newGrammarData = { partOfSpeech: 'interjection' };
        break;
      default:
        this.newGrammarData = null;
    }
  }

  onGrammarChange(updated: GrammarData) {
    this.newGrammarData = updated;
  }

  ensureCardGrammar(card: WordCard): void {
    if (!card.grammar) {
      card.grammar = { partOfSpeech: '' as Grammar.PartOfSpeech };
    }
  }

  getGrammarBadge(grammar: GrammarData): string {
    const parts: string[] = [];

    switch (grammar.partOfSpeech) {
      case 'noun':
        parts.push('n.');
        const gender = (grammar as Grammar.NounGrammar).gender;
        if (gender === 'masculine') parts.push('m.');
        if (gender === 'feminine') parts.push('f.');
        const number = (grammar as Grammar.NounGrammar).number;
        if (number === 'singular') parts.push('sg.');
        if (number === 'plural') parts.push('pl.');
        break;
      case 'verb':
        parts.push('v.');
        break;
      case 'adjective':
        parts.push('adj.');
        break;
      case 'adverb':
        parts.push('adv.');
        break;
      case 'pronoun':
        parts.push('pron.');
        break;
      case 'preposition':
        parts.push('prep.');
        break;
      case 'conjunction':
        parts.push('conj.');
        break;
      case 'interjection':
        parts.push('interj.');
        break;
    }

    return parts.join(' ');
  }


}
