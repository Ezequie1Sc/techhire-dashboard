import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { JobService } from '../../core/services/job.service';
import { Job } from '../../models/job.model';
import { JobCardComponent } from '../../shared/components/job-card/job-card.component';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule, JobCardComponent, LoaderComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  latestJobs: Job[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private jobService: JobService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLatestJobs();
  }

  loadLatestJobs(): void {
    this.loading = true;
    this.error = null;
    this.latestJobs = [];

    this.jobService.getJobs(1)
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          const jobs = response.data || [];
          this.latestJobs = jobs.slice(0, 6);

          if (this.latestJobs.length === 0) {
            this.error = 'No se encontraron vacantes disponibles.';
          }
        },
        error: () => {
          this.error = 'No se pudieron cargar las vacantes.';
        }
      });
  }
}