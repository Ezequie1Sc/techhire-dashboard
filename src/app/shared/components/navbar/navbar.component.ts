import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  isMenuOpen = false;
  isLanguageOpen = false;

  constructor(public translation: TranslationService) {}

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  toggleLanguageMenu(): void {
    this.isLanguageOpen = !this.isLanguageOpen;
  }

  changeLanguage(lang: 'es' | 'en'): void {
    this.translation.setLanguage(lang);
    this.isLanguageOpen = false;
    location.reload();
  }

  get currentFlag(): string {
    return this.translation.currentLanguage === 'es'
      ? 'https://flagcdn.com/mx.svg'
      : 'https://flagcdn.com/us.svg';
  }

  get currentLabel(): string {
    return this.translation.currentLanguage === 'es' ? 'ES' : 'EN';
  }
}