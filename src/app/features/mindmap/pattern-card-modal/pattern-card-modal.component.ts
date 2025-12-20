import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { AuthService } from '../../../services/auth.service';

export interface PatternBlank {
  id: string;
  position: number;
  correctAnswer: string;
  hints?: string[];
  alternatives?: string[];
  partOfSpeech?: string;
  type?: 'text' | 'choice';
  options?: string[];
  label?: string;
}

export interface PatternVariation {
  id: string;
  pattern: string;
  example: string;
  context?: string;
}

export interface PatternCard {
  id?: string;
  pattern: string;
  example: string;
  blanks: PatternBlank[];
  variations?: PatternVariation[] | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  category?: string | null;
  explanation?: string | null;
  tags?: string[];
  topicId?: string | null;
}

export interface GrammarSection {
  id: string;
  name: string;
  title: string;
  description?: string | null;
  order: number;
  topics?: GrammarTopic[];
}

export interface GrammarTopic {
  id: string;
  sectionId: string;
  parentTopicId?: string | null;
  parentTopic?: GrammarTopic | null;
  title: string;
  description?: string | null;
  level: number;
  order: number;
  subtopics?: GrammarTopic[];
}

export interface PatternCardModalData {
  mode: 'config' | 'preview';
  patternCardName: string;
  patternCard?: PatternCard;
  editingPatternCard?: PatternCard | null;
  onSave?: (data: any) => void;
  onUpdate?: (data: any) => void;
}

const GRAMMAR_CATEGORIES = [
  'Temps',
  'Modes',
  'Articles',
  'Prépositions',
  'Pronoms',
  'Accord',
  'Ordre des mots',
  'Autre'
];

const GRAMMAR_TAGS = [
  'présent', 'passé composé', 'imparfait', 'futur', 'plus-que-parfait',
  'subjonctif', 'conditionnel', 'impératif', 'indicatif',
  'le/la/les', 'un/une/des', 'du/de la',
  'à', 'de', 'dans', 'sur', 'avec', 'pour',
  'me/te/le/la', 'lui/leur', 'se',
  'accord', 'genre', 'nombre', 'participe passé',
  'ordre', 'place', 'position'
];

@Component({
  selector: 'app-pattern-card-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatAutocompleteModule,
    MatTabsModule
  ],
  templateUrl: './pattern-card-modal.component.html',
  styleUrls: ['./pattern-card-modal.component.css']
})
export class PatternCardModalComponent implements OnInit {
  mode: 'config' | 'preview';
  patternCardName: string;
  patternCard: PatternCard;
  editingPatternCard?: PatternCard | null;
  onSave?: (data: any) => void;
  onUpdate?: (data: any) => void;

  // Form data
  pattern: string = '';
  example: string = '';
  blanks: PatternBlank[] = [];
  variations: PatternVariation[] = [];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | null = null;
  category: string | null = null;
  explanation: string = '';
  tags: string[] = [];
  newTag: string = '';

  // Available options
  grammarCategories = GRAMMAR_CATEGORIES;
  grammarTags = GRAMMAR_TAGS;
  filteredTags: string[] = [];

  // Grammar hierarchy
  grammarSections: GrammarSection[] = [];
  selectedSectionId: string | null = null;
  selectedTopicId: string | null = null;
  topicPath: GrammarTopic[] = [];
  availableTopics: GrammarTopic[] = [];

  // Blank editing
  editingBlank: PatternBlank | null = null;
  newBlankHint: string = '';
  newBlankAlternative: string = '';
  newBlankOption: string = '';

  // Variation editing
  editingVariation: PatternVariation | null = null;

  constructor(
    public dialogRef: MatDialogRef<PatternCardModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PatternCardModalData,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.mode = data.mode;
    this.patternCardName = data.patternCardName;
    this.editingPatternCard = data.editingPatternCard;
    this.onSave = data.onSave;
    this.onUpdate = data.onUpdate;

    if (data.patternCard) {
      this.patternCard = { ...data.patternCard };
      this.loadPatternCardData(this.patternCard);
    } else {
      this.patternCard = this.getDefaultPatternCard();
      this.loadPatternCardData(this.patternCard);
    }
  }

  ngOnInit(): void {
    this.detectBlanksFromPattern();
    this.loadGrammarSections();
  }

