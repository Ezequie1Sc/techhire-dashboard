import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { JobService } from '../../core/services/job.service';
import { Job, JobResponse } from '../../models/job.model';

import { JobCardComponent } from '../../shared/components/job-card/job-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JobCardComponent,
    LoaderComponent
  ],
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

  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 12;

  categories = [
    'Todas',
    'Frontend',
    'Backend',
    'Full Stack',
    'Mobile',
    'DevOps',
    'Data',
    'Marketing',
    'Security',
    'México',
    'Europa'
  ];

  modes = ['Todas', 'Remoto', 'Presencial'];

  constructor(
    private jobService: JobService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadJobs();
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

      const category = this.normalizeText(this.selectedCategory);
      const matchesCategory =
        this.selectedCategory === 'Todas' ||
        searchableText.includes(category);

      const matchesMode =
        this.selectedMode === 'Todas' ||
        (this.selectedMode === 'Remoto' && job.remote) ||
        (this.selectedMode === 'Presencial' && !job.remote);

      return matchesSearch && matchesCategory && matchesMode;
    });

    this.currentPage = 1;
    this.updatePagination();
    this.error = null;
    this.cdr.detectChanges();
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
      this.selectedMode !== 'Todas'
    );
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}