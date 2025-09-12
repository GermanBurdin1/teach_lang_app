import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Word {
  id: string;
  word: string;
  translation: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class VocabularyService {
  private apiUrl = '/api/vocabulary';

  constructor(private http: HttpClient) {}

  getWords(): Observable<Word[]> {
    return this.http.get<Word[]>(`${this.apiUrl}/words`);
  }

  addWord(word: string): Observable<Word> {
    return this.http.post<Word>(`${this.apiUrl}/add`, { word });
  }

  deleteWord(wordId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/delete/${wordId}`);
  }
}
