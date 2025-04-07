import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

interface WordCard {
  id: number;
  word: string;
  translation: string;
  userInput: string;
  flipped: boolean;
  hintVisible: boolean;
  isCorrect: boolean | null;
  hintIndex?: number; // <--- текущий индекс подсказки
  showTranslation?: boolean; // <--- если нажали "Показать слово"
  status?: 'learned' | 'repeat' | null;
  type: 'word' | 'expression';
  createdAt: number;
  galaxy?: string;
  subtopic?: string;
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



  constructor(private route: ActivatedRoute) { }
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.currentGalaxy = params.get('galaxy') || '';
      this.currentSubtopic = params.get('subtopic') || '';

      console.log('📌 Galaxy from route:', this.currentGalaxy);
      console.log('📌 Subtopic from route:', this.currentSubtopic);

      // 🔁 Всегда перезаписываем карточки
      // this.loadWords();

      // ⏱ Немного подождем, чтобы данные точно сохранились
      setTimeout(() => {
        const updated = this.loadFromLocalStorage();
        if (!updated) return;

        const relevant = updated.filter(
          item => item.galaxy === this.currentGalaxy && item.subtopic === this.currentSubtopic
        );
        this.words = relevant.filter(item => item.type === 'word');
        this.expressions = relevant.filter(item => item.type === 'expression');

        console.log('✅ Загружены актуальные карточки:', relevant);
      }, 100);
    });
  }


  // Загрузка карточек (пока что просто статичный массив)
  loadWords(): void {
    const rawItems: WordCard[] = [
      // КРУГОЗОР
      { id: 1, word: 'революция', translation: 'revolution', type: 'word', galaxy: 'Кругозор', subtopic: 'История', ...this.defaultCard() },
      { id: 2, word: 'империя', translation: 'empire', type: 'word', galaxy: 'Кругозор', subtopic: 'История', ...this.defaultCard() },
      { id: 3, word: 'атом', translation: 'atom', type: 'word', galaxy: 'Кругозор', subtopic: 'Наука', ...this.defaultCard() },
      { id: 4, word: 'эксперимент', translation: 'experiment', type: 'word', galaxy: 'Кругозор', subtopic: 'Наука', ...this.defaultCard() },
      { id: 5, word: 'пьеса', translation: 'play (theater)', type: 'word', galaxy: 'Кругозор', subtopic: 'Искусство', ...this.defaultCard() },
      { id: 6, word: 'палитра', translation: 'palette', type: 'word', galaxy: 'Кругозор', subtopic: 'Искусство', ...this.defaultCard() },
      { id: 7, word: 'мыслитель', translation: 'thinker', type: 'word', galaxy: 'Кругозор', subtopic: 'Философия', ...this.defaultCard() },
      { id: 8, word: 'вопрос бытия', translation: 'question of being', type: 'expression', galaxy: 'Кругозор', subtopic: 'Философия', ...this.defaultCard() },
      { id: 9, word: 'инновация', translation: 'innovation', type: 'word', galaxy: 'Кругозор', subtopic: 'Технологии', ...this.defaultCard() },
      { id: 10, word: 'искусственный интеллект', translation: 'artificial intelligence', type: 'expression', galaxy: 'Кругозор', subtopic: 'Технологии', ...this.defaultCard() },
      { id: 11, word: 'наследие', translation: 'heritage', type: 'word', galaxy: 'Кругозор', subtopic: 'Культура', ...this.defaultCard() },
      { id: 12, word: 'традиции народа', translation: 'folk traditions', type: 'expression', galaxy: 'Кругозор', subtopic: 'Культура', ...this.defaultCard() },

      // СОЦИАЛЬНЫЕ СВЯЗИ
      { id: 13, word: 'мама', translation: 'mom', type: 'word', galaxy: 'Социальные связи', subtopic: 'Семья', ...this.defaultCard() },
      { id: 14, word: 'брат', translation: 'brother', type: 'word', galaxy: 'Социальные связи', subtopic: 'Семья', ...this.defaultCard() },
      { id: 15, word: 'лучший друг', translation: 'best friend', type: 'expression', galaxy: 'Социальные связи', subtopic: 'Друзья', ...this.defaultCard() },
      { id: 16, word: 'дружить', translation: 'be friends', type: 'word', galaxy: 'Социальные связи', subtopic: 'Друзья', ...this.defaultCard() },
      { id: 17, word: 'начальник', translation: 'boss', type: 'word', galaxy: 'Социальные связи', subtopic: 'Работа', ...this.defaultCard() },
      { id: 18, word: 'рабочий процесс', translation: 'workflow', type: 'expression', galaxy: 'Социальные связи', subtopic: 'Работа', ...this.defaultCard() },
      { id: 19, word: 'поделиться постом', translation: 'share a post', type: 'expression', galaxy: 'Социальные связи', subtopic: 'Социальные сети', ...this.defaultCard() },
      { id: 20, word: 'подписчик', translation: 'follower', type: 'word', galaxy: 'Социальные связи', subtopic: 'Социальные сети', ...this.defaultCard() },
      { id: 21, word: 'вести диалог', translation: 'have a dialogue', type: 'expression', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 31, word: 'контакт', translation: 'contact', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 32, word: 'диалог', translation: 'dialogue', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 33, word: 'общение', translation: 'communication', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 34, word: 'разговор', translation: 'conversation', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 35, word: 'вопрос', translation: 'question', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 36, word: 'ответ', translation: 'answer', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 37, word: 'обсуждение', translation: 'discussion', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 38, word: 'высказывание', translation: 'statement', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 39, word: 'недопонимание', translation: 'misunderstanding', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 40, word: 'аргумент', translation: 'argument', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 41, word: 'мнение', translation: 'opinion', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },
      { id: 42, word: 'переписка', translation: 'correspondence', type: 'word', galaxy: 'Социальные связи', subtopic: 'Коммуникация', ...this.defaultCard() },

      // РАБОТА И КАРЬЕРА
      { id: 23, word: 'вакансия', translation: 'job opening', type: 'word', galaxy: 'Работа и карьера', subtopic: 'Вакансии', ...this.defaultCard() },
      { id: 24, word: 'резюме', translation: 'resume', type: 'word', galaxy: 'Работа и карьера', subtopic: 'Вакансии', ...this.defaultCard() },
      { id: 25, word: 'коммуникабельность', translation: 'communication skills', type: 'word', galaxy: 'Работа и карьера', subtopic: 'Навыки', ...this.defaultCard() },
      { id: 26, word: 'решать задачи', translation: 'solve tasks', type: 'expression', galaxy: 'Работа и карьера', subtopic: 'Навыки', ...this.defaultCard() },
      { id: 27, word: 'описание опыта', translation: 'experience description', type: 'expression', galaxy: 'Работа и карьера', subtopic: 'Резюме', ...this.defaultCard() },
      { id: 28, word: 'образование', translation: 'education', type: 'word', galaxy: 'Работа и карьера', subtopic: 'Резюме', ...this.defaultCard() },
      { id: 29, word: 'вопрос на собеседовании', translation: 'interview question', type: 'expression', galaxy: 'Работа и карьера', subtopic: 'Собеседование', ...this.defaultCard() },
      { id: 30, word: 'работодатель', translation: 'employer', type: 'word', galaxy: 'Работа и карьера', subtopic: 'Собеседование', ...this.defaultCard() }
    ];

    const enrichedItems = rawItems.map(item => ({
      ...item,
      type: item.type,
      userInput: '',
      flipped: false,
      hintVisible: true,
      isCorrect: null,
      hintIndex: 0,
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
      createdAt: Date.now()
    };
  }


  // Метод добавления слова или выражения
  addItem(): void {
    if (this.newWord.trim()) {
      const newCard: WordCard = {
        id: Date.now(),
        createdAt: Date.now(),
        word: this.newWord.trim(),
        translation: this.newTranslation.trim() || '...', // Перевод не обязателен сразу
        userInput: '',
        flipped: false,
        hintVisible: true,
        isCorrect: null,
        hintIndex: 0,
        showTranslation: false,
        type: this.newWordType,
        galaxy: this.currentGalaxy,     // <= добавь эту переменную
        subtopic: this.currentSubtopic
      };

      if (this.newWordType === 'word') {
        this.words.unshift(newCard);
      } else {
        this.expressions.unshift(newCard);
      }
      this.saveToLocalStorage();

      // Очистка полей ввода
      this.newWord = '';
      this.newTranslation = '';
    }
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
    card.flipped = !card.flipped;
    card.hintVisible = false; // Скрываем подсказку после первого переворота
  }

  // Проверка перевода
  checkTranslation(card: WordCard): void {
    if (card.userInput.trim().toLowerCase() === card.translation.toLowerCase()) {
      card.isCorrect = true;

      // ⏱ Через 1 секунду убрать галочку и показать перевод
      setTimeout(() => {
        card.showTranslation = true;
        card.isCorrect = null;
      }, 1000);

    } else {
      card.isCorrect = false;
    }
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
        filtered = relevantItems.filter(card => !card.translation || card.translation === '...');
        break;
      case 'hardest':
        filtered = relevantItems.sort((a, b) => (a.isCorrect === false ? -1 : 1));
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
    const full = card.translation;
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
    if ((card.hintIndex ?? 0) < card.translation.length - 1) {
      card.hintIndex = (card.hintIndex ?? 0) + 1;
    } else {
      card.showTranslation = true;
    }
  }

  showFullTranslation(card: WordCard): void {
    card.showTranslation = true;
  }

  ///////////////////////////////////////////обработка слов

  markAsLearned(card: WordCard): void {
    card.status = 'learned';
    this.saveToLocalStorage();
  }

  markForRepetition(card: WordCard): void {
    card.status = 'repeat';
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


}
