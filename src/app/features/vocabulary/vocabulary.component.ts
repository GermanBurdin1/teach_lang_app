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
  sortBy: string = 'date'; // По умолчанию сортируем по дате
  newWordType: 'word' | 'expression' = 'word';
  // Переменная для управления отображением формы ввода
  showInputFields: boolean = false;
  wordsPerPage = 10;
  expressionsPerPage = 10;

  currentWordsPage = 1;
  currentExpressionsPage = 1;

  viewMode: 'cards' | 'list' = 'cards'; // по умолчанию карточки


  constructor(private route: ActivatedRoute) {}
  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.currentGalaxy = params.get('galaxy') || '';
      this.currentSubtopic = params.get('subtopic') || '';
    });
    const stored = this.loadFromLocalStorage();
    if (stored) {
      this.words = stored.filter(item => item.type === 'word');
      this.expressions = stored.filter(item => item.type === 'expression');
    } else {
      this.loadWords(); // если данных нет, загрузи стартовые
    }
  }

  // Загрузка карточек (пока что просто статичный массив)
  loadWords(): void {
    const rawItems: WordCard[] = [
      {
        id: 1,
        word: 'сериал',
        translation: 'series',
        type: 'word',
        userInput: '',
        flipped: false,
        hintVisible: true,
        isCorrect: null,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5,
        galaxy: 'Кругозор',
        subtopic: 'Искусство'
      },
      {
        id: 2,
        word: 'книга',
        translation: 'book',
        type: 'word',
        userInput: '',
        flipped: false,
        hintVisible: true,
        isCorrect: null,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
        galaxy: 'Кругозор',
        subtopic: 'Наука'
      },
      {
        id: 3,
        word: 'персонаж',
        translation: 'character',
        type: 'word',
        userInput: '',
        flipped: false,
        hintVisible: true,
        isCorrect: null,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
        galaxy: 'Кругозор',
        subtopic: 'Искусство'
      },
      {
        id: 4,
        word: 'держать в курсе',
        translation: 'keep updated',
        type: 'expression',
        userInput: '',
        flipped: false,
        hintVisible: true,
        isCorrect: null,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
        galaxy: 'Социальные связи',
        subtopic: 'Коммуникация'
      },
      {
        id: 5,
        word: 'выходить из себя',
        translation: 'lose temper',
        type: 'expression',
        userInput: '',
        flipped: false,
        hintVisible: true,
        isCorrect: null,
        createdAt: Date.now(),
        galaxy: 'Социальные связи',
        subtopic: 'Семья'
      }
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

    this.words = enrichedItems.filter(item => item.type === 'word');
    this.expressions = enrichedItems.filter(item => item.type === 'expression');
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
  setWordType(type: 'word' | 'expression'): void {
    this.newWordType = type;
    this.showInputFields = true; // Показываем инпуты
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
    const allItems = this.getAllItems(); // получить изначальный список

    let filtered = allItems;

    if (this.sortBy === 'repeat') {
      filtered = allItems.filter(card => card.status === 'repeat');
    } else if (this.sortBy === 'learned') {
      filtered = allItems.filter(card => card.status === 'learned');
    } else if (this.sortBy === 'hardest') {
      filtered = allItems.sort((a, b) => (a.isCorrect === false ? -1 : 1));
    } else if (this.sortBy === 'date') {
      filtered = allItems.sort((a, b) => b.id - a.id);
    }

    // Разбиваем отфильтрованные обратно по категориям
    this.words = filtered.filter(card => card.type === 'word');
    this.expressions = filtered.filter(card => card.type === 'expression');
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

  saveToLocalStorage(): void {
    const allItems = [...this.words, ...this.expressions];
    localStorage.setItem('vocabulary_cards', JSON.stringify(allItems));
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


}
