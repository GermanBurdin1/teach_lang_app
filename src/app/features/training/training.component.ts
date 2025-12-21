import { Component, OnInit } from '@angular/core';
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
export class TrainingComponent implements OnInit {
  activeTrainingTab = 'audio';
  expandedCategories: Set<string> = new Set();
  selectedPartOfSpeech: GrammarCategory | null = null;
  patternCards: PatternCard[] = [];
  filteredPatternCards: PatternCard[] = [];
  loadingPatternCards = false;
  selectedDifficulty: 'all' | 'beginner' | 'intermediate' | 'advanced' = 'all';
  showPatternCardsList = false;

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
    // TODO: Реализовать запуск упражнения
    console.log('Starting exercise:', card);
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

