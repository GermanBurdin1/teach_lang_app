import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { API_ENDPOINTS } from '../../core/constants/api.constants';

interface GrammarCategory {
  id: string;
  title: string;
  icon: string;
  children?: GrammarCategory[];
  topicId?: string; // ID темы из базы данных для загрузки pattern cards
}

interface PatternCard {
  id: string;
  pattern: string;
  example: string;
  blanks: any[];
  variations: any[] | null;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  category: string | null;
  explanation: string | null;
  tags: string[] | null;
  topicId: string | null;
  visibility: 'public' | 'students' | 'private';
  constructorTitle?: string;
  constructorUserId?: string;
  authorName?: string;
}

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule],
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent implements OnInit, OnDestroy {
  activeTrainingTab = 'audio';
  expandedCategories: Set<string> = new Set();
  selectedPartOfSpeech: GrammarCategory | null = null;
  patternCards: PatternCard[] = [];
  filteredPatternCards: PatternCard[] = [];
  loadingPatternCards = false;
  selectedDifficulty: 'all' | 'beginner' | 'intermediate' | 'advanced' = 'all';
  showPatternCardsList = false;

  // Speed Challenge / Quick Quiz state
  isSpeedChallengeActive = false;
  speedChallengeCards: PatternCard[] = [];
  currentQuestionIndex = 0;
  currentQuestion: any = null;
  selectedAnswer: string | null = null;
  showResult = false;
  isCorrect: boolean | null = null;
  score = 0;
  streak = 0;
  combo = 1;
  timeLeft = 15; // секунд на вопрос
  timerInterval: any = null;
  totalQuestions = 10; // количество вопросов в раунде
  correctAnswers = 0;
  wrongAnswers = 0;
  showResultsScreen = false;
  questionResults: Array<{
    questionId: string;
    correct: boolean;
    timeSpent: number;
    points: number;
  }> = [];
  sessionStartTime = 0;

  grammarStructure: GrammarCategory[] = [
    {
      id: 'morphology',
      title: 'Morphologie',
      icon: 'text_fields',
      children: [
        {
          id: 'parts-of-speech',
          title: 'Parties du discours',
          icon: 'menu_book',
          children: [
            {
              id: 'autonomous',
              title: 'Autonomes',
              icon: 'star',
              children: [
                { id: 'noun', title: 'Nom (substantif)', icon: 'label' },
                { id: 'adjective', title: 'Adjectif', icon: 'description' },
                { id: 'verb', title: 'Verbe', icon: 'flash_on' },
                { id: 'adverb', title: 'Adverbe', icon: 'trending_up' },
                { id: 'pronoun', title: 'Pronom', icon: 'person' },
                { id: 'numeral', title: 'Numéral', icon: 'looks_one' }
              ]
            },
            {
              id: 'auxiliary',
              title: 'Auxiliaires',
              icon: 'support',
              children: [
                { id: 'article', title: 'Article', icon: 'article' },
                { id: 'preposition', title: 'Préposition', icon: 'arrow_forward' },
                { id: 'conjunction', title: 'Conjonction', icon: 'link' },
                { id: 'particle', title: 'Particule', icon: 'adjust' },
                { id: 'interjection', title: 'Interjection', icon: 'mood' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'syntax',
      title: 'Syntaxe',
      icon: 'code',
      children: []
    }
  ];

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    // Очищаем таймер при уничтожении компонента
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  setActiveTrainingTab(tab: string): void {
    this.activeTrainingTab = tab;
    // Сбрасываем выбранную часть речи при переключении вкладок
    if (tab !== 'grammar') {
      this.selectedPartOfSpeech = null;
      this.patternCards = [];
    }
  }

  toggleCategory(categoryId: string): void {
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedCategories.has(categoryId);
  }

  selectPartOfSpeech(partOfSpeech: GrammarCategory): void {
    this.selectedPartOfSpeech = partOfSpeech;
    this.showPatternCardsList = false; // Сначала показываем описание
    if (partOfSpeech.id === 'article') {
      this.loadArticlePatternCards();
    } else {
      // Для других частей речи пока пусто
      this.patternCards = [];
      this.filteredPatternCards = [];
    }
  }

  showPatternCards(): void {
    this.showPatternCardsList = true;
    this.applyDifficultyFilter();
  }

  goBackToStructure(): void {
    this.selectedPartOfSpeech = null;
    this.patternCards = [];
    this.filteredPatternCards = [];
    this.showPatternCardsList = false;
    this.selectedDifficulty = 'all';
    this.stopSpeedChallenge();
  }

  onDifficultyChange(): void {
    this.applyDifficultyFilter();
  }

  applyDifficultyFilter(): void {
    if (this.selectedDifficulty === 'all') {
      this.filteredPatternCards = [...this.patternCards];
    } else {
      this.filteredPatternCards = this.patternCards.filter(
        card => card.difficulty === this.selectedDifficulty
      );
    }
  }

  loadArticlePatternCards(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      return;
    }

    this.loadingPatternCards = true;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Загружаем все pattern cards и фильтруем по теме артиклей
    // Сначала нужно найти topicId для артиклей
    this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections`, { headers }).subscribe({
      next: (sections) => {
        // Ищем секцию "Морфология" и тему "Артикль"
        const morphologySection = sections.find(s => s.title?.toLowerCase().includes('morphologie') || s.name?.toLowerCase().includes('morphologie'));
        if (morphologySection) {
          this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections/${morphologySection.id}/topics`, { headers }).subscribe({
            next: (topics) => {
              // Ищем тему "Артикль" или "Article"
              const articleTopic = topics.find(t => 
                t.title?.toLowerCase().includes('article') || 
                t.title?.toLowerCase().includes('артикль')
              );
              
              if (articleTopic) {
                this.loadPatternCardsByTopic(articleTopic.id, headers);
              } else {
                // Если не нашли по названию, загружаем все публичные pattern cards
                this.loadAllPublicPatternCards(headers);
              }
            },
            error: () => {
              this.loadAllPublicPatternCards(headers);
            }
          });
        } else {
          this.loadAllPublicPatternCards(headers);
        }
      },
      error: () => {
        this.loadAllPublicPatternCards(headers);
      }
    });
  }

  loadPatternCardsByTopic(topicId: string, headers: HttpHeaders): void {
    this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}?type=pattern_card`, { headers }).subscribe({
      next: (constructors: any[]) => {
        const patternCardPromises = constructors.map(constructor => {
          return Promise.all([
            Promise.resolve(constructor),
            this.http.get<any>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructor.id}/pattern-card`, { headers }).toPromise()
          ]);
        });

        Promise.all(patternCardPromises).then(results => {
          this.patternCards = results
            .filter(([constructor, pc]) => pc !== null && pc !== undefined)
            .filter(([constructor, pc]) => pc.topicId === topicId && (pc.visibility === 'public' || pc.visibility === 'students'))
            .map(([constructor, pc]) => ({
              ...pc,
              id: constructor.id,
              pattern: pc.pattern || '',
              example: pc.example || '',
              blanks: pc.blanks || [],
              variations: pc.variations || null,
              difficulty: pc.difficulty || null,
              category: pc.category || null,
              explanation: pc.explanation || null,
              tags: pc.tags || null,
              topicId: pc.topicId || null,
              visibility: pc.visibility || 'public',
              constructorTitle: constructor.title || '',
              constructorUserId: constructor.userId || null,
              authorName: null // Будет загружено позже
            }));
          
          // Загружаем имена авторов
          this.loadAuthorNames();
          this.applyDifficultyFilter();
          this.loadingPatternCards = false;
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des pattern-cards:', error);
        this.loadingPatternCards = false;
      }
    });
  }

  loadAllPublicPatternCards(headers: HttpHeaders): void {
    this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}?type=pattern_card`, { headers }).subscribe({
      next: (constructors: any[]) => {
        const patternCardPromises = constructors.map(constructor => {
          return Promise.all([
            Promise.resolve(constructor),
            this.http.get<any>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructor.id}/pattern-card`, { headers }).toPromise()
          ]);
        });

        Promise.all(patternCardPromises).then(results => {
          // Фильтруем по категории "Articles" или тегам, связанным с артиклями
          this.patternCards = results
            .filter(([constructor, pc]) => pc !== null && pc !== undefined)
            .filter(([constructor, pc]) => {
              const isPublic = pc.visibility === 'public' || pc.visibility === 'students';
              const isArticle = pc.category?.toLowerCase().includes('article') ||
                               pc.tags?.some((tag: string) => tag.toLowerCase().includes('article') || tag.toLowerCase().includes('артикль')) ||
                               constructor.title?.toLowerCase().includes('article') ||
                               constructor.title?.toLowerCase().includes('артикль');
              return isPublic && isArticle;
            })
            .map(([constructor, pc]) => ({
              ...pc,
              id: constructor.id,
              pattern: pc.pattern || '',
              example: pc.example || '',
              blanks: pc.blanks || [],
              variations: pc.variations || null,
              difficulty: pc.difficulty || null,
              category: pc.category || null,
              explanation: pc.explanation || null,
              tags: pc.tags || null,
              topicId: pc.topicId || null,
              visibility: pc.visibility || 'public',
              constructorTitle: constructor.title || '',
              constructorUserId: constructor.userId || null,
              authorName: null // Будет загружено позже
            }));
          
          // Загружаем имена авторов
          this.loadAuthorNames();
          this.applyDifficultyFilter();
          this.loadingPatternCards = false;
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des pattern-cards:', error);
        this.loadingPatternCards = false;
      }
    });
  }

  startExercise(card: PatternCard): void {
    // Запускаем Speed Challenge с одной карточкой или всеми отфильтрованными
    if (this.filteredPatternCards.length > 0) {
      this.startSpeedChallenge(this.filteredPatternCards);
    } else {
      this.startSpeedChallenge([card]);
    }
  }

  startSpeedChallenge(cards: PatternCard[]): void {
    if (!cards || cards.length === 0) {
      console.error('No cards provided for speed challenge');
      return;
    }
    
    // Фильтруем карточки с blanks
    const cardsWithBlanks = cards.filter(card => card.blanks && card.blanks.length > 0);
    
    if (cardsWithBlanks.length === 0) {
      console.error('No cards with blanks found');
      return;
    }
    
    // Перемешиваем карточки и берем первые N
    const cardsToUse = cardsWithBlanks.length > this.totalQuestions 
      ? [...cardsWithBlanks].sort(() => Math.random() - 0.5).slice(0, this.totalQuestions)
      : [...cardsWithBlanks].sort(() => Math.random() - 0.5);
    
    this.speedChallengeCards = cardsToUse;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.combo = 1;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.questionResults = [];
    this.sessionStartTime = Date.now();
    this.isSpeedChallengeActive = true;
    this.showResultsScreen = false;
    this.showPatternCardsList = false; // Скрываем список карточек
    this.loadNextQuestion();
  }

  stopSpeedChallenge(): void {
    this.isSpeedChallengeActive = false;
    this.showResultsScreen = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.showPatternCardsList = true; // Возвращаемся к списку
  }

  getAccuracyPercentage(): number {
    if (this.speedChallengeCards.length === 0) return 0;
    return Math.round((this.correctAnswers / this.speedChallengeCards.length) * 100);
  }

  getPointsForAnswer(): number {
    if (!this.currentQuestion || !this.isCorrect) return 0;
    const speedBonus = Math.floor(this.timeLeft * 10);
    const streakBonus = this.streak > 1 ? (this.streak - 1) * 50 : 0;
    return Math.floor(100 * this.combo + speedBonus + streakBonus);
  }

  saveTrainingSession(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      console.error('No auth token available');
      return;
    }

    const totalTimeSeconds = Math.floor((Date.now() - this.sessionStartTime) / 1000);
    const accuracy = this.getAccuracyPercentage();
    const patternCardIds = this.speedChallengeCards.map(card => card.id);
    
    // Определяем категорию и topicId из первой карточки
    const firstCard = this.speedChallengeCards[0];
    const category = firstCard?.category || (this.selectedPartOfSpeech?.id === 'article' ? 'article' : null);
    const topicId = firstCard?.topicId || null;
    const difficulty = firstCard?.difficulty || null;

    const sessionData = {
      exerciseType: 'speed_challenge',
      topicId: topicId,
      category: category,
      totalQuestions: this.speedChallengeCards.length,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
      score: this.score,
      maxStreak: this.streak,
      accuracy: accuracy,
      totalTimeSeconds: totalTimeSeconds,
      details: {
        patternCardIds: patternCardIds,
        questionResults: this.questionResults,
        difficulty: difficulty
      }
    };

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(`${API_ENDPOINTS.TRAINING}/session`, sessionData, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Training session saved:', response);
      },
      error: (error) => {
        console.error('❌ Error saving training session:', error);
      }
    });
  }

  loadNextQuestion(): void {
    if (this.currentQuestionIndex >= this.speedChallengeCards.length) {
      // Раунд завершен - сохраняем результаты на бекенде
      this.saveTrainingSession();
      this.showResultsScreen = true;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      return;
    }

    const card = this.speedChallengeCards[this.currentQuestionIndex];
    const question = this.generateQuestionFromCard(card);
    
    // Проверяем, что вопрос валидный
    if (!question || !question.options || question.options.length === 0) {
      // Пропускаем эту карточку и переходим к следующей
      this.currentQuestionIndex++;
      this.loadNextQuestion();
      return;
    }
    
    this.currentQuestion = question;
    this.selectedAnswer = null;
    this.showResult = false;
    this.isCorrect = null;
    this.timeLeft = 15;
    
    // Запускаем таймер
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.handleTimeOut();
      }
    }, 1000);
  }

  generateQuestionFromCard(card: PatternCard): any {
    // Генерируем вопрос из pattern card
    const blanks = card.blanks || [];
    
    if (blanks.length === 0) {
      // Если нет blanks, создаем простой вопрос на основе pattern
      return {
        cardId: card.id,
        question: card.pattern,
        correctAnswer: '',
        options: [],
        example: card.example,
        explanation: card.explanation,
        blankId: null
      };
    }
    
    // Ищем blanks связанные с артиклями (приоритет)
    const articleBlanks = blanks.filter(b => 
      b.partOfSpeech?.toLowerCase().includes('article') || 
      b.correctAnswer?.toLowerCase().match(/^(le|la|les|un|une|de|du|des|l'|d')$/i)
    );

    const blank = articleBlanks.length > 0 ? articleBlanks[0] : blanks[0];
    
    // Создаем pattern с пропуском
    let patternWithBlank = card.pattern;
    const placeholder = blank.partOfSpeech ? `[${blank.partOfSpeech}]` : `[BLANK]`;
    patternWithBlank = patternWithBlank.replace(new RegExp(`\\[${blank.partOfSpeech || 'BLANK'}\\]`, 'g'), '_____');
    
    // Генерируем варианты ответов
    const correctAnswer = blank.correctAnswer || '';
    const alternatives = blank.alternatives || [];
    const allOptions = [correctAnswer, ...alternatives].filter(Boolean);
    
    // Если есть options в blank, используем их
    if (blank.options && blank.options.length > 0) {
      const options = [...blank.options].sort(() => Math.random() - 0.5);
      return {
        cardId: card.id,
        question: patternWithBlank,
        correctAnswer: correctAnswer,
        options: options,
        example: card.example,
        explanation: card.explanation || blank.hints?.[0],
        blankId: blank.id
      };
    }
    
    // Для артиклей используем стандартный набор
    const articleOptions = ['le', 'la', 'les', 'un', 'une', 'de', 'du', 'des', "l'", "d'"];
    const wrongOptions = articleOptions.filter(opt => 
      !allOptions.some(correct => correct.toLowerCase() === opt.toLowerCase())
    ).slice(0, 3);
    
    // Если правильный ответ не в списке артиклей, добавляем его в options
    const options = correctAnswer ? 
      [correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5) :
      wrongOptions;
    
    return {
      cardId: card.id,
      question: patternWithBlank,
      correctAnswer: correctAnswer,
      options: options.length > 0 ? options : ['le', 'la', 'les', 'un'],
      example: card.example,
      explanation: card.explanation || blank.hints?.[0],
      blankId: blank.id
    };
  }

  selectAnswer(answer: string): void {
    if (this.showResult) return; // Уже ответили
    
    this.selectedAnswer = answer;
    this.checkAnswer(answer);
  }

  checkAnswer(answer: string): void {
    if (!this.currentQuestion) return;
    
    const timeSpent = 15 - this.timeLeft;
    const isCorrect = answer.toLowerCase() === this.currentQuestion.correctAnswer.toLowerCase();
    this.isCorrect = isCorrect;
    this.showResult = true;
    
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    let points = 0;
    if (isCorrect) {
      this.correctAnswers++;
      this.streak++;
      // Бонус за скорость
      const speedBonus = Math.floor(this.timeLeft * 10);
      const streakBonus = this.streak > 1 ? (this.streak - 1) * 50 : 0;
      points = 100 * this.combo + speedBonus + streakBonus;
      this.score += points;
      
      // Увеличиваем комбо при серии правильных ответов
      if (this.streak >= 3) {
        this.combo = Math.min(this.combo + 0.5, 5); // Максимум x5
      }
    } else {
      this.wrongAnswers++;
      this.streak = 0;
      this.combo = 1; // Сбрасываем комбо
    }
    
    // Сохраняем результат вопроса
    this.questionResults.push({
      questionId: this.currentQuestion.cardId || this.currentQuestion.blankId || `q${this.currentQuestionIndex}`,
      correct: isCorrect,
      timeSpent: timeSpent,
      points: points
    });
    
    // Переходим к следующему вопросу через 2 секунды
    setTimeout(() => {
      this.currentQuestionIndex++;
      this.loadNextQuestion();
    }, 2000);
  }

  handleTimeOut(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    
    // Время вышло - считаем как неправильный ответ
    if (!this.showResult && this.currentQuestion) {
      this.wrongAnswers++;
      this.streak = 0;
      this.combo = 1;
      this.showResult = true;
      this.isCorrect = false;
      
      // Сохраняем результат вопроса с таймаутом
      this.questionResults.push({
        questionId: this.currentQuestion.cardId || this.currentQuestion.blankId || `q${this.currentQuestionIndex}`,
        correct: false,
        timeSpent: 15,
        points: 0
      });
      
      setTimeout(() => {
        this.currentQuestionIndex++;
        this.loadNextQuestion();
      }, 2000);
    }
  }

  loadAuthorNames(): void {
    const uniqueUserIds = [...new Set(this.patternCards.map(card => card.constructorUserId).filter(id => id))];
    
    uniqueUserIds.forEach(userId => {
      const token = this.authService.getAccessToken();
      if (!token) return;
      
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Используем API для получения информации о пользователе
      this.http.get<any>(`${API_ENDPOINTS.AUTH}/users/${userId}`, { headers }).subscribe({
        next: (user) => {
          const authorName = `${user.name || ''} ${user.surname || ''}`.trim() || 'Auteur inconnu';
          // Обновляем все карточки этого автора
          this.patternCards.forEach(card => {
            if (card.constructorUserId === userId) {
              card.authorName = authorName;
            }
          });
          this.filteredPatternCards.forEach(card => {
            if (card.constructorUserId === userId) {
              card.authorName = authorName;
            }
          });
        },
        error: (error) => {
          console.error(`❌ Erreur lors du chargement de l'auteur ${userId}:`, error);
          // Устанавливаем дефолтное имя
          this.patternCards.forEach(card => {
            if (card.constructorUserId === userId && !card.authorName) {
              card.authorName = 'Auteur inconnu';
            }
          });
        }
      });
    });
  }
}

