import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { RoleService } from '../../services/role.service';
import { MaterialService, Material } from '../../services/material.service';
import { NotificationService } from '../../services/notification.service';
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

interface ListeningQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  timeInAudio?: number;
}

interface ListeningExercise {
  id: string;
  materialId: string;
  audioUrl: string;
  transcript: string | null;
  duration: number;
  questions: ListeningQuestion[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null;
  category: string | null;
  description: string | null;
  tags: string[] | null;
  createdBy: string;
  visibility: 'public' | 'students' | 'private';
  createdAt: Date;
  updatedAt: Date;
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

  // Listening Exercises state
  listeningExercises: ListeningExercise[] = [];
  filteredListeningExercises: ListeningExercise[] = [];
  loadingListeningExercises = false;
  selectedListeningDifficulty: 'all' | 'beginner' | 'intermediate' | 'advanced' = 'all';
  showListeningExercisesList = false;

  // Speed Listening Challenge state
  isListeningChallengeActive = false;
  listeningChallengeExercises: ListeningExercise[] = [];
  currentListeningExercise: ListeningExercise | null = null;
  currentListeningQuestion: ListeningQuestion | null = null;
  audioPlayer: HTMLAudioElement | null = null;
  isPlaying = false;
  currentAudioTime = 0;
  audioDuration = 0;
  hasListened = false; // Прослушал ли пользователь аудио
  listeningQuestionResults: Array<{
    questionId: string;
    correct: boolean;
    timeSpent: number;
    points: number;
  }> = [];
  listeningSessionStartTime = 0;

  // Creating listening exercises (for teachers)
  showCreateListeningExerciseModal = false;
  selectedMaterialForExercise: Material | null = null;
  creatingListeningExercise = false;
  availableMaterials: Material[] = [];
  loadingMaterials = false;
  newListeningExercise = {
    description: '',
    difficulty: 'beginner' as 'beginner' | 'intermediate' | 'advanced',
    category: '',
    visibility: 'public' as 'public' | 'students' | 'private',
    questions: [
      {
        question: '',
        options: ['', ''],
        correctAnswer: '',
        explanation: ''
      }
    ] as Array<{
      question: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
    }>
  };

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
  
  // Grammar Speed Challenge Configuration
  grammarConfig = {
    timePerQuestion: 15, // секунд на вопрос
    totalQuestions: 10, // количество вопросов в раунде
    enableSpeedBonus: true, // включить бонус за скорость
    enableStreakBonus: true, // включить бонус за серии
    maxCombo: 5, // максимальный множитель комбо
    basePoints: 100 // базовые очки за правильный ответ
  };
  showGrammarConfigModal = false;
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
    private authService: AuthService,
    private roleService: RoleService,
    private materialService: MaterialService,
    private notificationService: NotificationService
  ) { }

  isTeacher(): boolean {
    return this.roleService.isTeacher();
  }

  ngOnInit(): void {
    this.loadGrammarConfig();
  }

  ngOnDestroy(): void {
    // Очищаем таймер при уничтожении компонента
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    // Очищаем аудиоплеер
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
  }

