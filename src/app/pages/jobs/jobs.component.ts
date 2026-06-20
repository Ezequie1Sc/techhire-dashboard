import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { JobService } from '../../core/services/job.service';
import { TranslateService, TranslationTarget } from '../../core/services/translate.service';
import { TranslationService } from '../../core/i18n/translation.service';
import { Job, JobResponse } from '../../models/job.model';
import { JobCardComponent } from '../../shared/components/job-card/job-card.component';

type JobsLanguage = 'original' | 'es' | 'en';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule, JobCardComponent],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {
  allJobs: Job[] = [];
  filteredJobs: Job[] = [];
  jobs: Job[] = [];

  loading = false;
  error: string | null = null;

  searchTerm = '';
  selectedCategory = 'Todas';
  selectedMode = 'Todas';
  selectedRegion = 'Todas';
  selectedSort = 'recientes';
  selectedJobType = 'Todas';

  selectedJobsLanguage: JobsLanguage = 'original';
  translatingJobs = false;
  translationError: string | null = null;
  showAdvancedFilters = false;

  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 12;

  categories = ['Todas', 'Frontend', 'Backend', 'Full Stack', 'Mobile', 'DevOps', 'Data', 'Marketing', 'Security'];
  modes = ['Todas', 'Remoto', 'Presencial', 'Híbrido'];
  regions = ['Todas', 'Latam', 'Europa', 'Remoto Global'];
  jobTypes = ['Todas', 'Tiempo completo', 'Medio tiempo', 'Contrato', 'Freelance'];

  sortOptions = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'antiguos', label: 'Más antiguos' },
    { value: 'titulo_asc', label: 'Título A-Z' },
    { value: 'titulo_desc', label: 'Título Z-A' }
  ];

  constructor(
    private jobService: JobService,
    private translateService: TranslateService,
    public translation: TranslationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  closeAdvancedFilters(): void {
    this.showAdvancedFilters = false;
  }

  applyAndCloseFilters(): void {
    this.applyFilters();
    this.showAdvancedFilters = false;
  }

  resetAllFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'Todas';
    this.selectedMode = 'Todas';
    this.selectedRegion = 'Todas';
    this.selectedJobType = 'Todas';
    this.selectedSort = 'recientes';
    this.applyFilters();
    this.showAdvancedFilters = false;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.applyFilters();
  }

  selectMode(mode: string): void {
    this.selectedMode = mode;
    this.applyFilters();
  }

  selectRegion(region: string): void {
    this.selectedRegion = region;
    this.applyFilters();
  }

  selectJobType(type: string): void {
    this.selectedJobType = type;
    this.applyFilters();
  }

  selectSort(value: string): void {
    this.selectedSort = value;
    this.applyFilters();
  }

  clearSearch(): void { this.searchTerm = ''; this.applyFilters(); }
  clearCategory(): void { this.selectedCategory = 'Todas'; this.applyFilters(); }
  clearMode(): void { this.selectedMode = 'Todas'; this.applyFilters(); }
  clearRegion(): void { this.selectedRegion = 'Todas'; this.applyFilters(); }
  clearJobType(): void { this.selectedJobType = 'Todas'; this.applyFilters(); }
  clearSort(): void { this.selectedSort = 'recientes'; this.applyFilters(); }

  loadJobs(): void {
    this.loading = true;
    this.error = null;
    this.jobs = [];
    this.filteredJobs = [];
    this.allJobs = [];

    this.jobService.getJobs(1)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: JobResponse) => {
          this.allJobs = response.data || [];
          this.currentPage = 1;
          this.applyFilters();
        },
        error: () => {
          this.error = 'Error al cargar las vacantes.';
        }
      });
  }

  applyFilters(): void {
    const term = this.normalizeText(this.searchTerm);

    this.filteredJobs = this.allJobs.filter((job: Job) => {
      const searchableText = this.normalizeText(`
        ${job.title || ''} ${job.company_name || ''} ${job.location || ''}
        ${job.description || ''} ${job.tags?.join(' ') || ''} ${job.job_types?.join(' ') || ''}
      `);

      const matchesSearch = !term || searchableText.includes(term);
      const matchesCategory = this.selectedCategory === 'Todas' || this.checkCategory(job, this.selectedCategory);
      const matchesMode = this.selectedMode === 'Todas' || this.checkMode(job, this.selectedMode);
      const matchesRegion = this.selectedRegion === 'Todas' || this.checkRegion(job.location, this.selectedRegion);
      const matchesJobType = this.selectedJobType === 'Todas' || this.checkJobType(job, this.selectedJobType);

      return matchesSearch && matchesCategory && matchesMode && matchesRegion && matchesJobType;
    });

    this.sortJobs();
    this.currentPage = 1;
    this.updatePagination();
    this.error = null;
    this.cdr.detectChanges();
  }

  private checkJobType(job: Job, type: string): boolean {
    if (!job.job_types) return false;
    const normalizedType = this.normalizeText(type);
    return job.job_types.some(t => this.normalizeText(t).includes(normalizedType));
  }

  changeJobsLanguage(language: JobsLanguage): void {
    this.selectedJobsLanguage = language;
    this.translationError = null;
    this.updatePagination();
  }

  // 🔥 NUEVO normalizeJobTitle (Maneja paréntesis compuestos)
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

  private readonly JOBS_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

  private getJobsTranslationCache(job: Job, target: TranslationTarget): Partial<Job> | null {
    // 🔥 Cache key actualizada a V2
    const cacheKey = `jobs_translation_v2_${job.slug}_${target}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    try {
      const parsed = JSON.parse(cached);
      const isExpired = !parsed.timestamp || (Date.now() - parsed.timestamp) > this.JOBS_CACHE_TTL_MS;
      if (isExpired || !parsed.title) {
        localStorage.removeItem(cacheKey);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(cacheKey);
      return null;
    }
  }

  private setJobsTranslationCache(job: Job, target: TranslationTarget, data: Partial<Job>): void {
    // 🔥 Cache key actualizada a V2
    const cacheKey = `jobs_translation_v2_${job.slug}_${target}`;
    localStorage.setItem(cacheKey, JSON.stringify({ ...data, timestamp: Date.now() }));
  }

  private translateVisibleJobs(target: TranslationTarget): void {
    if (!this.jobs.length) return;
    this.translatingJobs = true;
    this.translationError = null;
    this.cdr.detectChanges();

    const requests = this.jobs.map((job) => {
      const cached = this.getJobsTranslationCache(job, target);
      if (cached) {
        return of({ ...job, ...cached });
      }

      const cleanDescription = (job.description || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

      let anyFailed = false;

      const titleRequest = this.translateService.translate(job.title || '', target).pipe(
        map(res => this.normalizeJobTitle(res?.translatedText || job.title || '', target)),
        catchError(() => {
          anyFailed = true;
          return of(this.normalizeJobTitle(job.title || '', target));
        })
      );

      const descriptionRequest = cleanDescription
        ? this.translateService.translate(cleanDescription, target).pipe(
            map(res => res?.translatedText || cleanDescription),
            catchError(() => { anyFailed = true; return of(cleanDescription); })
          )
        : of('');

      const jobTypesRequest = job.job_types?.length
        ? this.translateService.translate(job.job_types.join(' · '), target).pipe(
            map(res => (res?.translatedText || job.job_types!.join(' · ')).split(' · ').map(s => s.trim())),
            catchError(() => { anyFailed = true; return of(job.job_types || []); })
          )
        : of(job.job_types || []);

      const tagsRequest = job.tags?.length
        ? this.translateService.translate(job.tags.join(' · '), target).pipe(
            map(res => (res?.translatedText || job.tags!.join(' · ')).split(' · ').map(s => s.trim())),
            catchError(() => { anyFailed = true; return of(job.tags || []); })
          )
        : of(job.tags || []);

      return forkJoin({
        title: titleRequest,
        description: descriptionRequest,
        job_types: jobTypesRequest,
        tags: tagsRequest
      }).pipe(
        map((result) => {
          if (!anyFailed) {
            this.setJobsTranslationCache(job, target, result);
          }
          return { ...job, ...result };
        }),
        catchError(() => of(job))
      );
    });

    forkJoin(requests).subscribe({
      next: (translatedJobs) => { this.jobs = translatedJobs; this.translatingJobs = false; this.cdr.detectChanges(); },
      error: () => { this.translationError = 'No se pudieron traducir las vacantes.'; this.translatingJobs = false; this.cdr.detectChanges(); }
    });
  }

  private checkCategory(job: Job, category: string): boolean {
    const searchableText = this.normalizeText(`${job.title || ''} ${job.tags?.join(' ') || ''} ${job.job_types?.join(' ') || ''}`);
    return searchableText.includes(this.normalizeText(category));
  }

  private checkMode(job: Job, mode: string): boolean {
    switch (mode) {
      case 'Remoto': return job.remote === true;
      case 'Presencial': return job.remote === false;
      case 'Híbrido': return job.job_types?.some(type => this.normalizeText(type).includes('hibrido')) || false;
      default: return false;
    }
  }

  private checkRegion(location: string | undefined, selectedRegion: string): boolean {
    if (selectedRegion === 'Remoto Global') return true;
    if (!location) return false;
    const locationLower = this.normalizeText(location);
    const regionMap: Record<string, string[]> = {
      Latam: ['mexico', 'argentina', 'brasil', 'chile', 'colombia', 'peru', 'uruguay', 'paraguay', 'bolivia', 'ecuador', 'venezuela', 'costa rica', 'panama', 'guatemala', 'honduras', 'nicaragua', 'el salvador', 'republica dominicana', 'puerto rico', 'cuba'],
      Europa: ['espana', 'madrid', 'barcelona', 'valencia', 'alemania', 'berlin', 'francia', 'paris', 'italia', 'roma', 'milan', 'portugal', 'lisboa', 'reino unido', 'londres', 'irlanda', 'dublin', 'paises bajos', 'amsterdam', 'polonia', 'varsovia']
    };
    return regionMap[selectedRegion]?.some(region => locationLower.includes(region)) || false;
  }

  private sortJobs(): void {
    switch (this.selectedSort) {
      case 'recientes': this.filteredJobs.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()); break;
      case 'antiguos': this.filteredJobs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()); break;
      case 'titulo_asc': this.filteredJobs.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
      case 'titulo_desc': this.filteredJobs.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
    }
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredJobs.length / this.itemsPerPage));
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.jobs = this.filteredJobs.slice(start, end);
    if (this.selectedJobsLanguage !== 'original') {
      this.translateVisibleJobs(this.selectedJobsLanguage);
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'Todas';
    this.selectedMode = 'Todas';
    this.selectedRegion = 'Todas';
    this.selectedJobType = 'Todas';
    this.selectedSort = 'recientes';
    this.showAdvancedFilters = false;
    this.currentPage = 1;
    this.applyFilters();
  }

  nextPage(): void { if (this.currentPage < this.totalPages) { this.currentPage++; this.updatePagination(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  previousPage(): void { if (this.currentPage > 1) { this.currentPage--; this.updatePagination(); window.scrollTo({ top: 0, behavior: 'smooth' }); } }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim().length > 0 ||
      this.selectedCategory !== 'Todas' ||
      this.selectedMode !== 'Todas' ||
      this.selectedRegion !== 'Todas' ||
      this.selectedJobType !== 'Todas' ||
      this.selectedSort !== 'recientes'
    );
  }

  getSortLabel(value: string): string { return this.sortOptions.find(option => option.value === value)?.label || value; }
  private normalizeText(value: string): string { return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim(); }
}