import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VocabularyGptService {
  private readonly API_URL = 'http://localhost:3000/gpt/classify'; 
  constructor(private http: HttpClient) {}

  classifyWord(word: string, userId: string): Observable<{ theme: string; subtheme: string }> {
    return this.http.post<{ theme: string; subtheme: string }>(this.API_URL, {
      text: word,
      userId
    });
  }
}
