import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Job } from '../../../models/job.model';
import { FavoriteService } from '../../../core/services/favorite.service';

@Component({
  selector: 'app-job-card',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './job-card.component.html',
  styleUrls: ['./job-card.component.css']
})
export class JobCardComponent {
  @Input() job!: Job;

  constructor(private favoriteService: FavoriteService) {}

  get isFavorite(): boolean {
    return this.favoriteService.isFavorite(this.job.slug);
  }

  toggleFavorite(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.favoriteService.toggleFavorite(this.job);
  }

  get formattedDate(): string {
    return new Date(this.job.created_at * 1000).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}