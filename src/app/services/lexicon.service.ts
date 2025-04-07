import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

interface WordCard {
  word: string;
  translation: string;
  galaxy: string;
  subtopic: string;
  type: 'word' | 'expression';
}

@Injectable({
  providedIn: 'root'
})
export class LexiconService {

  private apiUrl = 'http://localhost:3000/lexicon'; 

  constructor(private http: HttpClient) {}

  addWord(card: WordCard): Observable<any> {
    return this.http.post(`${this.apiUrl}`, card);
  }

  getWordsByGalaxyAndSubtopic(galaxy: string, subtopic: string): Observable<WordCard[]> {
    return this.http.get<WordCard[]>(`${this.apiUrl}?galaxy=${galaxy}&subtopic=${subtopic}`);
  }
}
