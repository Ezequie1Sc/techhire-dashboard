import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TranslationTarget = 'es' | 'en';

interface TranslateResponse {
  translatedText: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslateService {
  private readonly apiUrl = 'https://libretranslate.com/translate';

  constructor(private http: HttpClient) {}

  translate(text: string, target: TranslationTarget): Observable<TranslateResponse> {
    return this.http.post<TranslateResponse>(this.apiUrl, {
      q: text,
      source: 'auto',
      target,
      format: 'html'
    });
  }
}