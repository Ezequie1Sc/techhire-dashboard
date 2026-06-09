import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoriteService } from '../../core/services/favorite.service';
import { Job } from '../../models/job.model';
import { JobCardComponent } from '../../shared/components/job-card/job-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [CommonModule, JobCardComponent, EmptyStateComponent],
  templateUrl: './favorites.component.html',
  styleUrls: ['./favorites.component.css']
})
export class FavoritesComponent implements OnInit {
  favorites: Job[] = [];

  constructor(private favoriteService: FavoriteService) {}

  ngOnInit(): void {
    this.favoriteService.favorites$.subscribe(favorites => {
      this.favorites = favorites;
    });
  }

  clearAllFavorites(): void {
    this.favoriteService.clearFavorites();
  }
}