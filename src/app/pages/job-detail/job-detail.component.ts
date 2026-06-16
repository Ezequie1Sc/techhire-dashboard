import { Component, OnInit, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';

import { JobService } from '../../core/services/job.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { TranslateService, TranslationTarget } from '../../core/services/translate.service';
import { Job } from '../../models/job.model';

import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { NotFoundComponent } from '../not-found/not-found.component';

type TranslationView = 'original' | 'es' | 'en';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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

  selectedTranslation: TranslationView = 'original';
  displayDescription = '';
  isTranslating = false;
  translationError: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
    private favoriteService: FavoriteService,
    private translateService: TranslateService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');

    if (slug) {
      this.loadJobDetails(slug);
      return;
    }

    this.job = undefined;
    this.error = null;
    this.loading = false;
  }

  loadJobDetails(slug: string): void {
    this.loading = true;
    this.error = null;
    this.job = undefined;
    this.resetTranslation();

    this.jobService.getJobBySlug(slug).subscribe({
      next: (job) => {
        this.job = job || undefined;

        if (this.job) {
          this.isFavorite = this.favoriteService.isFavorite(slug);
          this.displayDescription = this.job.description || '';
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.job = undefined;
        this.error = null;
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  toggleFavorite(): void {
    if (!this.job) return;

    this.favoriteService.toggleFavorite(this.job);
    this.isFavorite = !this.isFavorite;
  }

  showOriginal(): void {
    this.selectedTranslation = 'original';
    this.translationError = null;
    this.displayDescription = this.job?.description || '';
    this.cdr.detectChanges();
  }

  translateDescription(target: TranslationTarget): void {
    if (!this.job?.description || !this.job?.slug) return;

    const cacheKey = this.getTranslationCacheKey(this.job.slug, target);
    const cachedTranslation = localStorage.getItem(cacheKey);

    this.translationError = null;

    if (cachedTranslation) {
      this.selectedTranslation = target;
      this.displayDescription = cachedTranslation;
      this.isTranslating = false;
      this.cdr.detectChanges();
      return;
    }

    this.isTranslating = true;
    this.cdr.detectChanges();

    this.translateService.translate(this.job.description, target).subscribe({
      next: (response) => {
        this.zone.run(() => {
          const translatedText = response?.translatedText?.trim();

          if (!translatedText) {
            this.translationError = 'No se recibió una traducción válida.';
            this.isTranslating = false;
            this.cdr.detectChanges();
            return;
          }

          this.selectedTranslation = target;
          this.displayDescription = translatedText;
          localStorage.setItem(cacheKey, translatedText);

          this.isTranslating = false;
          this.cdr.detectChanges();
        });
      },
      error: (error) => {
        this.zone.run(() => {
          console.error('Error al traducir:', error);
          this.translationError = 'No se pudo traducir. Intenta otra vez.';
          this.isTranslating = false;
          this.cdr.detectChanges();
        });
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

  private resetTranslation(): void {
    this.selectedTranslation = 'original';
    this.displayDescription = '';
    this.isTranslating = false;
    this.translationError = null;
  }

  private getTranslationCacheKey(slug: string, target: TranslationTarget): string {
    return `job_translation_${slug}_${target}`;
  }
}