  loadGrammarSections(): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<GrammarSection[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections`, { headers }).subscribe({
      next: (sections) => {
        this.grammarSections = sections;
        if (this.patternCard?.topicId) {
          this.loadTopicPath(this.patternCard.topicId);
        }
      },
      error: (error) => {
        console.error('Error loading grammar sections:', error);
      }
    });
  }

  loadTopicPath(topicId: string): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<GrammarTopic>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/topics/${topicId}`, { headers }).subscribe({
      next: (topic) => {
        this.selectedTopicId = topic.id;
        this.selectedSectionId = topic.sectionId;
        this.buildTopicPath(topic);
        this.loadAvailableTopics(topic.sectionId, topic.parentTopicId);
      },
      error: (error) => {
        console.error('Error loading topic:', error);
      }
    });
  }

  buildTopicPath(topic: GrammarTopic): void {
    this.topicPath = [topic];
    // Если есть parentTopic, добавляем его в путь
    if (topic.parentTopic) {
      this.buildTopicPathRecursive(topic.parentTopic);
    } else if (topic.parentTopicId) {
      // Загружаем parentTopic если его нет
      this.loadParentTopic(topic.parentTopicId);
    }
  }

  buildTopicPathRecursive(topic: GrammarTopic): void {
    this.topicPath.unshift(topic);
    if (topic.parentTopic) {
      this.buildTopicPathRecursive(topic.parentTopic);
    }
  }

  loadParentTopic(topicId: string): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<GrammarTopic>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/topics/${topicId}`, { headers }).subscribe({
      next: (topic) => {
        this.topicPath.unshift(topic);
        if (topic.parentTopicId) {
          this.loadParentTopic(topic.parentTopicId);
        }
      },
      error: (error) => {
        console.error('Error loading parent topic:', error);
      }
    });
  }

  loadAvailableTopics(sectionId: string, parentTopicId: string | null = null): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<GrammarTopic[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections/${sectionId}/topics`, { headers }).subscribe({
      next: (topics) => {
        // Фильтруем темы по parentTopicId на клиенте
        this.availableTopics = topics.filter(t => {
          if (parentTopicId === null) {
            return !t.parentTopicId;
          }
          return t.parentTopicId === parentTopicId;
        });
      },
      error: (error) => {
        console.error('Error loading topics:', error);
      }
    });
  }

  onSectionChange(sectionId: string | null): void {
    if (!sectionId) {
      this.selectedSectionId = null;
      this.selectedTopicId = null;
      this.topicPath = [];
      this.availableTopics = [];
      return;
    }
    this.selectedSectionId = sectionId;
    this.selectedTopicId = null;
    this.topicPath = [];
    this.loadAvailableTopics(sectionId, null);
  }

  onTopicSelect(topic: GrammarTopic): void {
    this.selectedTopicId = topic.id;
    this.topicPath.push(topic);
    this.loadAvailableTopics(topic.sectionId, topic.id);
  }

  navigateToTopicLevel(level: number): void {
    if (level >= 0 && level < this.topicPath.length) {
      const topic = this.topicPath[level];
      this.topicPath = this.topicPath.slice(0, level + 1);
      this.selectedTopicId = topic.id;
      this.loadAvailableTopics(topic.sectionId, topic.parentTopicId || null);
    }
  }

  private getDefaultPatternCard(): PatternCard {
    return {
      pattern: '',
      example: '',
      blanks: [],
      variations: null,
      difficulty: null,
      category: null,
      explanation: null,
      tags: []
    };
  }

  private loadPatternCardData(card: PatternCard): void {
    this.pattern = card.pattern || '';
    this.example = card.example || '';
    this.blanks = card.blanks ? [...card.blanks] : [];
    this.variations = card.variations ? [...card.variations] : [];
    this.difficulty = card.difficulty || null;
    this.category = card.category || null;
    this.explanation = card.explanation || '';
    this.tags = card.tags ? [...card.tags] : [];
  }

  detectBlanksFromPattern(): void {
    if (!this.pattern) return;

    const blankRegex = /\[([^\]]+)\]/g;
    const matches = Array.from(this.pattern.matchAll(blankRegex));
    const existingBlanks = new Map(this.blanks.map(b => [b.id, b]));

    matches.forEach((match, index) => {
      const placeholder = match[0]; // [VERB]
      const label = match[1]; // VERB
      const position = match.index || 0;

      const blankId = `blank_${index}`;
      if (!existingBlanks.has(blankId)) {
        // Найти соответствующий текст в example
        const exampleMatch = this.example.substring(position, position + 50);
        const correctAnswer = this.findAnswerInExample(placeholder, exampleMatch) || '';

        this.blanks.push({
          id: blankId,
          position: position,
          correctAnswer: correctAnswer,
          hints: [],
          alternatives: [],
          partOfSpeech: label
        });
      }
    });

    // Удалить blanks, которых больше нет в pattern
    this.blanks = this.blanks.filter(b => {
      const placeholder = `[${b.partOfSpeech || ''}]`;
      return this.pattern.includes(placeholder);
    });
  }

  private findAnswerInExample(placeholder: string, exampleText: string): string {
    // Простая эвристика: найти слово после позиции placeholder
    const words = exampleText.split(/\s+/);
    return words[0] || '';
  }

  onPatternChange(): void {
    this.detectBlanksFromPattern();
  }

  addBlank(): void {
    const newBlank: PatternBlank = {
      id: `blank_${Date.now()}`,
      position: this.pattern.length,
      correctAnswer: '',
      hints: [],
      alternatives: [],
      partOfSpeech: 'WORD'
    };
    this.blanks.push(newBlank);
    this.editBlank(newBlank);
  }

  editBlank(blank: PatternBlank): void {
    this.editingBlank = { ...blank };
    if (!this.editingBlank.hints) {
      this.editingBlank.hints = [];
    }
    if (!this.editingBlank.alternatives) {
      this.editingBlank.alternatives = [];
    }
    if (!this.editingBlank.type) {
      this.editingBlank.type = 'text';
    }
    if (!this.editingBlank.options) {
      this.editingBlank.options = [];
    }
  }

  saveBlank(): void {
    if (!this.editingBlank) return;

    const index = this.blanks.findIndex(b => b.id === this.editingBlank!.id);
    if (index !== -1) {
      this.blanks[index] = { ...this.editingBlank };
    }

    this.editingBlank = null;
    this.newBlankHint = '';
    this.newBlankAlternative = '';
  }

  cancelEditBlank(): void {
    this.editingBlank = null;
    this.newBlankHint = '';
    this.newBlankAlternative = '';
    this.newBlankOption = '';
  }

  removeBlank(blank: PatternBlank): void {
    this.blanks = this.blanks.filter(b => b.id !== blank.id);
  }

  addBlankHint(): void {
    if (!this.editingBlank || !this.newBlankHint.trim()) return;
    if (!this.editingBlank.hints) {
      this.editingBlank.hints = [];
    }
    this.editingBlank.hints.push(this.newBlankHint.trim());
    this.newBlankHint = '';
  }

  removeBlankHint(hint: string): void {
    if (!this.editingBlank || !this.editingBlank.hints) return;
    this.editingBlank.hints = this.editingBlank.hints.filter(h => h !== hint);
  }

  addBlankAlternative(): void {
    if (!this.editingBlank || !this.newBlankAlternative.trim()) return;
    if (!this.editingBlank.alternatives) {
      this.editingBlank.alternatives = [];
    }
    this.editingBlank.alternatives.push(this.newBlankAlternative.trim());
    this.newBlankAlternative = '';
  }

  removeBlankAlternative(alt: string): void {
    if (!this.editingBlank || !this.editingBlank.alternatives) return;
    this.editingBlank.alternatives = this.editingBlank.alternatives.filter(a => a !== alt);
  }

  addBlankOption(): void {
    if (!this.editingBlank || !this.newBlankOption.trim()) return;
    if (!this.editingBlank.options) {
      this.editingBlank.options = [];
    }
    if (!this.editingBlank.options.includes(this.newBlankOption.trim())) {
      this.editingBlank.options.push(this.newBlankOption.trim());
    }
    this.newBlankOption = '';
  }

  removeBlankOption(option: string): void {
    if (!this.editingBlank || !this.editingBlank.options) return;
    this.editingBlank.options = this.editingBlank.options.filter(o => o !== option);
  }

  addVariation(): void {
    const newVariation: PatternVariation = {
      id: `variation_${Date.now()}`,
      pattern: this.pattern,
      example: this.example,
      context: ''
    };
    this.variations.push(newVariation);
    this.editVariation(newVariation);
  }

  editVariation(variation: PatternVariation): void {
    this.editingVariation = { ...variation };
  }

  saveVariation(): void {
    if (!this.editingVariation) return;

    const index = this.variations.findIndex(v => v.id === this.editingVariation!.id);
    if (index !== -1) {
      this.variations[index] = { ...this.editingVariation };
    }

    this.editingVariation = null;
  }

  cancelEditVariation(): void {
    this.editingVariation = null;
  }

  removeVariation(variation: PatternVariation): void {
    this.variations = this.variations.filter(v => v.id !== variation.id);
  }

  addTag(): void {
    if (this.newTag.trim() && !this.tags.includes(this.newTag.trim())) {
      this.tags.push(this.newTag.trim());
      this.newTag = '';
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter(t => t !== tag);
  }

  filterTags(value: string): void {
    this.filteredTags = this.grammarTags.filter(tag =>
      tag.toLowerCase().includes(value.toLowerCase()) && !this.tags.includes(tag)
    );
  }

  save(): void {
    const patternCardData: PatternCard = {
      pattern: this.pattern,
      example: this.example,
      blanks: this.blanks,
      variations: this.variations.length > 0 ? this.variations : null,
      difficulty: this.difficulty,
      category: this.category,
      explanation: this.explanation || null,
      tags: this.tags,
      topicId: this.selectedTopicId || null
    };

    if (this.onUpdate && this.editingPatternCard) {
      this.onUpdate({
        patternCardName: this.patternCardName,
        patternCard: patternCardData
      });
    } else if (this.onSave) {
      this.onSave({
        patternCardName: this.patternCardName,
        patternCard: patternCardData
      });
    }
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
