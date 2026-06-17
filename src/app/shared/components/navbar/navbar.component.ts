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

  constructor(public translation: TranslationService) {}

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  changeLanguage(lang: 'es' | 'en'): void {
    this.translation.setLanguage(lang);
    location.reload();
  }
}