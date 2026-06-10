import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
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
  allJobs: Job[] = [];
  jobs: Job[] = [];

  loading = false;
  error: string | null = null;
  searchTerm = '';

  currentPage = 1;
  totalPages = 1;

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
          this.jobs = [...this.allJobs];
          this.totalPages = response.meta?.last_page || 1;

          if (this.jobs.length === 0) {
            this.error = 'No se encontraron vacantes.';
          }
        },
        error: () => {
          this.error = 'Error al cargar las vacantes.';
        }
      });
  }

  search(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.error = null;

    if (!term) {
      this.jobs = [...this.allJobs];
      this.cdr.detectChanges();
      return;
    }

    this.jobs = this.allJobs.filter((job: Job) => {
      const title = job.title?.toLowerCase() || '';
      const company = job.company_name?.toLowerCase() || '';
      const location = job.location?.toLowerCase() || '';
      const description = job.description?.toLowerCase() || '';
      const tags = job.tags?.join(' ').toLowerCase() || '';
      const jobTypes = job.job_types?.join(' ').toLowerCase() || '';

      return (
        title.includes(term) ||
        company.includes(term) ||
        location.includes(term) ||
        description.includes(term) ||
        tags.includes(term) ||
        jobTypes.includes(term)
      );
    });

    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.error = null;
    this.jobs = [...this.allJobs];
    this.cdr.detectChanges();
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