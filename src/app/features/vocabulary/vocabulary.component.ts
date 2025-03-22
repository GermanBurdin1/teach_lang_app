import { Component, OnInit } from '@angular/core';

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
}


@Component({
  selector: 'app-vocabulary',
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.css'],
})
export class VocabularyComponent implements OnInit {
  words: WordCard[] = [];
  expressions: WordCard[] = [];
  newWord: string = '';
  newTranslation: string = '';
  showHint: boolean = true; // Подсказка "Кликни, чтобы увидеть перевод"
  sortBy: string = 'date'; // По умолчанию сортируем по дате
  newWordType: 'word' | 'expression' = 'word';
  // Переменная для управления отображением формы ввода
showInputFields: boolean = false;

  ngOnInit(): void {
    this.loadWords();
  }

  // Загрузка карточек (пока что просто статичный массив)
  loadWords(): void {
    const rawItems = [
      { id: 1, word: 'сериал', translation: 'series', type: 'word' },
      { id: 2, word: 'книга', translation: 'book', type: 'word' },
      { id: 3, word: 'персонаж', translation: 'character', type: 'word' },
      { id: 4, word: 'держать в курсе', translation: 'keep updated', type: 'expression' },
      { id: 5, word: 'выходить из себя', translation: 'lose temper', type: 'expression' }
    ];

    const enrichedItems = rawItems.map(item => ({
      ...item,
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
        word: this.newWord.trim(),
        translation: this.newTranslation.trim() || '...', // Перевод не обязателен сразу
        userInput: '',
        flipped: false,
        hintVisible: true,
        isCorrect: null
      };

      if (this.newWordType === 'word') {
        this.words.unshift(newCard);
      } else {
        this.expressions.unshift(newCard);
      }

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
    } else {
      card.isCorrect = false;
    }
  }

  // Сортировка карточек
  sortWords(): void {
    if (this.sortBy === 'date') {
      this.words.sort((a, b) => b.id - a.id);
    } else if (this.sortBy === 'hardest') {
      this.words.sort((a, b) => (a.isCorrect === false ? -1 : 1));
    }
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

}
