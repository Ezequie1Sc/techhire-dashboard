import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { JobService } from '../../core/services/job.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { TranslateService } from '../../core/services/translate.service';
import { Job } from '../../models/job.model';

import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { NotFoundComponent } from '../not-found/not-found.component';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HttpClientModule,
    FormsModule,
    LoaderComponent,
    NotFoundComponent
  ],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.css']
})
export class JobDetailComponent implements OnInit {
  job: Job | undefined;
  loading = true;
  isFavorite = false;
  error: string | null = null;
  currentLanguage: 'es' | 'en' = 'es';
  translating = false;
  // Map para guardar la descripción original sin modificar el modelo
  private originalDescription = '';

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
    private favoriteService: FavoriteService,
    private translateService: TranslateService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (slug) {
      this.loadJobDetails(slug);
    } else {
      this.job = undefined;
      this.error = null;
      this.loading = false;
    }
  }

  loadJobDetails(slug: string): void {
    this.loading = true;
    this.error = null;
    this.job = undefined;

    this.jobService.getJobBySlug(slug).subscribe({
      next: (job) => {
        this.job = job || undefined;

        if (this.job) {
          this.isFavorite = this.favoriteService.isFavorite(slug);
          // Guardar la descripción original en una variable separada
          this.originalDescription = this.job.description;
        }

        this.loading = false;
      },
      error: () => {
        this.job = undefined;
        this.error = null;
        this.loading = false;
      }
    });
  }

  toggleFavorite(): void {
    if (this.job) {
      this.favoriteService.toggleFavorite(this.job);
      this.isFavorite = !this.isFavorite;
    }
  }

  toggleLanguage(): void {
    if (!this.job) return;

    const newLanguage = this.currentLanguage === 'es' ? 'en' : 'es';
    this.translating = true;

    // Si estamos cambiando a español y tenemos descripción original, usarla
    if (newLanguage === 'es' && this.originalDescription) {
      this.job.description = this.originalDescription;
      this.currentLanguage = newLanguage;
      this.translating = false;
      return;
    }

    // Si estamos cambiando a inglés
    this.translateService.translate(this.job.description, newLanguage).subscribe({
      next: (response) => {
        if (this.job) {
          // Si es la primera vez que traducimos, guardar la original
          if (!this.originalDescription) {
            this.originalDescription = this.job.description;
          }
          
          this.job.description = response.translatedText;
          this.currentLanguage = newLanguage;
        }
        this.translating = false;
      },
      error: () => {
        // Si hay error, restaurar idioma original
        if (this.job && this.originalDescription) {
          this.job.description = this.originalDescription;
          this.currentLanguage = 'es';
        }
        this.translating = false;
      }
    });
  }

  get formattedDate(): string {
    if (!this.job) return '';

    return new Date(this.job.created_at * 1000).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}