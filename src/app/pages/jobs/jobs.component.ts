import { Component, OnInit, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { JobService } from '../../core/services/job.service';
import { Job, JobResponse } from '../../models/job.model';
import { JobCardComponent } from '../../shared/components/job-card/job-card.component';

type DropdownType = 'category' | 'mode' | 'region' | 'sort' | null;

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

  openDropdown: DropdownType = null;

  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 12;

  categories = ['Todas', 'Frontend', 'Backend', 'Full Stack', 'Mobile', 'DevOps', 'Data', 'Marketing', 'Security'];
  modes = ['Todas', 'Remoto', 'Presencial', 'Híbrido'];
  regions = ['Todas', 'Latam', 'Europa', 'Remoto Global'];

  sortOptions = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'antiguos', label: 'Más antiguos' },
    { value: 'titulo_asc', label: 'Título A-Z' },
    { value: 'titulo_desc', label: 'Título Z-A' }
  ];

  constructor(
    private jobService: JobService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  @HostListener('document:click')
  closeDropdown(): void {
    this.openDropdown = null;
  }

  toggleDropdown(dropdown: Exclude<DropdownType, null>, event: Event): void {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === dropdown ? null : dropdown;
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.openDropdown = null;
    this.applyFilters();
  }

  selectMode(mode: string): void {
    this.selectedMode = mode;
    this.openDropdown = null;
    this.applyFilters();
  }

  selectRegion(region: string): void {
    this.selectedRegion = region;
    this.openDropdown = null;
    this.applyFilters();
  }

  selectSort(value: string): void {
    this.selectedSort = value;
    this.openDropdown = null;
    this.applyFilters();
  }

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
        ${job.title || ''}
        ${job.company_name || ''}
        ${job.location || ''}
        ${job.description || ''}
        ${job.tags?.join(' ') || ''}
        ${job.job_types?.join(' ') || ''}
      `);

      const matchesSearch = !term || searchableText.includes(term);

      const matchesCategory =
        this.selectedCategory === 'Todas' ||
        this.checkCategory(job, this.selectedCategory);

      const matchesMode =
        this.selectedMode === 'Todas' ||
        this.checkMode(job, this.selectedMode);

      const matchesRegion =
        this.selectedRegion === 'Todas' ||
        this.checkRegion(job.location, this.selectedRegion);

      return matchesSearch && matchesCategory && matchesMode && matchesRegion;
    });

    this.sortJobs();
    this.currentPage = 1;
    this.updatePagination();
    this.error = null;
    this.cdr.detectChanges();
  }

  private checkCategory(job: Job, category: string): boolean {
    const searchableText = this.normalizeText(`
      ${job.title || ''}
      ${job.tags?.join(' ') || ''}
      ${job.job_types?.join(' ') || ''}
    `);

    return searchableText.includes(this.normalizeText(category));
  }

  private checkMode(job: Job, mode: string): boolean {
    switch (mode) {
      case 'Remoto':
        return job.remote === true;
      case 'Presencial':
        return job.remote === false;
      case 'Híbrido':
        return job.job_types?.some(type => this.normalizeText(type).includes('hibrido')) || false;
      default:
        return false;
    }
  }

  private checkRegion(location: string | undefined, selectedRegion: string): boolean {
    if (selectedRegion === 'Remoto Global') return true;
    if (!location) return false;

    const locationLower = this.normalizeText(location);

    const regionMap: Record<string, string[]> = {
      Latam: [
        'mexico', 'argentina', 'brasil', 'chile', 'colombia', 'peru',
        'uruguay', 'paraguay', 'bolivia', 'ecuador', 'venezuela',
        'costa rica', 'panama', 'guatemala', 'honduras', 'nicaragua',
        'el salvador', 'republica dominicana', 'puerto rico', 'cuba'
      ],
      Europa: [
        'espana', 'madrid', 'barcelona', 'valencia', 'alemania', 'berlin',
        'francia', 'paris', 'italia', 'roma', 'milan', 'portugal',
        'lisboa', 'reino unido', 'londres', 'irlanda', 'dublin',
        'paises bajos', 'amsterdam', 'polonia', 'varsovia'
      ]
    };

    return regionMap[selectedRegion]?.some(region => locationLower.includes(region)) || false;
  }

  private sortJobs(): void {
    switch (this.selectedSort) {
      case 'recientes':
        this.filteredJobs.sort((a, b) =>
          new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );
        break;

      case 'antiguos':
        this.filteredJobs.sort((a, b) =>
          new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        );
        break;

      case 'titulo_asc':
        this.filteredJobs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;

      case 'titulo_desc':
        this.filteredJobs.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
    }
  }

  updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredJobs.length / this.itemsPerPage));
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.jobs = this.filteredJobs.slice(start, end);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'Todas';
    this.selectedMode = 'Todas';
    this.selectedRegion = 'Todas';
    this.selectedSort = 'recientes';
    this.openDropdown = null;
    this.currentPage = 1;
    this.applyFilters();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  get hasActiveFilters(): boolean {
    return (
      this.searchTerm.trim().length > 0 ||
      this.selectedCategory !== 'Todas' ||
      this.selectedMode !== 'Todas' ||
      this.selectedRegion !== 'Todas' ||
      this.selectedSort !== 'recientes'
    );
  }

  getSortLabel(value: string): string {
    return this.sortOptions.find(option => option.value === value)?.label || value;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}