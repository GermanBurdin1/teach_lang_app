import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AdjectiveGrammar, AdverbGrammar, ConjunctionGrammar, GrammarData, InterjectionGrammar, NounGrammar, PartOfSpeech, PrepositionGrammar, PronounGrammar, VerbGrammar } from '../models/grammar-data.model';

@Component({
  selector: 'app-grammar-fields',
  standalone: true,
  templateUrl: './grammar-fields.component.html',
  imports: [FormsModule, CommonModule],
})
export class GrammarFieldsComponent {
  @Input() grammar: GrammarData | undefined;
  @Input() onChange: (g: GrammarData) => void = () => {};
  @Output() grammarChange = new EventEmitter<GrammarData>();

  partOfSpeechOptions: PartOfSpeech[] = [
    'noun', 'verb', 'adjective', 'adverb',
    'pronoun', 'preposition', 'conjunction', 'interjection'
  ];

  onPartOfSpeechSelect(partOfSpeech: PartOfSpeech) {
    const newGrammar: GrammarData = { partOfSpeech };
    this.grammarChange.emit(newGrammar); // ✅
  }

  updateField(key: string, value: any) {
    if (!this.grammar) return;
    (this.grammar as any)[key] = value;
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
      this.grammarChange.emit(this.grammar);
    }
  }



}