  setActiveTrainingTab(tab: string): void {
    this.activeTrainingTab = tab;
    // Сбрасываем выбранную часть речи при переключении вкладок
    if (tab !== 'grammar') {
      this.selectedPartOfSpeech = null;
      this.patternCards = [];
    }
    // Загружаем listening exercises при переходе на вкладку audio
    if (tab === 'audio' && this.listeningExercises.length === 0) {
      this.loadListeningExercises();
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
    
    // Используем настройки из конфигурации
    const totalQuestions = this.grammarConfig.totalQuestions;
    
    // Перемешиваем карточки и берем первые N
    const cardsToUse = cardsWithBlanks.length > totalQuestions 
      ? [...cardsWithBlanks].sort(() => Math.random() - 0.5).slice(0, totalQuestions)
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
    this.totalQuestions = totalQuestions;
    this.timeLeft = this.grammarConfig.timePerQuestion;
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
    
    const config = this.grammarConfig;
    let points = config.basePoints * this.combo;
    
    if (config.enableSpeedBonus) {
      const speedBonus = Math.floor(this.timeLeft * 10);
      points += speedBonus;
    }
    
    if (config.enableStreakBonus && this.streak > 1) {
      const streakBonus = (this.streak - 1) * 50;
      points += streakBonus;
    }
    
    return Math.floor(points);
  }

  getListeningPointsForAnswer(): number {
    if (!this.currentListeningQuestion || !this.isCorrect) return 0;
    const speedBonus = Math.floor(this.timeLeft * 10);
    const streakBonus = this.streak > 1 ? (this.streak - 1) * 50 : 0;
    return Math.floor(100 * this.combo + speedBonus + streakBonus);
  }

  getFileUrl(url: string): string {
    // Заменяем удаленный сервер на локальный
    if (url.includes('135.125.107.45:3011')) {
      return url.replace('http://135.125.107.45:3011', 'http://localhost:3011');
    }
    if (url.includes('localhost:3008')) {
      return url.replace('http://localhost:3008', `${API_ENDPOINTS.FILES}`);
    }
    // Если URL уже полный (начинается с http), возвращаем как есть
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    // Иначе добавляем базовый URL API Gateway для файлов
    const baseUrl = API_ENDPOINTS.FILES.replace('/files', '');
    // Если URL начинается с /uploads, добавляем /files
    if (url.startsWith('/uploads')) {
      return `${baseUrl}/files${url}`;
    }
    return url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
  }

  // ==================== LISTENING EXERCISES METHODS ====================

  loadListeningExercises(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      return;
    }

    this.loadingListeningExercises = true;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<ListeningExercise[]>(`${API_ENDPOINTS.FILES}/listening-exercises`, { headers }).subscribe({
      next: (exercises) => {
        this.listeningExercises = exercises;
        this.applyListeningDifficultyFilter();
        this.loadingListeningExercises = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des exercices d\'écoute:', error);
        this.loadingListeningExercises = false;
      }
    });
  }

  applyListeningDifficultyFilter(): void {
    if (this.selectedListeningDifficulty === 'all') {
      this.filteredListeningExercises = [...this.listeningExercises];
    } else {
      this.filteredListeningExercises = this.listeningExercises.filter(
        exercise => exercise.difficulty === this.selectedListeningDifficulty
      );
    }
  }

  onListeningDifficultyChange(): void {
    this.applyListeningDifficultyFilter();
  }

  startListeningChallenge(exercises: ListeningExercise[]): void {
    if (!exercises || exercises.length === 0) {
      console.error('No listening exercises provided');
      return;
    }

    // Перемешиваем упражнения и берем первые N
    const exercisesToUse = exercises.length > this.totalQuestions
      ? [...exercises].sort(() => Math.random() - 0.5).slice(0, this.totalQuestions)
      : [...exercises].sort(() => Math.random() - 0.5);

    this.listeningChallengeExercises = exercisesToUse;
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.combo = 1;
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.listeningQuestionResults = [];
    this.listeningSessionStartTime = Date.now();
    this.isListeningChallengeActive = true;
    this.showListeningExercisesList = false;
    this.loadNextListeningExercise();
  }

  loadNextListeningExercise(): void {
    if (this.currentQuestionIndex >= this.listeningChallengeExercises.length) {
      // Раунд завершен - сохраняем результаты
      this.saveListeningTrainingSession();
      this.showResultsScreen = true;
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }
      if (this.audioPlayer) {
        this.audioPlayer.pause();
        this.audioPlayer = null;
      }
      return;
    }

    const exercise = this.listeningChallengeExercises[this.currentQuestionIndex];
    this.currentListeningExercise = exercise;
    this.currentListeningQuestion = null;
    this.selectedAnswer = null;
    this.showResult = false;
    this.isCorrect = null;
    this.hasListened = false;
    this.currentAudioTime = 0;
    this.audioDuration = exercise.duration;
    this.timeLeft = 15; // Время на ответ после прослушивания

    // Инициализируем аудиоплеер
    this.initializeAudioPlayer(exercise.audioUrl);
  }

  initializeAudioPlayer(audioUrl: string): void {
    if (typeof document === 'undefined') return;

    // Очищаем предыдущий плеер
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }

    // Получаем полный URL файла
    const fullAudioUrl = this.getFileUrl(audioUrl);

    // Создаем новый аудиоплеер
    this.audioPlayer = new Audio(fullAudioUrl);
    this.audioPlayer.preload = 'metadata';

    this.audioPlayer.addEventListener('loadedmetadata', () => {
      if (this.audioPlayer) {
        this.audioDuration = this.audioPlayer.duration;
      }
    });

    this.audioPlayer.addEventListener('timeupdate', () => {
      if (this.audioPlayer) {
        this.currentAudioTime = this.audioPlayer.currentTime;
      }
    });

    this.audioPlayer.addEventListener('ended', () => {
      this.isPlaying = false;
      this.hasListened = true;
      // После окончания аудио показываем первый вопрос
      if (this.currentListeningExercise && this.currentListeningExercise.questions.length > 0) {
        this.currentListeningQuestion = this.currentListeningExercise.questions[0];
        this.startQuestionTimer();
      }
    });

    this.audioPlayer.addEventListener('error', (error) => {
      console.error('❌ Erreur de lecture audio:', error);
    });
  }

  togglePlayPause(): void {
    if (!this.audioPlayer) return;

    if (this.isPlaying) {
      this.audioPlayer.pause();
    } else {
      this.audioPlayer.play();
    }
    this.isPlaying = !this.isPlaying;
  }

  replayAudio(): void {
    if (!this.audioPlayer) return;
    this.audioPlayer.currentTime = 0;
    this.audioPlayer.play();
    this.isPlaying = true;
    this.hasListened = false;
    this.currentListeningQuestion = null;
    this.selectedAnswer = null;
    this.showResult = false;
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  startQuestionTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.timeLeft = 15;
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.handleListeningTimeOut();
      }
    }, 1000);
  }

  selectListeningAnswer(answer: string): void {
    if (this.showResult || !this.currentListeningQuestion) return;

    const timeSpent = 15 - this.timeLeft;
    this.selectedAnswer = answer;
    this.checkListeningAnswer(answer, timeSpent);
  }

  checkListeningAnswer(answer: string, timeSpent: number): void {
    if (!this.currentListeningQuestion) return;

    const isCorrect = answer.toLowerCase() === this.currentListeningQuestion.correctAnswer.toLowerCase();
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
        
        const config = this.grammarConfig;
        points = config.basePoints * this.combo;
        
        if (config.enableSpeedBonus) {
          const speedBonus = Math.floor(this.timeLeft * 10);
          points += speedBonus;
        }
        
        if (config.enableStreakBonus && this.streak > 1) {
          const streakBonus = (this.streak - 1) * 50;
          points += streakBonus;
        }
        
        this.score += Math.floor(points);

        if (this.streak >= 3) {
          this.combo = Math.min(this.combo + 0.5, config.maxCombo);
        }
    } else {
      this.wrongAnswers++;
      this.streak = 0;
      this.combo = 1;
    }

    // Сохраняем результат вопроса
    this.listeningQuestionResults.push({
      questionId: this.currentListeningQuestion.id,
      correct: isCorrect,
      timeSpent: timeSpent,
      points: points
    });

    // Переходим к следующему вопросу или упражнению через 2 секунды
    setTimeout(() => {
      this.moveToNextListeningQuestion();
    }, 2000);
  }

  moveToNextListeningQuestion(): void {
    if (!this.currentListeningExercise) return;

    const currentQuestionIndex = this.currentListeningExercise.questions.findIndex(
      q => q.id === this.currentListeningQuestion?.id
    );

    // Если есть еще вопросы в текущем упражнении
    if (currentQuestionIndex >= 0 && currentQuestionIndex < this.currentListeningExercise.questions.length - 1) {
      this.currentListeningQuestion = this.currentListeningExercise.questions[currentQuestionIndex + 1];
      this.selectedAnswer = null;
      this.showResult = false;
      this.isCorrect = null;
      this.timeLeft = 15;
      this.startQuestionTimer();
    } else {
      // Переходим к следующему упражнению
      this.currentQuestionIndex++;
      this.loadNextListeningExercise();
    }
  }

  handleListeningTimeOut(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (!this.showResult && this.currentListeningQuestion) {
      this.wrongAnswers++;
      this.streak = 0;
      this.combo = 1;
      this.showResult = true;
      this.isCorrect = false;

      this.listeningQuestionResults.push({
        questionId: this.currentListeningQuestion.id,
        correct: false,
        timeSpent: 15,
        points: 0
      });

      setTimeout(() => {
        this.moveToNextListeningQuestion();
      }, 2000);
    }
  }

  stopListeningChallenge(): void {
    this.isListeningChallengeActive = false;
    this.showResultsScreen = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.audioPlayer) {
      this.audioPlayer.pause();
      this.audioPlayer = null;
    }
    this.showListeningExercisesList = true;
  }

  saveListeningTrainingSession(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      console.error('No auth token available');
      return;
    }

    const totalTimeSeconds = Math.floor((Date.now() - this.listeningSessionStartTime) / 1000);
    const accuracy = this.getListeningAccuracyPercentage();
    const exerciseIds = this.listeningChallengeExercises.map(ex => ex.id);
    const materialIds = this.listeningChallengeExercises.map(ex => ex.materialId);

    const firstExercise = this.listeningChallengeExercises[0];
    const category = firstExercise?.category || 'listening';
    const difficulty = firstExercise?.difficulty || null;

    const sessionData = {
      exerciseType: 'listening_challenge',
      topicId: null,
      category: category,
      totalQuestions: this.listeningQuestionResults.length,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.wrongAnswers,
      score: this.score,
      maxStreak: this.streak,
      accuracy: accuracy,
      totalTimeSeconds: totalTimeSeconds,
      details: {
        exerciseIds: exerciseIds,
        materialIds: materialIds,
        questionResults: this.listeningQuestionResults,
        difficulty: difficulty
      }
    };

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(`${API_ENDPOINTS.TRAINING}/session`, sessionData, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Listening training session saved:', response);
      },
      error: (error) => {
        console.error('❌ Error saving listening training session:', error);
      }
    });
  }

  getListeningAccuracyPercentage(): number {
    if (this.listeningQuestionResults.length === 0) return 0;
    return Math.round((this.correctAnswers / this.listeningQuestionResults.length) * 100);
  }

  // ==================== CREATE LISTENING EXERCISE METHODS ====================

  openCreateListeningExerciseModal(): void {
    if (!this.isTeacher()) {
      this.notificationService.error('Seuls les enseignants peuvent créer des exercices');
      return;
    }
    this.resetListeningExerciseForm();
    this.loadAvailableMaterials();
    this.showCreateListeningExerciseModal = true;
  }

  closeCreateListeningExerciseModal(): void {
    this.showCreateListeningExerciseModal = false;
    this.selectedMaterialForExercise = null;
    this.resetListeningExerciseForm();
  }

  loadAvailableMaterials(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !this.isTeacher()) return;

    this.loadingMaterials = true;
    this.materialService.getMaterialsForTeacher(currentUser.id).subscribe({
      next: (materials) => {
        // Фильтруем только аудио материалы с availableForTraining = true
        this.availableMaterials = materials.filter(
          m => m.type === 'audio' && m.availableForTraining === true
        );
        this.loadingMaterials = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des matériaux:', error);
        this.notificationService.error('Erreur lors du chargement des matériaux');
        this.loadingMaterials = false;
      }
    });
  }

  resetListeningExerciseForm(): void {
    this.newListeningExercise = {
      description: '',
      difficulty: 'beginner',
      category: '',
      visibility: 'public',
      questions: [
        {
          question: '',
          options: ['', ''],
          correctAnswer: '',
          explanation: ''
        }
      ]
    };
    this.selectedMaterialForExercise = null;
  }

  selectMaterialForExercise(material: Material): void {
    this.selectedMaterialForExercise = material;
  }

  addListeningQuestion(): void {
    this.newListeningExercise.questions.push({
      question: '',
      options: ['', ''],
      correctAnswer: '',
      explanation: ''
    });
  }

  removeListeningQuestion(index: number): void {
    if (this.newListeningExercise.questions.length > 1) {
      this.newListeningExercise.questions.splice(index, 1);
    }
  }

  addOption(questionIndex: number): void {
    const question = this.newListeningExercise.questions[questionIndex];
    if (question.options.length < 6) {
      question.options.push('');
    }
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    const question = this.newListeningExercise.questions[questionIndex];
    if (question.options.length > 2) {
      question.options.splice(optionIndex, 1);
      // Если удаленная опция была правильным ответом, сбрасываем correctAnswer
      if (question.correctAnswer === question.options[optionIndex]) {
        question.correctAnswer = '';
      }
    }
  }

  canCreateListeningExercise(): boolean {
    if (!this.selectedMaterialForExercise) return false;
    if (!this.newListeningExercise.description.trim()) return false;
    if (this.newListeningExercise.questions.length === 0) return false;

    // Проверяем, что все вопросы заполнены
    for (const question of this.newListeningExercise.questions) {
      if (!question.question.trim()) return false;
      if (question.options.length < 2) return false;
      if (question.options.some(opt => !opt.trim())) return false;
      if (!question.correctAnswer || !question.correctAnswer.trim()) return false;
    }

    return true;
  }

  createListeningExercise(): void {
    if (!this.selectedMaterialForExercise || !this.canCreateListeningExercise()) {
      this.notificationService.error('Veuillez remplir tous les champs requis');
      return;
    }

    this.creatingListeningExercise = true;

    const token = this.authService.getAccessToken();
    if (!token) {
      this.notificationService.error('Vous devez être connecté pour créer un exercice');
      this.creatingListeningExercise = false;
      return;
    }

    // Получаем длительность аудио (будет обновлена на бекенде при обработке файла)
    const audioDuration = 0;

    const exerciseData = {
      materialId: this.selectedMaterialForExercise.id,
      audioUrl: this.selectedMaterialForExercise.content,
      transcript: null,
      duration: audioDuration,
      questions: this.newListeningExercise.questions.map((q) => ({
        question: q.question.trim(),
        options: q.options.map(opt => opt.trim()),
        correctAnswer: q.correctAnswer.trim(),
        explanation: q.explanation?.trim() || null,
        timeInAudio: null
      })),
      difficulty: this.newListeningExercise.difficulty,
      category: this.newListeningExercise.category.trim() || null,
      description: this.newListeningExercise.description.trim(),
      visibility: this.newListeningExercise.visibility
    };

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(`${API_ENDPOINTS.FILES}/listening-exercises`, exerciseData, { headers }).subscribe({
      next: (response) => {
        console.log('✅ Listening exercise created:', response);
        this.notificationService.success('Exercice d\'écoute créé avec succès!');
        this.closeCreateListeningExerciseModal();
        this.creatingListeningExercise = false;
        // Перезагружаем список упражнений
        this.loadListeningExercises();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création de l\'exercice d\'écoute:', error);
        this.notificationService.error('Erreur lors de la création de l\'exercice d\'écoute');
        this.creatingListeningExercise = false;
      }
    });
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
      const config = this.grammarConfig;
      points = config.basePoints * this.combo;
      
      if (config.enableSpeedBonus) {
        const speedBonus = Math.floor(this.timeLeft * 10);
        points += speedBonus;
      }
      
      if (config.enableStreakBonus && this.streak > 1) {
        const streakBonus = (this.streak - 1) * 50;
        points += streakBonus;
      }
      
      this.score += Math.floor(points);
      
      // Увеличиваем комбо при серии правильных ответов
      if (this.streak >= 3) {
        this.combo = Math.min(this.combo + 0.5, config.maxCombo);
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

  // ==================== GRAMMAR CONFIGURATION METHODS ====================

  openGrammarConfigModal(): void {
    this.showGrammarConfigModal = true;
  }

  closeGrammarConfigModal(): void {
    this.showGrammarConfigModal = false;
  }

  saveGrammarConfig(): void {
    // Валидация
    if (this.grammarConfig.timePerQuestion < 5 || this.grammarConfig.timePerQuestion > 60) {
      this.notificationService.error('Le temps par question doit être entre 5 et 60 secondes');
      return;
    }
    if (this.grammarConfig.totalQuestions < 1 || this.grammarConfig.totalQuestions > 50) {
      this.notificationService.error('Le nombre de questions doit être entre 1 et 50');
      return;
    }
    if (this.grammarConfig.maxCombo < 1 || this.grammarConfig.maxCombo > 10) {
      this.notificationService.error('Le multiplicateur de combo maximum doit être entre 1 et 10');
      return;
    }
    if (this.grammarConfig.basePoints < 10 || this.grammarConfig.basePoints > 1000) {
      this.notificationService.error('Les points de base doivent être entre 10 et 1000');
      return;
    }

    // Сохраняем в localStorage для сохранения настроек между сессиями
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('grammarSpeedChallengeConfig', JSON.stringify(this.grammarConfig));
    }

    this.notificationService.success('Configuration sauvegardée avec succès!');
    this.closeGrammarConfigModal();
  }

  loadGrammarConfig(): void {
    // Загружаем из localStorage если есть
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('grammarSpeedChallengeConfig');
      if (saved) {
        try {
          this.grammarConfig = { ...this.grammarConfig, ...JSON.parse(saved) };
        } catch (e) {
          console.error('Error loading grammar config:', e);
        }
      }
    }
  }
}

