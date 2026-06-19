import {
  Component,
  OnInit,
  AfterViewInit,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { JobService } from '../../core/services/job.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { TranslateService } from '../../core/services/translate.service';
import { Job } from '../../models/job.model';

import { JobCardComponent } from '../../shared/components/job-card/job-card.component';

type HomeJobsLanguage = 'original' | 'es' | 'en';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, JobCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  @ViewChild('jobsCarousel') jobsCarousel!: ElementRef<HTMLDivElement>;
  @ViewChild('categoriesCarousel') categoriesCarousel!: ElementRef<HTMLDivElement>;

  latestJobs: Job[] = [];
  originalLatestJobs: Job[] = [];

  loading = false;
  error: string | null = null;

  selectedHomeJobsLanguage: HomeJobsLanguage = 'original';
  translatingHomeJobs = false;
  homeTranslationError: string | null = null;

  techCategories = [
    'Frontend',
    'Backend',
    'Mobile',
    'Cloud',
    'DevOps',
    'Data',
    'Cybersecurity'
  ];

  techRoles = [
    'Frontend',
    'Backend',
    'Mobile',
    'DevOps',
    'Data',
    'AI/ML',
    'Cloud'
  ];

  constructor(
    private jobService: JobService,
    private translateService: TranslateService,
    public translationService: TranslationService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLatestJobs();
  }

  ngAfterViewInit(): void {
    const carousel = this.categoriesCarousel?.nativeElement;

    if (!carousel) return;

    carousel.addEventListener('touchstart', () => {
      carousel.classList.add('is-touching');
    });

    carousel.addEventListener('touchend', () => {
      setTimeout(() => {
        carousel.classList.remove('is-touching');
      }, 100);
    });

    carousel.addEventListener('touchcancel', () => {
      carousel.classList.remove('is-touching');
    });

    carousel.addEventListener('scroll', () => {
      carousel.classList.add('is-touching');
      clearTimeout((carousel as any)._scrollTimeout);

      (carousel as any)._scrollTimeout = setTimeout(() => {
        carousel.classList.remove('is-touching');
      }, 1500);
    });
  }

  loadLatestJobs(): void {
    this.loading = true;
    this.error = null;
    this.latestJobs = [];
    this.originalLatestJobs = [];
    this.selectedHomeJobsLanguage = 'original';
    this.homeTranslationError = null;

    this.jobService.getJobs(1)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          // 1. Obtener todos los datos de la respuesta
          const allJobs = response.data || [];

          // 2.  ORDENAR POR FECHA (Los más recientes primero)
          const sortedJobs = allJobs.sort((a, b) => {
            const dateA = a.created_at || 0;
            const dateB = b.created_at || 0;
            return dateB - dateA; // Orden descendente
          });

          // 3. Tomar solo los primeros 8 trabajos (los más recientes)
          const latest = sortedJobs.slice(0, 8);

          // 4. Guardar en las variables del componente
          this.originalLatestJobs = latest.map(job => ({ ...job }));
          this.latestJobs = latest.map(job => ({ ...job }));

          if (this.latestJobs.length === 0) {
            this.error = 'No se encontraron vacantes disponibles.';
          }
        },
        error: () => {
          this.error = 'No se pudieron cargar las vacantes.';
        }
      });
  }

  changeHomeJobsLanguage(language: HomeJobsLanguage): void {
    this.selectedHomeJobsLanguage = language;
    this.homeTranslationError = null;

    if (language === 'original') {
      this.latestJobs = this.originalLatestJobs.map(job => ({ ...job }));
      this.cdr.detectChanges();
      return;
    }

    this.translateHomeJobs(language);
  }

  private translateHomeJobs(target: 'es' | 'en'): void {
    if (!this.originalLatestJobs.length) return;

    this.translatingHomeJobs = true;
    this.homeTranslationError = null;
    this.cdr.detectChanges();

    const requests = this.originalLatestJobs.map((job) => {
      const cacheKey = `home_job_translation_${job.slug}_${target}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        return of({
          ...job,
          ...JSON.parse(cached)
        });
      }

      const textToTranslate = [
        job.title || '',
        job.job_types?.join(' · ') || '',
        job.tags?.join(' · ') || ''
      ].join('\n');

      return this.translateService.translate(textToTranslate, target).pipe(
        map((response) => {
          const parts = (response.translatedText || '').split('\n');

          const translatedJob: Partial<Job> = {
            title: parts[0] || job.title,
            job_types: parts[1]
              ? parts[1].split(' · ').map(item => item.trim()).filter(Boolean)
              : job.job_types,
            tags: parts[2]
              ? parts[2].split(' · ').map(item => item.trim()).filter(Boolean)
              : job.tags
          };

          localStorage.setItem(cacheKey, JSON.stringify(translatedJob));

          return {
            ...job,
            ...translatedJob
          };
        }),
        catchError(() => of(job))
      );
    });

    forkJoin(requests).subscribe({
      next: (translatedJobs) => {
        this.latestJobs = translatedJobs;
        this.translatingHomeJobs = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.homeTranslationError = 'No se pudieron traducir las vacantes recientes.';
        this.translatingHomeJobs = false;
        this.cdr.detectChanges();
      }
    });
  }

  // Método para cambiar el idioma de la interfaz
  changeInterfaceLanguage(lang: 'es' | 'en'): void {
    this.translationService.setLanguage(lang);
    this.cdr.detectChanges();
  }

  // Método auxiliar para traducciones
  t(key: string): string {
    return this.translationService.translate(key);
  }

  goToJobs(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.router.navigate(['/jobs']);
  }

  goToFavorites(): void {
    window.scrollTo({ top: 0, behavior: 'auto' });
    this.router.navigate(['/favorites']);
  }

  scrollCarousel(direction: 'left' | 'right'): void {
    const carousel = this.jobsCarousel?.nativeElement;
    if (!carousel) return;

    const scrollAmount = carousel.clientWidth * 0.85;

    carousel.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  scrollCategories(direction: 'left' | 'right'): void {
    const carousel = this.categoriesCarousel?.nativeElement;
    if (!carousel) return;

    const scrollAmount = 200;

    carousel.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }
}