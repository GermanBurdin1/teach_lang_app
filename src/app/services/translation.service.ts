import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

interface TranslationResponse {
  word: string;
  translations: string[];
  sourceLang: string;
  targetLang: string;
  from: 'wiktionary' | 'api';
}

@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private apiUrl = 'http://localhost:3000/translation'; // твой backend путь

  constructor(private http: HttpClient) {}

  requestTranslation(
    source: string,
    sourceLang: 'ru' | 'fr' | 'en',
    targetLang: 'ru' | 'fr' | 'en'
  ): Observable<TranslationResponse> {
    return this.http.get<TranslationResponse>(
      `${this.apiUrl}?source=${encodeURIComponent(source)}&sourceLang=${sourceLang}&targetLang=${targetLang}`
    );
  }

  saveTranslation(payload: {
    wordId: number;
    sourceLang: 'ru' | 'fr' | 'en';
    targetLang: 'ru' | 'fr' | 'en';
    source: 'manual' | 'wiktionary' | 'deepl';
    sourceText: string;
    translation: string;
  }) {
    return this.http.post(`${environment.apiUrl}/translation/manual`, payload);
  }

}
