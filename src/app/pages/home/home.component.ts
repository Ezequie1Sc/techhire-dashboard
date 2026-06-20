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
import { finalize, forkJoin, lastValueFrom } from 'rxjs';
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

  // 🔥 FUNCIÓN CORREGIDA Y SIN ERRORES DE TIPADO
  private async translateHomeJobs(target: 'es' | 'en'): Promise<void> {
    if (!this.originalLatestJobs.length) return;

    this.translatingHomeJobs = true;
    this.homeTranslationError = null;
    this.cdr.detectChanges();

    const requests = this.originalLatestJobs.map((job) => {
      const cacheKey = `home_job_translation_${job.slug}_${target}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        return Promise.resolve({
          ...job,
          ...parsed
        });
      }

      // Limpiar HTML de la descripción para que el traductor no falle
      const cleanDescription = (job.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      // Título
      const titleRequest = this.translateService.translate(job.title || '', target).pipe(
        map(res => res.translatedText || job.title),
        catchError(() => job.title)
      );

      // Descripción
      const descriptionRequest = this.translateService.translate(cleanDescription, target).pipe(
        map(res => res.translatedText || cleanDescription),
        catchError(() => cleanDescription)
      );

      // Usamos forkJoin + lastValueFrom para obtener los resultados en un solo objeto seguro
      return lastValueFrom(
        forkJoin({
          title: titleRequest,
          description: descriptionRequest
        })
      ).then(({ title, description }) => {
        const translatedJob: Partial<Job> = {
          title,
          description
        };

        localStorage.setItem(cacheKey, JSON.stringify(translatedJob));

        return {
          ...job,
          ...translatedJob
        };
      }).catch(() => job);
    });

    const translatedJobs = await Promise.all(requests);

    this.latestJobs = translatedJobs.map(job => ({ ...job }));
    this.translatingHomeJobs = false;
    this.cdr.detectChanges();
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