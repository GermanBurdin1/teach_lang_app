import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { AdjectiveGrammar, AdverbGrammar, ConjunctionGrammar, ExpressionGrammar, GrammarData, InterjectionGrammar, NounGrammar, PartOfSpeech, PrepositionGrammar, PronounGrammar, VerbGrammar } from '../models/grammar-data.model';

@Component({
  selector: 'app-grammar-fields',
  standalone: true,
  templateUrl: './grammar-fields.component.html',
  imports: [
    FormsModule, 
    CommonModule, 
    MatSelectModule, 
    MatOptionModule, 
    MatFormFieldModule, 
    MatInputModule, 
    MatCheckboxModule, 
    MatButtonModule
  ],
  styleUrls: ['./grammar-fields.component.css']
})
export class GrammarFieldsComponent {
  @Input() grammar: GrammarData | undefined;
  @Input() onChange: (g: GrammarData) => void = () => {};
  @Output() grammarChange = new EventEmitter<GrammarData>();
  @Output() grammarValidate = new EventEmitter<GrammarData>(); // 👈 ДОБАВЬ ЭТО
  @Input() showValidateButton = true;


  partOfSpeechOptions: PartOfSpeech[] = [
    'noun', 'verb', 'adjective', 'adverb',
    'pronoun', 'preposition', 'conjunction', 'interjection', 'expression'
  ];

  onPartOfSpeechSelect(partOfSpeech: PartOfSpeech) {
    const newGrammar: GrammarData = { partOfSpeech };
    this.grammarChange.emit(newGrammar); // ✅
  }

  updateField(key: string, value: unknown) {
    if (!this.grammar) return;
    (this.grammar as unknown as Record<string, unknown>)[key] = value;
    this.grammarChange.emit(this.grammar); // ✅
  }


  get noun(): NounGrammar | null {
    return this.grammar?.partOfSpeech === 'noun' ? this.grammar as NounGrammar : null;
  }

  get verb(): VerbGrammar | null {
    return this.grammar?.partOfSpeech === 'verb' ? this.grammar as VerbGrammar : null;
  }

  get adjective(): AdjectiveGrammar | null {
    return this.grammar?.partOfSpeech === 'adjective' ? this.grammar as AdjectiveGrammar : null;
  }

  get adverb(): AdverbGrammar | null {
    return this.grammar?.partOfSpeech === 'adverb' ? this.grammar as AdverbGrammar : null;
  }

  get pronoun(): PronounGrammar | null {
    return this.grammar?.partOfSpeech === 'pronoun' ? this.grammar as PronounGrammar : null;
  }

  get preposition(): PrepositionGrammar | null {
    return this.grammar?.partOfSpeech === 'preposition' ? this.grammar as PrepositionGrammar : null;
  }

  get conjunction(): ConjunctionGrammar | null {
    return this.grammar?.partOfSpeech === 'conjunction' ? this.grammar as ConjunctionGrammar : null;
  }

  get interjection(): InterjectionGrammar | null {
    return this.grammar?.partOfSpeech === 'interjection' ? this.grammar as InterjectionGrammar : null;
  }

  validate() {
    if (this.grammar) {
      console.log('✅ validate called'); // ← ты уже видишь это
      console.log('📤 emit grammarChange with:', this.grammar);
      this.grammarValidate.emit(this.grammar);
    } else {
      console.warn('⚠️ validate called but grammar is undefined');
    }
  }

  get expression(): ExpressionGrammar | null {
    return this.grammar?.partOfSpeech === 'expression' ? this.grammar as ExpressionGrammar : null;
  }

}
