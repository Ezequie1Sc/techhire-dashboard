import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../core/services/job.service';
import { Job, JobResponse } from '../../models/job.model';
import { JobCardComponent } from '../../shared/components/job-card/job-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JobCardComponent,
    LoaderComponent,
    EmptyStateComponent
  ],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  currentPage = 1;
  totalPages = 1;

  constructor(private jobService: JobService) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.error = null;

    this.jobService.getJobs(this.currentPage).subscribe({
      next: (response: JobResponse) => {
        this.jobs = response.data || [];
        this.totalPages = response.meta?.last_page || 1;
        this.loading = false;
      },
      error: () => {
        this.error = 'Error al cargar las vacantes. Intenta de nuevo.';
        this.loading = false;
      }
    });
  }

  search(): void {
    const term = this.searchTerm.trim();

    if (!term) {
      this.currentPage = 1;
      this.loadJobs();
      return;
    }

    this.loading = true;
    this.error = null;
    this.currentPage = 1;

    this.jobService.searchJobs(term).subscribe({
      next: (response: JobResponse) => {
        this.jobs = response.data || [];
        this.totalPages = 1;
        this.loading = false;
      },
      error: () => {
        this.error = 'Error en la búsqueda. Intenta con otro término.';
        this.loading = false;
      }
    });
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.loadJobs();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages && !this.searchTerm.trim()) {
      this.currentPage++;
      this.loadJobs();
      window.scrollTo(0, 0);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1 && !this.searchTerm.trim()) {
      this.currentPage--;
      this.loadJobs();
      window.scrollTo(0, 0);
    }
  }
}