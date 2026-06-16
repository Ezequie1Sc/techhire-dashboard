import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TranslateService {

  private readonly apiUrl =
    'https://techhire-dashboard.vercel.app/api/translate';

  constructor(private http: HttpClient) {}

  translate(text: string, target: 'es' | 'en') {
    return this.http.post<any>(this.apiUrl, {
      text,
      target
    });
  }
}