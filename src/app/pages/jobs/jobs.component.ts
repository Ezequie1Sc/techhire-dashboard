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
  imports: [CommonModule, FormsModule, JobCardComponent, LoaderComponent, EmptyStateComponent],
  templateUrl: './jobs.component.html',
  styleUrls: ['./jobs.component.css']
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  loading = true;
  searchTerm = '';
  currentPage = 1;
  totalPages = 1;

  constructor(private jobService: JobService) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  loadJobs(): void {
    this.loading = true;
    this.jobService.getJobs(this.currentPage).subscribe({
      next: (response: JobResponse) => {
        this.jobs = response.data;
        this.totalPages = response.meta?.last_page || 1;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading jobs:', error);
        this.loading = false;
      }
    });
  }

  search(): void {
    this.loading = true;
    this.currentPage = 1;
    
    if (this.searchTerm.trim()) {
      this.jobService.searchJobs(this.searchTerm).subscribe({
        next: (response: JobResponse) => {
          this.jobs = response.data;
          this.totalPages = response.meta?.last_page || 1;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error searching jobs:', error);
          this.loading = false;
        }
      });
    } else {
      this.loadJobs();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.searchTerm ? this.search() : this.loadJobs();
      window.scrollTo(0, 0);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.searchTerm ? this.search() : this.loadJobs();
      window.scrollTo(0, 0);
    }
  }
}