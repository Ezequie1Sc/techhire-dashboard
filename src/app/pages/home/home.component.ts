import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
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
  loading = true;

  constructor(private jobService: JobService) {}

  ngOnInit(): void {
    this.loadLatestJobs();
  }

  private loadLatestJobs(): void {
    this.jobService.getJobs(1).subscribe({
      next: (response) => {
        this.latestJobs = response.data.slice(0, 6);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading jobs:', error);
        this.loading = false;
      }
    });
  }
}