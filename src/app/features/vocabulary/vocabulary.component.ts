import { Component, Input, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LexiconService } from '../../services/lexicon.service';
import { TranslationService } from '../../services/translation.service';
import * as Grammar from './models/grammar-data.model';
import { GrammarData } from './models/grammar-data.model';
import { AddWordDialogComponent, AddWordDialogData, AddWordDialogResult } from './add-word-dialog.component';

interface VocabularyItem {
  id?: string;
  word: string;
  translation: string;
  createdAt: number;
  [key: string]: unknown;
}

interface ConfettiWindow extends Window {
  confetti?: (options: {
    particleCount: number;
    spread: number;
    origin: { y: number };
  }) => void;
}

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
  showHint: boolean = true; // Astuce "Clique pour voir la traduction"
  sortBy: string = 'all';
  sortOrderWords: 'asc' | 'desc' = 'desc';
  sortOrderExpressions: 'asc' | 'desc' = 'desc';
  sortByLang: boolean = false;
  newWordType: 'word' | 'expression' = 'word';
  // Variable pour contrôler l'affichage du formulaire de saisie
  showInputFields: boolean = false;
  wordsPerPage = 10;
  expressionsPerPage = 10;
  currentWordsPage = 1;
  currentExpressionsPage = 1;
  viewMode: 'cards' | 'list' = 'cards'; // cartes par défaut
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
  showGrammarModal: boolean = false;
  grammarModalCard: WordCard | null = null;
  newGrammarData: Grammar.GrammarData | null = null;
  newTranslationGrammar: Grammar.GrammarData | null = null;
  showTranslationInputForm: boolean = false;


  constructor(
    private route: ActivatedRoute, 
    private lexiconService: LexiconService, 
    private translationService: TranslationService,
    private dialog: MatDialog,
    private title: Title,
    private meta: Meta
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.currentGalaxy = params.get('galaxy') || '';
      this.currentSubtopic = params.get('subtopic') || '';

      console.log('📌 Galaxy from route:', this.currentGalaxy);
      console.log('📌 Subtopic from route:', this.currentSubtopic);
      
      this.updateSEOTags();

      // 🔁 Essai de chargement depuis le backend
      this.lexiconService.getWordsByGalaxyAndSubtopic(this.currentGalaxy, this.currentSubtopic)
        .subscribe({

          next: (data) => {
            console.log('📦 Données du backend:', data);
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
                grammar: card.grammar ?? undefined,
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
            // ✅ Sauvegarde de secours
            this.saveToLocalStorage(enriched);

            console.log('✅ Cartes chargées depuis le backend:', enriched);
          },
          error: (err) => {
            console.error('❌ Erreur lors du chargement depuis le backend. Tentative localStorage:', err);

            const updated = this.loadFromLocalStorage();
            if (!updated) return;

            const relevant = updated.filter(
              item => item.galaxy === this.currentGalaxy && item.subtopic === this.currentSubtopic
            );
            this.words = relevant.filter(item => item.type === 'word');
            this.expressions = relevant.filter(item => item.type === 'expression');

            console.log('✅ Chargé depuis localStorage:', relevant);
          }
        });
    });
  }

  getNounGrammar(card: WordCard) {
    return card.grammar?.partOfSpeech === 'noun' ? card.grammar as Grammar.NounGrammar : null;
  }

  getVerbGrammar(card: WordCard) {
    return card.grammar?.partOfSpeech === 'verb' ? card.grammar as Grammar.VerbGrammar : null;
  }

  getAdjectiveGrammar(card: WordCard): Grammar.AdjectiveGrammar | null {
    return card.grammar?.partOfSpeech === 'adjective' ? card.grammar as Grammar.AdjectiveGrammar : null;
  }

  getAdverbGrammar(card: WordCard): Grammar.AdverbGrammar | null {
    return card.grammar?.partOfSpeech === 'adverb' ? card.grammar as Grammar.AdverbGrammar : null;
  }

  getPronounGrammar(card: WordCard): Grammar.PronounGrammar | null {
    return card.grammar?.partOfSpeech === 'pronoun' ? card.grammar as Grammar.PronounGrammar : null;
  }

  getConjunctionGrammar(card: WordCard): Grammar.ConjunctionGrammar | null {
    return card.grammar?.partOfSpeech === 'conjunction' ? card.grammar as Grammar.ConjunctionGrammar : null;
  }

  getInterjectionGrammar(card: WordCard): Grammar.InterjectionGrammar | null {
    return card.grammar?.partOfSpeech === 'interjection' ? card.grammar as Grammar.InterjectionGrammar : null;
  }

  getExpressionGrammar(card: WordCard): Grammar.ExpressionGrammar | null {
    return card.grammar?.partOfSpeech === 'expression' ? card.grammar as Grammar.ExpressionGrammar : null;
  }

  // Chargement des cartes (pour l'instant juste un tableau statique)
  loadWords(): void {
    const rawItems: WordCard[] = [
      // CULTURE GÉNÉRALE
      { id: 1, word: 'révolution', translations: [{ target: 'revolution' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Histoire', ...this.defaultCard() },
      { id: 2, word: 'empire', translations: [{ target: 'empire' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Histoire', ...this.defaultCard() },
      { id: 3, word: 'atome', translations: [{ target: 'atom' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Science', ...this.defaultCard() },
      { id: 4, word: 'expérience', translations: [{ target: 'experiment' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Science', ...this.defaultCard() },
      { id: 5, word: 'pièce', translations: [{ target: 'play (theater)' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Art', ...this.defaultCard() },
      { id: 6, word: 'palette', translations: [{ target: 'palette' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Art', ...this.defaultCard() },
      { id: 7, word: 'penseur', translations: [{ target: 'thinker' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Philosophie', ...this.defaultCard() },
      { id: 8, word: 'question de l\'être', translations: [{ target: 'question of being' }], type: 'expression', galaxy: 'Culture générale', subtopic: 'Philosophie', ...this.defaultCard() },
      { id: 9, word: 'innovation', translations: [{ target: 'innovation' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Technologies', ...this.defaultCard() },
      { id: 10, word: 'intelligence artificielle', translations: [{ target: 'artificial intelligence' }], type: 'expression', galaxy: 'Culture générale', subtopic: 'Technologies', ...this.defaultCard() },
      { id: 11, word: 'héritage', translations: [{ target: 'heritage' }], type: 'word', galaxy: 'Culture générale', subtopic: 'Culture', ...this.defaultCard() },
      { id: 12, word: 'traditions populaires', translations: [{ target: 'folk traditions' }], type: 'expression', galaxy: 'Culture générale', subtopic: 'Culture', ...this.defaultCard() },

      // LIENS SOCIAUX
      { id: 13, word: 'maman', translations: [{ target: 'mom' }], type: 'word', galaxy: 'Liens sociaux', subtopic: 'Famille', ...this.defaultCard() },
      { id: 14, word: 'frère', translations: [{ target: 'brother' }], type: 'word', galaxy: 'Liens sociaux', subtopic: 'Famille', ...this.defaultCard() },
      { id: 15, word: 'meilleur ami', translations: [{ target: 'best friend' }], type: 'expression', galaxy: 'Liens sociaux', subtopic: 'Amis', ...this.defaultCard() },
      { id: 16, word: 'être ami', translations: [{ target: 'be friends' }], type: 'word', galaxy: 'Liens sociaux', subtopic: 'Amis', ...this.defaultCard() },
      { id: 17, word: 'patron', translations: [{ target: 'boss' }], type: 'word', galaxy: 'Liens sociaux', subtopic: 'Travail', ...this.defaultCard() },
      { id: 18, word: 'processus de travail', translations: [{ target: 'workflow' }], type: 'expression', galaxy: 'Liens sociaux', subtopic: 'Travail', ...this.defaultCard() },
      { id: 19, word: 'partager un post', translations: [{ target: 'share a post' }], type: 'expression', galaxy: 'Liens sociaux', subtopic: 'Réseaux sociaux', ...this.defaultCard() },
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
    const hasManualTranslation = this.isManualTranslation && this.newTranslation.trim().length > 0;

    const translations = this.newTranslation.trim()
      ? [{
        id: 0, // временный id для локальной работы
        source: this.newWord.trim(),
        target: this.newTranslation.trim(),
        sourceLang: this.sourceLang,
        targetLang: this.targetLang,
        meaning: '',
        example: null
      }]
      : [];

    const newCard: WordCard = {
      id: 0,
      createdAt: Date.now(),
      word: this.newWord.trim(),
      translations: translations.length > 0 ? [{ target: this.newTranslation.trim() }] : [],
      userInput: '',
      flipped: false,
      hintVisible: true,
      isCorrect: null,
      hintIndex: 0,
      showTranslation: hasManualTranslation,
      status: null,
      type: this.newWordType,
      galaxy: this.currentGalaxy,
      subtopic: this.currentSubtopic,
      grammar: this.newGrammarData ?? undefined,
    };

    console.log('📚 Грамматика, которую отправляем в БД (ручной ввод):', this.newGrammarData);
    console.log('🧠 Перевод введён вручную:', hasManualTranslation);

    // Пытаемся отправить на backend
    this.lexiconService.addWord({
      word: newCard.word,
      translations: newCard.translations.map(t => ({
        id: 0, // временно 0
        lexiconId: 0, // временно 0
        source: newCard.word,
        target: t.target,
        sourceLang: this.sourceLang,
        targetLang: this.targetLang,
        meaning: '',
        example: t.examples?.[0] || null
      })),
      galaxy: newCard.galaxy!,
      subtopic: newCard.subtopic!,
      type: newCard.type,
      grammar: this.newGrammarData ?? undefined
    }).subscribe({
      next: (res) => {
        console.log('✅ Слово добавлено в БД:', res);
        newCard.id = (res as {id?: number}).id || 0;
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

    // Очистка полей больше не нужна - используется Material Dialog
    // this.newWord = '';
    // this.newTranslation = '';
    // this.newGrammarData = null;

  }

  updateGrammar(cardId: number, grammar: GrammarData): void {
    this.lexiconService.updateGrammar(cardId, grammar).subscribe({
      next: () => {
        console.log(`✅ Грамматика обновлена в БД для id=${cardId}:`, grammar);
        const all = [...this.words, ...this.expressions];
        const target = all.find(card => card.id === cardId);
        if (target) {
          target.grammar = grammar;
          this.saveToLocalStorage();
        }

        // ➡️ Закрываем увеличение карточки
        this.enlargedCardId = null;

        // ➡️ Закрываем все открытые модалки
        this.resetModals();

        // ➡️ Показываем фейерверк 🎉
        this.showConfetti();
      },
      error: (err) => console.error(`❌ Ошибка при обновлении грамматики для id=${cardId}:`, err)
    });
  }

  // Удаление карточки
  deleteWord(id: number): void {
    this.words = this.words.filter(word => word.id !== id);
  }

  deleteItem(id: number, type: 'word' | 'expression'): void {
    this.lexiconService.deleteWord(id).subscribe({
      next: () => {
        if (type === 'word') {
          this.words = this.words.filter(word => word.id !== id);
        } else {
          this.expressions = this.expressions.filter(expression => expression.id !== id);
        }
        this.saveToLocalStorage();
        console.log(`✅ Карточка удалена и на сервере, и на фронте, id=${id}`);
      },
      error: (err) => {
        console.error('❌ Ошибка при удалении карточки на сервере:', err);
      }
    });
  }


  // Выбор типа карточки (слово/выражение) — открывает Material Dialog
  openAddCardModal(type: 'word' | 'expression'): void {
    const dialogData: AddWordDialogData = {
      type: type,
      currentGalaxy: this.currentGalaxy,
      currentSubtopic: this.currentSubtopic
    };

    const dialogRef = this.dialog.open(AddWordDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: dialogData,
      disableClose: false,
      autoFocus: true,
      panelClass: 'custom-dialog-container'
    });

    dialogRef.afterClosed().subscribe((result: AddWordDialogResult) => {
      if (result) {
        this.handleDialogResult(result);
      }
    });
  }

  private handleDialogResult(result: AddWordDialogResult): void {
    const translations = result.translation.trim()
      ? [{
        id: 0, // временный id для локальной работы
        target: result.translation.trim(),
        examples: []
      }]
      : [];

    const newCard: WordCard = {
      id: 0,
      createdAt: Date.now(),
      word: result.word,
      translations: translations,
      userInput: '',
      flipped: false,
      hintVisible: true,
      isCorrect: null,
      hintIndex: 0,
      showTranslation: result.isManual,
      status: null,
      type: result.type,
      galaxy: this.currentGalaxy,
      subtopic: this.currentSubtopic,
      grammar: result.grammar ?? undefined,
    };

    console.log('📚 Грамматика полученная из диалога:', result.grammar);
    console.log('🧠 Перевод введён вручную:', result.isManual);

    // Пытаемся отправить на backend
    this.lexiconService.addWord({
      word: newCard.word,
      translations: newCard.translations.map(t => ({
        id: 0, // временно 0
        lexiconId: 0, // временно 0
        source: newCard.word,
        target: t.target,
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        meaning: '',
        example: t.examples?.[0] || null
      })),
      galaxy: newCard.galaxy!,
      subtopic: newCard.subtopic!,
      type: newCard.type,
      grammar: result.grammar ?? undefined
    }).subscribe({
      next: (res) => {
        console.log('✅ Слово добавлено в БД:', res);
        newCard.id = (res as {id?: number}).id || 0;
      },
      error: (err) => {
        console.warn('⚠️ Ошибка при отправке в БД. Сохраняем локально:', err);
      }
    });

    // В любом случае сохраняем в localStorage и отображаем в UI
    if (result.type === 'word') {
      this.words.unshift(newCard);
    } else {
      this.expressions.unshift(newCard);
    }

    this.saveToLocalStorage();
  }

  // closeAddCardModal метод больше не нужен - заменён на Material Dialog


  // Переворот карточки
  flipCard(card: WordCard, event?: Event): void {
    // Убираем focus с элемента чтобы не было hover эффекта
    if (event && event.target) {
      (event.target as HTMLElement).blur();
      
      // Добавляем класс для отключения hover на время анимации
      const cardElement = (event.target as HTMLElement).closest('.card');
      if (cardElement) {
        cardElement.classList.add('flipping');
        
        // Убираем класс через время анимации
        setTimeout(() => {
          cardElement.classList.remove('flipping');
        }, 600); // 600ms = время transition
      }
    }

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

    if (this.sortByLang) {
      this.words = this.words.sort((a, b) =>
        a.word.localeCompare(b.word, this.sourceLang === 'fr' ? 'fr' : this.sourceLang === 'ru' ? 'ru' : 'en')
      );
      this.expressions = this.expressions.sort((a, b) =>
        a.word.localeCompare(b.word, this.sourceLang === 'fr' ? 'fr' : this.sourceLang === 'ru' ? 'ru' : 'en')
      );
      return;
    }
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
    return parsed.map((item: VocabularyItem) => ({
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
    return `Cartes: ${start}–${end} sur ${this.totalWords}`;
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
    return `Expressions: ${start}–${end} sur ${total}`;
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
    this.manualTranslation = ' ';
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
          this.editingCard!.showTranslation = true;
          this.editingCard!.hintVisible = false;
          this.editingCard!.status = null;
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
      const confirmed = window.confirm(
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
          if (res.grammar) {
            this.newGrammarData = res.grammar;
          };
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
            type: newCard.type,
            grammar: this.newGrammarData ?? undefined
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
          // Очистка полей больше не нужна - используется Material Dialog
          // this.newWord = '';
          // this.newTranslation = '';
          // модалка закрывается автоматически в Material Dialog
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
      (window as ConfettiWindow).confetti?.({
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

      // если нет грамматики — добавим дефолтную
      if (!this.newGrammarData && this.newWordType === 'word') {
        this.onPartOfSpeechChange('noun'); // или другой дефолт
      }
    } else {
      this.isManualTranslation = false;
      this.newGrammarData = null;
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
    this.showGrammarModal = false;
    this.grammarModalCard = null;
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
    console.log('🔍 Agrandissement de la carte:', {
      cardId: card.id,
      cardType: card.type,
      cardWord: card.word,
      hasGrammar: !!card.grammar
    });
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

  openGrammarModal(card: WordCard): void {
    console.log('🚀 Ouverture de la modalka de grammaire pour:', {
      cardType: card.type,
      cardWord: card.word,
      hasGrammar: !!card.grammar
    });
    
    this.ensureCardGrammar(card);
    this.grammarModalCard = card;
    this.showGrammarModal = true;
  }

  closeGrammarModal(): void {
    console.log('❌ Fermeture de la modalka de grammaire');
    this.showGrammarModal = false;
    this.grammarModalCard = null;
  }

  // Méthodes pour test du thème global
  toggleTheme(): void {
    const isDarkTheme = document.body.classList.contains('dark-theme');
    if (isDarkTheme) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
      console.log('🌞 Basculé vers Light theme');
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
      console.log('🌙 Basculé vers Dark theme');
    }
  }

  get isDarkTheme(): boolean {
    return document.body.classList.contains('dark-theme');
  }

  closeExtraTranslationModal(): void {
    console.log('❌ Fermeture de la modale de traduction supplémentaire');
    this.showExtraTranslationModal = false;
    this.newTranslation = '';
  }

  addExtraTranslation(): void {
    if (!this.newTranslation.trim() || !this.editingCard) {
      console.warn('⚠️ Pas de traduction à ajouter ou aucune carte sélectionnée');
      return;
    }

    console.log('➕ Ajout d\'une nouvelle traduction:', this.newTranslation.trim());
    
    // Créer une nouvelle traduction pour la carte sélectionnée
    this.editingCard.translations.push({
      target: this.newTranslation.trim()
    });
    
    console.log('✅ Traduction ajoutée à la carte');
    this.saveToLocalStorage();

    this.newTranslation = '';
    this.showExtraTranslationModal = false;
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

  onGrammarValidate(card: WordCard): void {
    console.log("вызов метода")
    if (card.grammar) {
      this.updateGrammar(card.id, card.grammar);
    } else {
      console.warn('❗ Грамматика не указана. Нечего отправлять.');
    }
  }

  ensureCardGrammar(card: WordCard): void {
    console.log('📝 Vérification de la grammaire pour la carte:', {
      cardType: card.type,
      cardWord: card.word,
      hasGrammar: !!card.grammar
    });
    if (!card.grammar) {
      card.grammar = { partOfSpeech: '' as Grammar.PartOfSpeech };
      console.log('➕ Grammaire ajoutée pour la carte');
    }
  }

  getGrammarBadge(grammar: GrammarData): string {
    const parts: string[] = [];

    switch (grammar.partOfSpeech) {
      case 'noun': {
        parts.push('n.');
        const gender = (grammar as Grammar.NounGrammar).gender;
        if (gender === 'masculine') parts.push('m.');
        if (gender === 'feminine') parts.push('f.');
        const number = (grammar as Grammar.NounGrammar).number;
        if (number === 'singular') parts.push('sg.');
        if (number === 'plural') parts.push('pl.');
        break;
      }
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

  onTranslationInputChange(): void {
    if (this.newTranslation.trim()) {
      if (this.newWordType === 'word') {
        this.newGrammarData = { partOfSpeech: 'noun' };
      } else if (this.newWordType === 'expression') {
        this.newGrammarData = {
          partOfSpeech: 'expression',
          expressionType: 'other' // или 'выражение'
        };
      }
    } else {
      this.newGrammarData = null;
    }
  }

  //добавление значений
  showAddMeaningModal = false;
  selectedCard: WordCard | null = null;

  newMeaningWord = '';
  newMeaningGalaxy = '';
  newMeaningSubtopic = '';

  availableGalaxies: string[] = [
    'Galaxie de la Technologie', 
    'Galaxie de l\'Art', 
    'Galaxie de la Science',
    'Galaxie du Sport',
    'Galaxie de la Cuisine',
    'Galaxie de l\'Éducation',
    'Galaxie des Voyages',
    'Galaxie de la Musique'
  ];
  availableSubtopics: string[] = []; // подтемы выбранной галактики


  openAddMeaningModal(card: WordCard) {
    this.selectedCard = card;
    this.newMeaningWord = card.word; // ← текст слова оставляем тем же
    this.showAddMeaningModal = true;
  }

  cancelAddMeaning() {
    this.showAddMeaningModal = false;
    this.selectedCard = null;
    this.newMeaningWord = '';
    this.newMeaningGalaxy = '';
    this.newMeaningSubtopic = '';
  }

  onMeaningGalaxyChange() {
    // при смене галактики — обновить список подтем
    this.availableSubtopics = this.getSubtopicsForGalaxy(this.newMeaningGalaxy);
    this.newMeaningSubtopic = ''; // Réinitialiser le sous-thème sélectionné
  }

  getSubtopicsForGalaxy(galaxy: string): string[] {
    const subtopicsMap: { [key: string]: string[] } = {
      'Galaxie de la Technologie': ['Applications', 'Intelligence Artificielle', 'Réseaux', 'Programmation', 'Hardware'],
      'Galaxie de l\'Art': ['Peinture', 'Sculpture', 'Photographie', 'Design', 'Architecture'],
      'Galaxie de la Science': ['Physique', 'Chimie', 'Biologie', 'Astronomie', 'Mathématiques'],
      'Galaxie du Sport': ['Football', 'Tennis', 'Natation', 'Athlétisme', 'Sports d\'hiver'],
      'Galaxie de la Cuisine': ['Recettes', 'Techniques', 'Ingrédients', 'Cuisines du monde', 'Pâtisserie'],
      'Galaxie de l\'Éducation': ['Méthodes', 'Disciplines', 'Évaluation', 'Technologies éducatives', 'Psychologie'],
      'Galaxie des Voyages': ['Destinations', 'Transport', 'Hébergement', 'Culture locale', 'Aventure'],
      'Galaxie de la Musique': ['Instruments', 'Genres', 'Théorie musicale', 'Compositeurs', 'Production']
    };

    return subtopicsMap[galaxy] || [];
  }

  saveNewMeaning() {
    if (!this.selectedCard || !this.newMeaningGalaxy || !this.newMeaningSubtopic) {
      alert('Заполните все поля');
      return;
    }

    this.lexiconService.addWord({
      word: this.newMeaningWord,
      galaxy: this.newMeaningGalaxy,
      subtopic: this.newMeaningSubtopic,
      type: this.selectedCard.type, // слово или выражение
      grammar: this.selectedCard.grammar // можно также копировать грамматику
    }).subscribe({
      next: (res) => {
        console.log('✅ Новое значение добавлено:', res);
        this.showAddMeaningModal = false;
        this.selectedCard = null;
        this.newMeaningWord = '';
        this.newMeaningGalaxy = '';
        this.newMeaningSubtopic = '';
      },
      error: (err) => {
        console.error('❌ Ошибка при добавлении значения:', err);
      }
    });
  }

  private updateSEOTags(): void {
    const pageTitle = `Dictionnaire Français - ${this.currentSubtopic} | LINGUACONNECT`;
    const pageDescription = `Apprenez le vocabulaire français avec ${this.currentSubtopic}. Dictionnaire interactif pour étudiants DELF/DALF avec traductions et exercices.`;
    
    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }

}
