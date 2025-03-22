import { Component, OnInit } from '@angular/core';

interface WordCard {
  id: number;
  word: string;
  translation: string;
  userInput: string;
  flipped: boolean;
  hintVisible: boolean;
  isCorrect: boolean | null;
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
    const allItems = [
      { id: 1, word: 'сериал', translation: 'series', type: 'word', userInput: '', flipped: false, hintVisible: true, isCorrect: null },
      { id: 2, word: 'книга', translation: 'book', type: 'word', userInput: '', flipped: false, hintVisible: true, isCorrect: null },
      { id: 3, word: 'персонаж', translation: 'character', type: 'word', userInput: '', flipped: false, hintVisible: true, isCorrect: null },
      { id: 4, word: 'держать в курсе', translation: 'keep updated', type: 'expression', userInput: '', flipped: false, hintVisible: true, isCorrect: null },
      { id: 5, word: 'выходить из себя', translation: 'lose temper', type: 'expression', userInput: '', flipped: false, hintVisible: true, isCorrect: null },
    ];

    this.words = allItems.filter(item => item.type === 'word');
    this.expressions = allItems.filter(item => item.type === 'expression');
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
}
