import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface TranslationResponse {
  word: string;
  translations: string[];
  sourceLang: string;
  targetLang: string;
  from: 'wiktionary' | 'api';
}

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private readonly API_URL = 'http://localhost:3000/translation';

  constructor(private http: HttpClient) { }

  translate(source: string, sourceLang: string, targetLang: string): Observable<TranslationResponse> {
    return this.http.get<TranslationResponse>(this.API_URL, {
      params: {
        source,
        sourceLang,
        targetLang
      }
    });
  }

}
