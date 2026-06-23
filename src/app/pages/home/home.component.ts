import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ChangeDetectorRef,
  ElementRef,
  ViewChild
} from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

import { JobService } from '../../core/services/job.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { TranslateService } from '../../core/services/translate.service';
import { Job } from '../../models/job.model';

import { JobCardComponent } from '../../shared/components/job-card/job-card.component';

gsap.registerPlugin(ScrollTrigger);

type HomeJobsLanguage = 'original' | 'es' | 'en';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, JobCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('jobsCarousel') jobsCarousel!: ElementRef<HTMLDivElement>;
  @ViewChild('categoriesCarousel') categoriesCarousel!: ElementRef<HTMLDivElement>;

  latestJobs: Job[] = [];
  originalLatestJobs: Job[] = [];

  loading = false;
  error: string | null = null;

  selectedHomeJobsLanguage: HomeJobsLanguage = 'original';

  translatingHomeJobs = false;
  homeTranslationError: string | null = null;

  private splitInstances: SplitType[] = [];
  private scrollTriggers: ScrollTrigger[] = [];

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
    this.initCategoriesTouch();
    this.initPremiumAnimations();
  }

  ngOnDestroy(): void {
    this.splitInstances.forEach((split) => split.revert());
    this.scrollTriggers.forEach((trigger) => trigger.kill());
  }

  private initCategoriesTouch(): void {
    const carousel = this.categoriesCarousel?.nativeElement;
    if (!carousel) return;

    carousel.addEventListener('touchstart', () => carousel.classList.add('is-touching'));
    carousel.addEventListener('touchend', () => setTimeout(() => carousel.classList.remove('is-touching'), 100));
    carousel.addEventListener('touchcancel', () => carousel.classList.remove('is-touching'));

    carousel.addEventListener('scroll', () => {
      carousel.classList.add('is-touching');
      clearTimeout((carousel as any)._scrollTimeout);
      (carousel as any)._scrollTimeout = setTimeout(() => carousel.classList.remove('is-touching'), 1500);
    });
  }

  private initPremiumAnimations(): void {
    const titleElements = document.querySelectorAll<HTMLElement>('.premium-title');

    titleElements.forEach((title) => {
     const split = new SplitType(title, {
  types: ['words', 'chars']
});

      this.splitInstances.push(split);

      gsap.from(split.chars, {
        opacity: 0,
        y: 42,
        rotateX: -55,
        filter: 'blur(10px)',
        stagger: 0.018,
        duration: 1,
        ease: 'power4.out',
        delay: 0.1
      });
    });

    gsap.utils.toArray<HTMLElement>('.premium-section').forEach((section) => {
      const animation = gsap.from(section, {
        opacity: 0,
        y: 90,
        scale: 0.97,
        filter: 'blur(14px)',
        duration: 1.05,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 84%',
          once: true
        }
      });

      if (animation.scrollTrigger) {
        this.scrollTriggers.push(animation.scrollTrigger);
      }
    });

    gsap.utils.toArray<HTMLElement>('.premium-card').forEach((card) => {
      const animation = gsap.from(card, {
        opacity: 0,
        y: 70,
        scale: 0.95,
        duration: 0.9,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: card,
          start: 'top 88%',
          once: true
        }
      });

      if (animation.scrollTrigger) {
        this.scrollTriggers.push(animation.scrollTrigger);
      }
    });

    gsap.utils.toArray<HTMLElement>('.premium-image').forEach((image) => {
      const animation = gsap.from(image, {
        scale: 1.12,
        opacity: 0,
        duration: 1.2,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: image,
          start: 'top 90%',
          once: true
        }
      });

      if (animation.scrollTrigger) {
        this.scrollTriggers.push(animation.scrollTrigger);
      }
    });

    setTimeout(() => {
      ScrollTrigger.refresh();
    }, 300);
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

          setTimeout(() => {
            ScrollTrigger.refresh();
          }, 150);
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

  private normalizeJobTitle(title: string, language: 'original' | 'es' | 'en'): string {
    if (!title || language === 'original') return title;

    const replacement = language === 'es'
      ? 'Todos los géneros'
      : 'All genders';

    const genderCodePattern =
      /(m\/w\/d|m\/f\/d|w\/m\/d|f\/m\/d|d\/m\/w|d\/w\/m|w\/d\/m|f\/d\/m)/gi;

    return title
      .replace(/\(([^)]*)\)/g, (match, content) => {
        if (!genderCodePattern.test(content)) return match;

        genderCodePattern.lastIndex = 0;

        const normalizedContent = content
          .replace(genderCodePattern, replacement)
          .replace(/todos los géneros/gi, language === 'es' ? 'Todos los géneros' : 'All genders')
          .replace(/all genders/gi, language === 'es' ? 'Todos los géneros' : 'All genders');

        return `(${normalizedContent})`;
      })
      .replace(/\(todos los géneros\)/gi, language === 'es' ? '(Todos los géneros)' : '(All genders)')
      .replace(/\(all genders\)/gi, language === 'es' ? '(Todos los géneros)' : '(All genders)')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private translateHomeJobs(target: 'es' | 'en'): void {
    if (!this.originalLatestJobs.length) return;

    this.translatingHomeJobs = true;
    this.homeTranslationError = null;
    this.cdr.detectChanges();

    const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

    const requests = this.originalLatestJobs.map((job) => {
      const cacheKey = `home_job_translation_v2_${job.slug}_${target}`;
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          const isExpired = !parsed.timestamp || (Date.now() - parsed.timestamp) > CACHE_TTL_MS;

          if (parsed.title && parsed.description && !isExpired) {
            return of({
              ...job,
              title: parsed.title,
              description: parsed.description
            });
          }

          localStorage.removeItem(cacheKey);
        } catch {
          localStorage.removeItem(cacheKey);
        }
      }

      let titleFailed = false;

      const titleRequest = this.translateService
        .translate(job.title || '', target)
        .pipe(
          map(res => this.normalizeJobTitle(res?.translatedText || job.title || '', target)),
          catchError(() => {
            titleFailed = true;
            return of(this.normalizeJobTitle(job.title || '', target));
          })
        );

      const cleanDescription = (job.description || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      let descriptionFailed = false;

      const descriptionRequest = this.translateService
        .translate(cleanDescription, target)
        .pipe(
          map(res => res?.translatedText || cleanDescription),
          catchError(() => {
            descriptionFailed = true;
            return of(cleanDescription);
          })
        );

      return forkJoin({
        title: titleRequest,
        description: descriptionRequest
      }).pipe(
        map(({ title, description }) => {
          if (!titleFailed && !descriptionFailed) {
            const translatedJob = { title, description, timestamp: Date.now() };
            localStorage.setItem(cacheKey, JSON.stringify(translatedJob));
          }

          return { ...job, title, description };
        }),
        catchError(() => of(job))
      );
    });

    forkJoin(requests).subscribe({
      next: (translatedJobs) => {
        this.latestJobs = translatedJobs.map(job => ({ ...job }));
        this.translatingHomeJobs = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          ScrollTrigger.refresh();
        }, 150);
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