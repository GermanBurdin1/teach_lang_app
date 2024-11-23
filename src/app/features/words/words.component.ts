import { Component } from '@angular/core';

@Component({
  selector: 'app-words',
  templateUrl: './words.component.html',
  styleUrls: ['./words.component.css']
})
export class WordsComponent {
  activeTab: string = 'studying'; // Default tab
  filter: string = 'allWords'; // Default filter
  selectedLanguage: string = 'RU > EN'; // Default language
  newWord: string = '';
  studyingWords: string[] = [];
  completedWords: string[] = [];

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  addWord(): void {
    if (this.newWord.trim()) {
      this.studyingWords.push(this.newWord.trim());
      this.newWord = '';
    }
  }
}
