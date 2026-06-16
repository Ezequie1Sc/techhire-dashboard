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
  
  // Guardar título y descripción original
  private originalTitle = '';
  private originalDescription = '';
  // Guardar título y descripción en inglés
  private englishTitle = '';
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
          // Guardar título y descripción original
          this.originalTitle = this.job.title;
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
        this.job.title = this.originalTitle;
        this.job.description = this.originalDescription;
        this.currentLanguage = 'original';
        this.translating = false;
        break;
        
      case 'es':
        // Traducir al español
        if (this.currentLanguage === 'original') {
          // Traducir título y descripción
          this.translateService.translate(this.originalTitle, 'es').subscribe({
            next: (responseTitle) => {
              if (this.job) {
                this.job.title = responseTitle.translatedText;
                
                // Traducir descripción
                this.translateService.translate(this.originalDescription, 'es').subscribe({
                  next: (responseDesc) => {
                    if (this.job) {
                      this.job.description = responseDesc.translatedText;
                      this.currentLanguage = 'es';
                      this.translating = false;
                    }
                  },
                  error: () => {
                    // Si falla descripción, restaurar
                    if (this.job) {
                      this.job.description = this.originalDescription;
                      this.currentLanguage = 'original';
                    }
                    this.translating = false;
                  }
                });
              }
            },
            error: () => {
              // Si falla título, restaurar
              if (this.job) {
                this.job.title = this.originalTitle;
                this.job.description = this.originalDescription;
                this.currentLanguage = 'original';
              }
              this.translating = false;
            }
          });
        } else if (this.currentLanguage === 'en' && this.originalTitle) {
          // Si estamos en inglés, volver a original y luego traducir a español
          this.job.title = this.originalTitle;
          this.job.description = this.originalDescription;
          
          this.translateService.translate(this.originalTitle, 'es').subscribe({
            next: (responseTitle) => {
              if (this.job) {
                this.job.title = responseTitle.translatedText;
                
                this.translateService.translate(this.originalDescription, 'es').subscribe({
                  next: (responseDesc) => {
                    if (this.job) {
                      this.job.description = responseDesc.translatedText;
                      this.currentLanguage = 'es';
                      this.translating = false;
                    }
                  },
                  error: () => {
                    if (this.job) {
                      this.job.description = this.originalDescription;
                      this.currentLanguage = 'original';
                    }
                    this.translating = false;
                  }
                });
              }
            },
            error: () => {
              if (this.job) {
                this.job.title = this.originalTitle;
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
          if (this.englishTitle && this.englishDescription) {
            this.job.title = this.englishTitle;
            this.job.description = this.englishDescription;
            this.currentLanguage = 'en';
            this.translating = false;
          } else {
            // Traducir título
            this.translateService.translate(this.originalTitle, 'en').subscribe({
              next: (responseTitle) => {
                if (this.job) {
                  this.englishTitle = responseTitle.translatedText;
                  this.job.title = this.englishTitle;
                  
                  // Traducir descripción
                  this.translateService.translate(this.originalDescription, 'en').subscribe({
                    next: (responseDesc) => {
                      if (this.job) {
                        this.englishDescription = responseDesc.translatedText;
                        this.job.description = this.englishDescription;
                        this.currentLanguage = 'en';
                        this.translating = false;
                      }
                    },
                    error: () => {
                      if (this.job) {
                        this.job.description = this.originalDescription;
                        this.currentLanguage = 'original';
                      }
                      this.translating = false;
                    }
                  });
                }
              },
              error: () => {
                if (this.job) {
                  this.job.title = this.originalTitle;
                  this.job.description = this.originalDescription;
                  this.currentLanguage = 'original';
                }
                this.translating = false;
              }
            });
          }
        } else if (this.currentLanguage === 'es' && this.originalTitle) {
          // Si estamos en español, volver a original y luego traducir a inglés
          this.job.title = this.originalTitle;
          this.job.description = this.originalDescription;
          
          if (this.englishTitle && this.englishDescription) {
            this.job.title = this.englishTitle;
            this.job.description = this.englishDescription;
            this.currentLanguage = 'en';
            this.translating = false;
          } else {
            this.translateService.translate(this.originalTitle, 'en').subscribe({
              next: (responseTitle) => {
                if (this.job) {
                  this.englishTitle = responseTitle.translatedText;
                  this.job.title = this.englishTitle;
                  
                  this.translateService.translate(this.originalDescription, 'en').subscribe({
                    next: (responseDesc) => {
                      if (this.job) {
                        this.englishDescription = responseDesc.translatedText;
                        this.job.description = this.englishDescription;
                        this.currentLanguage = 'en';
                        this.translating = false;
                      }
                    },
                    error: () => {
                      if (this.job) {
                        this.job.description = this.originalDescription;
                        this.currentLanguage = 'original';
                      }
                      this.translating = false;
                    }
                  });
                }
              },
              error: () => {
                if (this.job) {
                  this.job.title = this.originalTitle;
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