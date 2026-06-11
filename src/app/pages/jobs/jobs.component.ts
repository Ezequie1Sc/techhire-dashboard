import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { JobService } from '../../core/services/job.service';
import { Job, JobResponse } from '../../models/job.model';

import { JobCardComponent } from '../../shared/components/job-card/job-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { NotFoundComponent } from '../not-found/not-found.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JobCardComponent,
    LoaderComponent,
    NotFoundComponent
  ],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {
  allJobs: Job[] = [];
  jobs: Job[] = [];

  loading = false;
  error: string | null = null;

  searchTerm = '';
  selectedCategory = 'Todas';
  selectedMode = 'Todas';

  currentPage = 1;
  totalPages = 1;

  categories = [
    'Todas',
    'Frontend',
    'Backend',
    'Full Stack',
    'Mobile',
    'DevOps',
    'Data',
    'Marketing',
    'Security'
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

    this.jobService.getJobs(this.currentPage)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response: JobResponse) => {
          this.allJobs = response.data || [];
          this.applyFilters();
          this.totalPages = response.meta?.last_page || 1;
        },
        error: () => {
          this.error = 'Error al cargar las vacantes.';
        }
      });
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.jobs = this.allJobs.filter((job: Job) => {
      const searchableText = `
        ${job.title || ''}
        ${job.company_name || ''}
        ${job.location || ''}
        ${job.description || ''}
        ${job.tags?.join(' ') || ''}
        ${job.job_types?.join(' ') || ''}
      `.toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);

      const matchesCategory =
        this.selectedCategory === 'Todas' ||
        searchableText.includes(this.selectedCategory.toLowerCase());

      const matchesMode =
        this.selectedMode === 'Todas' ||
        (this.selectedMode === 'Remoto' && job.remote) ||
        (this.selectedMode === 'Presencial' && !job.remote);

      return matchesSearch && matchesCategory && matchesMode;
    });

    this.error = null;
    this.cdr.detectChanges();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = 'Todas';
    this.selectedMode = 'Todas';
    this.jobs = [...this.allJobs];
    this.error = null;
    this.cdr.detectChanges();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages && !this.searchTerm.trim()) {
      this.currentPage++;
      this.loadJobs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  previousPage(): void {
    if (this.currentPage > 1 && !this.searchTerm.trim()) {
      this.currentPage--;
      this.loadJobs();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}