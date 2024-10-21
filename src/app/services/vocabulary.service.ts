import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VocabularyService {
  private apiUrl = '/api/vocabulary';

  constructor(private http: HttpClient) {}

  getWords(): Observable<any> {
    return this.http.get(`${this.apiUrl}/words`);
  }

  addWord(word: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/add`, { word });
  }

  deleteWord(wordId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/delete/${wordId}`);
  }
}
