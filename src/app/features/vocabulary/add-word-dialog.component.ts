import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslationService } from '../../services/translation.service';
import { GrammarData } from './models/grammar-data.model';

interface TranslationResponse {
  translations: string[];
  grammar?: GrammarData;
}

export interface AddWordDialogData {
  type: 'word' | 'expression';
  currentGalaxy: string;
  currentSubtopic: string;
}

export interface AddWordDialogResult {
  word: string;
  translation: string;
  type: 'word' | 'expression';
  sourceLang: 'ru' | 'fr' | 'en';
  targetLang: 'ru' | 'fr' | 'en';
  grammar?: GrammarData;
  isManual: boolean;
}

@Component({
  selector: 'app-add-word-dialog',
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="galaxy-icon">auto_awesome</mat-icon>
      Ajouter {{ data.type === 'word' ? 'un mot' : 'une expression' }}
    </h2>
    
    <mat-dialog-content class="dialog-content">
      <form>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>{{ data.type === 'word' ? 'Mot' : 'Expression' }}</mat-label>
          <input matInput 
                 [(ngModel)]="newWord" 
                 name="word"
                 [placeholder]="data.type === 'word' ? 'Entrer le mot' : 'Entrer l\\'expression'"
                 required>
          <mat-icon matSuffix>edit</mat-icon>
        </mat-form-field>

        <!-- Грамматические поля для слов -->
        <app-grammar-fields 
          *ngIf="data.type === 'word' && isManualTranslation && newGrammarData"
          [grammar]="newGrammarData"
          [showValidateButton]="false">
        </app-grammar-fields>

        <!-- Кнопка автоперевода -->
        <div class="auto-translate-section" *ngIf="!isManualTranslation">
          <button mat-raised-button 
                  color="primary" 
                  type="button"
                  (click)="requestTranslation()"
                  [disabled]="!newWord.trim()"
                  class="translate-btn">
            <mat-icon>translate</mat-icon>
            Trouver la traduction automatiquement
          </button>
        </div>

        <!-- Поле для ручного ввода перевода -->
        <mat-form-field appearance="outline" class="full-width" *ngIf="!isAutoTranslation">
          <mat-label>Traduction</mat-label>
          <input matInput 
                 [(ngModel)]="newTranslation" 
                 name="translation"
                 (input)="onManualTranslationInput()"
                 placeholder="Entrer la traduction manuellement">
          <mat-icon matSuffix>language</mat-icon>
        </mat-form-field>

        <!-- Селекторы языков -->
        <div class="lang-selectors">
          <mat-form-field appearance="outline">
            <mat-label>Depuis la langue</mat-label>
            <mat-select [(ngModel)]="sourceLang" name="sourceLang">
              <mat-option value="ru">🇷🇺 Russe</mat-option>
              <mat-option value="fr">🇫🇷 Français</mat-option>
              <mat-option value="en">🇬🇧 Anglais</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Vers la langue</mat-label>
            <mat-select [(ngModel)]="targetLang" name="targetLang">
              <mat-option value="ru">🇷🇺 Russe</mat-option>
              <mat-option value="fr">🇫🇷 Français</mat-option>
              <mat-option value="en">🇬🇧 Anglais</mat-option>
            </mat-select>
          </mat-form-field>
        </div>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button (click)="onCancel()" color="warn">
        <mat-icon>close</mat-icon>
        Annuler
      </button>
      <button mat-raised-button 
              (click)="onSave()" 
              color="primary"
              [disabled]="!canSave()">
        <mat-icon>add</mat-icon>
        Ajouter
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      min-width: 500px;
      max-width: 600px;
      min-height: 400px;
      display: block;
      --galaxy-primary: #6D28D9;
      --galaxy-secondary: #4C1D95;
      --galaxy-accent: #8B5CF6;
    }

    .dialog-content {
      padding: 20px 24px;
      min-height: 300px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .lang-selectors {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .lang-selectors mat-form-field {
      flex: 1;
    }

    .auto-translate-section {
      margin: 20px 0;
      text-align: center;
    }

    .translate-btn {
      background: linear-gradient(135deg, var(--galaxy-primary), var(--galaxy-secondary));
      color: white;
      border: none;
      box-shadow: 0 4px 15px rgba(109, 40, 217, 0.3);
      transition: all 0.3s ease;
    }

    .translate-btn:hover:not([disabled]) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(109, 40, 217, 0.4);
    }

    .galaxy-icon {
      background: linear-gradient(135deg, var(--galaxy-primary), var(--galaxy-accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    /* Стили для полей ввода - контрастные цвета */
    ::ng-deep .mat-mdc-form-field {
      .mat-mdc-text-field-wrapper {
        background-color: rgba(255, 255, 255, 0.95) !important;
      }
      
      .mat-mdc-input-element {
        color: #1a1a1a !important;
        caret-color: #6D28D9 !important;
      }
      
      .mat-mdc-form-field-label {
        color: #4a4a4a !important;
      }
      
      .mat-mdc-form-field-label.mdc-floating-label--float-above {
        color: #6D28D9 !important;
      }
      
      .mat-mdc-input-element::placeholder {
        color: #666666 !important;
      }
    }

    /* Стили для селектов */
    ::ng-deep .mat-mdc-select {
      .mat-mdc-select-value {
        color: #1a1a1a !important;
      }
      
      .mat-mdc-select-placeholder {
        color: #666666 !important;
      }
    }

    /* Добавляем переменные к существующему :host */
  `]
})
export class AddWordDialogComponent implements OnInit {
  newWord = '';
  newTranslation = '';
  sourceLang: 'ru' | 'fr' | 'en' = 'fr';
  targetLang: 'ru' | 'fr' | 'en' = 'ru';
  newGrammarData: GrammarData | null = null;
  isManualTranslation = false;
  isAutoTranslation = false;

  constructor(
    public dialogRef: MatDialogRef<AddWordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AddWordDialogData,
    private translationService: TranslationService
  ) {}

  ngOnInit(): void {
    // Можно добавить инициализацию если нужно
  }

  onManualTranslationInput(): void {
    this.isManualTranslation = this.newTranslation.trim().length > 0;
    this.isAutoTranslation = false;
  }

  requestTranslation(): void {
    if (!this.newWord.trim()) return;

    this.translationService.requestTranslation(
      this.newWord.trim(),
      this.sourceLang,
      this.targetLang
    ).subscribe({
      next: (res: TranslationResponse) => {
        if (res.translations.length) {
          this.newTranslation = res.translations[0];
          if (res.grammar) {
            this.newGrammarData = res.grammar;
          }
          this.isAutoTranslation = true;
          this.isManualTranslation = false;
          console.log('✅ Перевод получен:', res.translations);
        }
      },
      error: (err: unknown) => {
        console.error('❌ Ошибка перевода:', err);
        // Можно добавить уведомление об ошибке
      }
    });
  }

  canSave(): boolean {
    return this.newWord.trim().length > 0 && 
           (this.newTranslation.trim().length > 0 || this.isAutoTranslation);
  }

  onSave(): void {
    if (!this.canSave()) return;

    const result: AddWordDialogResult = {
      word: this.newWord.trim(),
      translation: this.newTranslation.trim(),
      type: this.data.type,
      sourceLang: this.sourceLang,
      targetLang: this.targetLang,
      grammar: this.newGrammarData || undefined,
      isManual: this.isManualTranslation
    };

    this.dialogRef.close(result);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
} 