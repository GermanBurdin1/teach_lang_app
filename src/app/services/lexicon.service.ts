import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { GrammarData } from '../features/vocabulary/models/grammar-data.model';

export interface BackendWordCard {
  id?: number;
  word: string;
  translations?: {
    id: number;
    lexiconId: number;
    source: string;
    target: string;
    sourceLang: string;
    targetLang: string;
    meaning: string;
    example: string | null;
  }[];
  galaxy: string;
  subtopic: string;
  type: 'word' | 'expression';
  createdAt?: number;
  status?: 'learned' | 'repeat' | 'error' | null;
  revealed?: boolean;
  grammar?: GrammarData;
}


@Injectable({
  providedIn: 'root'
})
export class LexiconService {

  private apiUrl = 'http://localhost:3000/lexicon';

  constructor(private http: HttpClient) {}

  addWord(card: BackendWordCard): Observable<any> {
    return this.http.post(`${this.apiUrl}`, card);
  }

  getWordsByGalaxyAndSubtopic(galaxy: string, subtopic: string): Observable<BackendWordCard[]> {
    return this.http.get<BackendWordCard[]>(`${this.apiUrl}?galaxy=${galaxy}&subtopic=${subtopic}`);
  }

  updateWordStatus(id: number, status: 'learned' | 'repeat' | 'error' | null): Observable<any> {
    return this.http.patch(`http://localhost:3000/lexicon/${id}/status`, { status });
  }

  revealWord(id: number): Observable<any> {
    return this.http.patch(`http://localhost:3000/lexicon/${id}/reveal`, {});
  }


}
