import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { NotificationService } from '../../../services/notification.service';

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

export interface PatternCard {
  id: string;
  pattern: string;
  example: string;
  blanks: PatternBlank[];
  variations?: any[] | null;
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | null;
  category?: string | null;
  explanation?: string | null;
  tags?: string[] | null;
}

export interface FillResult {
  blankId: string;
  answer: string;
  isCorrect: boolean;
  correctAnswer?: string;
  alternatives?: string[];
}

export interface PatternCardViewerData {
  patternCardId: string;
  patternCardName?: string;
}

@Component({
  selector: 'app-pattern-card-viewer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDialogModule
  ],
  templateUrl: './pattern-card-viewer.component.html',
  styleUrls: ['./pattern-card-viewer.component.css']
})
export class PatternCardViewerComponent implements OnInit {
  patternCardId!: string;
  patternCardName?: string;

  patternCard: PatternCard | null = null;
  currentStage: 'example' | 'blanks' | 'spontaneous' = 'example';
  
  // Stage data
  stageData: any = null;
  loading = false;
  
  // Blanks stage
  blankAnswers: { [blankId: string]: string } = {};
  fillResults: FillResult[] = [];
  showResults = false;
  allCorrect = false;
  
  // Hints
  shownHints: { [blankId: string]: boolean } = {};

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private notificationService: NotificationService,
    public dialogRef: MatDialogRef<PatternCardViewerComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PatternCardViewerData
  ) {
    this.patternCardId = data.patternCardId;
    this.patternCardName = data.patternCardName;
  }

  ngOnInit(): void {
    if (this.patternCardId) {
      this.loadPatternCard();
    }
  }

  loadPatternCard(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.loading = true;
    this.http.get<PatternCard>(`${API_ENDPOINTS.CONSTRUCTORS}/${this.patternCardId}/pattern-card`, { headers }).subscribe({
      next: (card) => {
        this.patternCard = card;
        this.loadStage('example');
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading pattern-card:', error);
        this.notificationService.error('Erreur lors du chargement de la pattern-card');
        this.loading = false;
      }
    });
  }

  loadStage(stage: 'example' | 'blanks' | 'spontaneous'): void {
    if (!this.patternCardId) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.loading = true;
    this.currentStage = stage;
    this.showResults = false;
    this.fillResults = [];
    this.blankAnswers = {};

    this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${this.patternCardId}/pattern-card/stages/${stage}`, { headers }).subscribe({
      next: (data: any) => {
        this.stageData = data;
        if (stage === 'blanks' && data.blanks) {
          data.blanks.forEach((blank: PatternBlank) => {
            this.blankAnswers[blank.id] = '';
          });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading stage:', error);
        this.notificationService.error('Erreur lors du chargement de l\'étape');
        this.loading = false;
      }
    });
  }

  showHint(blankId: string): void {
    this.shownHints[blankId] = true;
  }

  checkAnswers(): void {
    if (!this.patternCardId) return;

    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const answers = Object.keys(this.blankAnswers).map(blankId => ({
      blankId,
      answer: this.blankAnswers[blankId].trim()
    })).filter(a => a.answer.length > 0);

    if (answers.length === 0) {
      this.notificationService.warning('Veuillez remplir au moins un blank');
      return;
    }

    this.loading = true;
    this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}/${this.patternCardId}/pattern-card/fill`, 
      { answers }, 
      { headers }
    ).subscribe({
      next: (response: any) => {
        this.fillResults = response.results || [];
        this.showResults = true;
        this.allCorrect = this.fillResults.every(r => r.isCorrect);
        this.loading = false;

        if (this.allCorrect) {
          this.notificationService.success('Tous les blanks sont corrects! 🎉');
        } else {
          const correctCount = this.fillResults.filter(r => r.isCorrect).length;
          this.notificationService.info(`${correctCount}/${this.fillResults.length} blanks corrects`);
        }
      },
      error: (error) => {
        console.error('Error checking answers:', error);
        this.notificationService.error('Erreur lors de la vérification des réponses');
        this.loading = false;
      }
    });
  }

  resetBlanks(): void {
    this.blankAnswers = {};
    this.showResults = false;
    this.fillResults = [];
    this.shownHints = {};
  }

  getBlankResult(blankId: string): FillResult | undefined {
    return this.fillResults.find(r => r.blankId === blankId);
  }

  isBlankCorrect(blankId: string): boolean {
    const result = this.getBlankResult(blankId);
    return result?.isCorrect || false;
  }

  getBlankClass(blankId: string): string {
    if (!this.showResults) return '';
    const result = this.getBlankResult(blankId);
    if (!result) return '';
    return result.isCorrect ? 'correct' : 'incorrect';
  }

  getCorrectBlanksCount(): number {
    if (!this.fillResults || this.fillResults.length === 0) return 0;
    return this.fillResults.filter(r => r.isCorrect).length;
  }

  getTotalBlanksCount(): number {
    return this.fillResults?.length || 0;
  }
}
