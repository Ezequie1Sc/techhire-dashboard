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
          const allJobs = response.data || [];
          const sortedJobs = allJobs.sort((a, b) => {
            const dateA = a.created_at || 0;
            const dateB = b.created_at || 0;
            return dateB - dateA; 
          });

          const latest = sortedJobs.slice(0, 8);

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

  // 🔥 NUEVA LÓGICA ROBUSTA: 2 llamadas por trabajo
  private translateHomeJobs(target: 'es' | 'en'): void {
    if (!this.originalLatestJobs.length) return;

    this.translatingHomeJobs = true;
    this.homeTranslationError = null;
    this.cdr.detectChanges();

    const requests = this.originalLatestJobs.map((job) => {
      const cacheKey = `home_job_translation_${job.slug}_${target}`;
      const cached = localStorage.getItem(cacheKey);

      // Si ya está en caché, lo devolvemos directamente
      if (cached) {
        return of({
          ...job,
          ...JSON.parse(cached)
        });
      }

      // 1. Traducir Título (solo el título)
      const titleRequest = this.translateService.translate(job.title || '', target).pipe(
        map(res => res.translatedText || job.title)
      );

      // 2. Traducir el resto del contenido (Descripción + Tipos + Tags)
      //    Se juntan con saltos de línea para que la API los mantenga
      const bodyText = [
        job.description || '',
        job.job_types?.join(' · ') || '',
        job.tags?.join(' · ') || ''
      ].join('\n\n');

      const bodyRequest = this.translateService.translate(bodyText, target).pipe(
        map(res => {
          const parts = (res.translatedText || '').split('\n\n');
          return {
            description: parts[0] || job.description,
            job_types: parts[1] ? parts[1].split(' · ').map(item => item.trim()).filter(Boolean) : job.job_types,
            tags: parts[2] ? parts[2].split(' · ').map(item => item.trim()).filter(Boolean) : job.tags
          };
        })
      );

      // Ejecutamos ambas traducciones en paralelo
      return forkJoin([titleRequest, bodyRequest]).pipe(
        map(([translatedTitle, translatedBody]) => {
          const translatedJob: Partial<Job> = {
            title: translatedTitle,
            description: translatedBody.description,
            job_types: translatedBody.job_types,
            tags: translatedBody.tags
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

  changeInterfaceLanguage(lang: 'es' | 'en'): void {
    this.translationService.setLanguage(lang);
    this.cdr.detectChanges();
  }

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