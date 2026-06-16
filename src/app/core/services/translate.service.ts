import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TranslationTarget = 'es' | 'en';

export interface TranslateResponse {
  translatedText: string;
}

@Injectable({
  providedIn: 'root'
})
export class TranslateService {

  // Endpoint desplegado en Vercel
  private readonly apiUrl =
    'https://techhire-dashboard.vercel.app/api/translate';

  constructor(private http: HttpClient) {}

  translate(
    text: string,
    target: TranslationTarget
  ): Observable<TranslateResponse> {

    return this.http.post<TranslateResponse>(
      this.apiUrl,
      {
        text,
        target
      }
    );
  }
}