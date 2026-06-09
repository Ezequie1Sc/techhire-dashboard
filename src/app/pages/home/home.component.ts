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
  error: string | null = null;

  constructor(private jobService: JobService) {}

  ngOnInit(): void {
    console.log('🏠 Home component initialized');
    this.loadLatestJobs();
  }

  // Cambiado de private a public para poder llamarlo desde el template
  loadLatestJobs(): void {
    console.log('📡 Loading latest jobs...');
    this.loading = true;
    this.error = null;
    
    this.jobService.getJobs(1).subscribe({
      next: (response) => {
        console.log('✅ Jobs received:', response.data.length);
        console.log('📋 First job:', response.data[0]);
        this.latestJobs = response.data.slice(0, 6);
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading jobs:', error);
        this.error = 'No se pudieron cargar las vacantes. Por favor, intenta de nuevo más tarde.';
        this.loading = false;
      }
    });
  }
}