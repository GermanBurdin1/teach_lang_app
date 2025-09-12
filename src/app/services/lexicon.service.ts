import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { GrammarData } from '../features/vocabulary/models/grammar-data.model';
import { AuthService } from './auth.service';

interface LexiconResponse {
  success: boolean;
  word?: BackendWordCard;
  [key: string]: unknown;
}

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
  postponed?: boolean;
  userId?: string;
}


@Injectable({
  providedIn: 'root'
})
export class LexiconService {

  private apiUrl = 'http://localhost:3000/lexicon';

  constructor(private http: HttpClient, private authService: AuthService) {}

  getWordsByGalaxyAndSubtopic(galaxy: string, subtopic: string): Observable<BackendWordCard[]> {
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id || '';
    return this.http.get<BackendWordCard[]>(`${this.apiUrl}?galaxy=${galaxy}&subtopic=${subtopic}&userId=${userId}`);
  }

  updateWordStatus(id: number, status: 'learned' | 'repeat' | 'error' | null): Observable<LexiconResponse> {
    return this.http.patch<LexiconResponse>(`http://localhost:3000/lexicon/${id}/status`, { status });
  }

  revealWord(id: number): Observable<LexiconResponse> {
    return this.http.patch<LexiconResponse>(`http://localhost:3000/lexicon/${id}/reveal`, {});
  }

  addWord(card: BackendWordCard): Observable<LexiconResponse> {
    const currentUser = this.authService.getCurrentUser();
    const cardWithUserId = {
      ...card,
      userId: currentUser?.id || null
    };
    
    return this.http.post<LexiconResponse>(`${this.apiUrl}`, cardWithUserId).pipe(
      catchError(err => {
        console.error('❌ Ошибка при добавлении слова:', err);
        return throwError(() => err);
      })
    );
  }

  addMultipleWords(cards: BackendWordCard[]): Observable<LexiconResponse[]> {
    const currentUser = this.authService.getCurrentUser();
    const cardsWithUserId = cards.map(card => ({
      ...card,
      userId: currentUser?.id || null
    }));
    
    return this.http.post<LexiconResponse[]>(`${this.apiUrl}/bulk`, cardsWithUserId).pipe(
      catchError(err => {
        console.error('❌ Ошибка при множественном добавлении слов:', err);
        return throwError(() => err);
      })
    );
  }

  updateGrammar(id: number, grammar: GrammarData): Observable<LexiconResponse> {
    return this.http.patch<LexiconResponse>(`http://localhost:3000/grammar/${id}`, grammar).pipe(
      catchError(err => {
        console.error('❌ Ошибка при обновлении грамматики:', err);
        return throwError(() => err);
      })
    );
  }

  updateWord(id: number, updates: Partial<BackendWordCard>): Observable<BackendWordCard> {
    return this.http.patch<BackendWordCard>(`${this.apiUrl}/${id}`, updates);
  }

  deleteWord(id: number): Observable<LexiconResponse> {
    return this.http.delete<LexiconResponse>(`${this.apiUrl}/${id}`).pipe(
      catchError(err => {
        console.error('❌ Ошибка при удалении слова:', err);
        return throwError(() => err);
      })
    );
  }

  getLearnedWordsCount(): Observable<{ count: number }> {
    const currentUser = this.authService.getCurrentUser();
    const userId = currentUser?.id;
    
    if (!userId) {
      console.warn('⚠️ Нет текущего пользователя для получения статистики');
      return throwError(() => new Error('Пользователь не аутентифицирован'));
    }
    
    return this.http.get<{ count: number }>(`${this.apiUrl}/learned/count/${userId}`);
  }

}
