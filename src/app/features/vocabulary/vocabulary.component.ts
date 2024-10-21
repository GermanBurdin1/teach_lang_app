import { Component, OnInit } from '@angular/core';
import { VocabularyService } from './vocabulary.service';

@Component({
  selector: 'app-vocabulary',
  templateUrl: './vocabulary.component.html',
  styleUrls: ['./vocabulary.component.css'],
})
export class VocabularyComponent implements OnInit {
  words: any[] = [];
  newWord: string = '';

  constructor(private vocabularyService: VocabularyService) {}

  ngOnInit(): void {
    this.loadWords();
  }

  loadWords(): void {
    this.vocabularyService.getWords().subscribe(data => {
      this.words = data;
    });
  }

  addWord(): void {
    if (this.newWord.trim()) {
      this.vocabularyService.addWord(this.newWord).subscribe(() => {
        this.loadWords();
        this.newWord = '';
      });
    }
  }

  deleteWord(wordId: number): void {
    this.vocabularyService.deleteWord(wordId).subscribe(() => {
      this.loadWords();
    });
  }
}
