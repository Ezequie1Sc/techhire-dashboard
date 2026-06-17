import { Injectable } from '@angular/core';
import { ES } from './es';
import { EN } from './en';

@Injectable({
  providedIn: 'root'
})
export class TranslationService {

  private lang: 'es' | 'en' =
    (localStorage.getItem('lang') as 'es' | 'en') || 'es';

  private translations = {
    es: ES,
    en: EN
  };

  setLanguage(lang: 'es' | 'en') {
    this.lang = lang;
    localStorage.setItem('lang', lang);
  }

  get currentLanguage(): 'es' | 'en' {
    return this.lang;
  }

  translate(path: string): string {
    const keys = path.split('.');

    let value: any = this.translations[this.lang];

    for (const key of keys) {
      if (value && value[key] !== undefined) {
        value = value[key];
      } else {
        return path; // Si no encuentra la clave, retorna el path literal
      }
    }

    return value || path;
  }
}