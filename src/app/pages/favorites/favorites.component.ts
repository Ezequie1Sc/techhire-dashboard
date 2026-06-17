import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { FavoriteService } from '../../core/services/favorite.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { Job } from '../../models/job.model';
import { JobCardComponent } from '../../shared/components/job-card/job-card.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    JobCardComponent
  ],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  favorites: Job[] = [];

  constructor(
    private favoriteService: FavoriteService,
    public translation: TranslationService
  ) {}

  ngOnInit(): void {
    this.favoriteService.favorites$.subscribe(favorites => {
      this.favorites = favorites;
    });
  }

  clearAllFavorites(): void {
    this.favoriteService.clearFavorites();
  }
}