import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { GrammarData } from '../features/vocabulary/models/grammar-data.model';
import { API_ENDPOINTS } from '../core/constants/api.constants';

interface TranslationResponse {
  word: string;
  translations: string[];
  sourceLang: string;
  targetLang: string;
  from: 'wiktionary' | 'api' | 'deepl';
  grammar?: GrammarData; // <--- вот здесь добавляем!
}


@Injectable({
  providedIn: 'root'
})
export class TranslationService {
  private apiUrl = `${API_ENDPOINTS.VOCABULARY}/translation`;

  constructor(private http: HttpClient) { }

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

  // translation.service.ts
  updateTranslationExample(payload: {
    translationId: number;
    examples: string[];
  }) {
    return this.http.patch(`/api/translations/${payload.translationId}/examples`, payload);
  }

}
