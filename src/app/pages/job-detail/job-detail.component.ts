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
  
  // Opciones de idioma: 'original' | 'es' | 'en'
  currentLanguage: 'original' | 'es' | 'en' = 'original';
  translating = false;
  
  // Guardar la descripción original
  private originalDescription = '';
  // Guardar la traducción al inglés
  private englishDescription = '';

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
          // Guardar la descripción original
          this.originalDescription = this.job.description;
          
          // Asegurar que el idioma actual sea 'original'
          this.currentLanguage = 'original';
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

  changeLanguage(lang: 'original' | 'es' | 'en'): void {
    if (!this.job) return;
    
    // Si ya está en el idioma seleccionado, no hacer nada
    if (this.currentLanguage === lang) return;
    
    this.translating = true;

    switch (lang) {
      case 'original':
        // Volver al texto original
        this.job.description = this.originalDescription;
        this.currentLanguage = 'original';
        this.translating = false;
        break;
        
      case 'es':
        // Traducir al español
        if (this.currentLanguage === 'original') {
          // Si estamos en original, traducir a español
          this.translateService.translate(this.job.description, 'es').subscribe({
            next: (response) => {
              if (this.job) {
                this.job.description = response.translatedText;
                this.currentLanguage = 'es';
              }
              this.translating = false;
            },
            error: () => {
              this.translating = false;
            }
          });
        } else if (this.currentLanguage === 'en' && this.originalDescription) {
          // Si estamos en inglés, volver a original y luego traducir a español
          this.job.description = this.originalDescription;
          this.translateService.translate(this.job.description, 'es').subscribe({
            next: (response) => {
              if (this.job) {
                this.job.description = response.translatedText;
                this.currentLanguage = 'es';
              }
              this.translating = false;
            },
            error: () => {
              // Si falla, restaurar original
              if (this.job) {
                this.job.description = this.originalDescription;
                this.currentLanguage = 'original';
              }
              this.translating = false;
            }
          });
        }
        break;
        
      case 'en':
        // Traducir al inglés
        if (this.currentLanguage === 'original') {
          // Si tenemos inglés guardado, usarlo
          if (this.englishDescription) {
            this.job.description = this.englishDescription;
            this.currentLanguage = 'en';
            this.translating = false;
          } else {
            // Si no, traducir y guardar
            this.translateService.translate(this.job.description, 'en').subscribe({
              next: (response) => {
                if (this.job) {
                  this.englishDescription = response.translatedText;
                  this.job.description = this.englishDescription;
                  this.currentLanguage = 'en';
                }
                this.translating = false;
              },
              error: () => {
                this.translating = false;
              }
            });
          }
        } else if (this.currentLanguage === 'es' && this.originalDescription) {
          // Si estamos en español, volver a original y luego traducir a inglés
          this.job.description = this.originalDescription;
          
          if (this.englishDescription) {
            this.job.description = this.englishDescription;
            this.currentLanguage = 'en';
            this.translating = false;
          } else {
            this.translateService.translate(this.job.description, 'en').subscribe({
              next: (response) => {
                if (this.job) {
                  this.englishDescription = response.translatedText;
                  this.job.description = this.englishDescription;
                  this.currentLanguage = 'en';
                }
                this.translating = false;
              },
              error: () => {
                // Si falla, restaurar original
                if (this.job) {
                  this.job.description = this.originalDescription;
                  this.currentLanguage = 'original';
                }
                this.translating = false;
              }
            });
          }
        }
        break;
    }
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