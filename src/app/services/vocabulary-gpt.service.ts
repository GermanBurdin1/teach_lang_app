import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../core/constants/api.constants';

@Injectable({
  providedIn: 'root'
})
export class VocabularyGptService {
  private readonly API_URL = `${API_ENDPOINTS.VOCABULARY}/gpt/classify`;

  constructor(private http: HttpClient) {}

  classifyWord(word: string, userId: string): Observable<{ theme: string; subtheme: string }> {
    return this.http.post<{ theme: string; subtheme: string }>(this.API_URL, {
      text: word,
      userId
    });
  }
}
