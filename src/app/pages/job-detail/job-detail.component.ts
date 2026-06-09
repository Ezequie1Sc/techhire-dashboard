import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { JobService } from '../../core/services/job.service';
import { FavoriteService } from '../../core/services/favorite.service';
import { Job } from '../../models/job.model';
import { LoaderComponent } from '../../shared/components/loader/loader.component';

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, LoaderComponent],
  templateUrl: './job-detail.component.html',
  styleUrls: ['./job-detail.component.css']
})
export class JobDetailComponent implements OnInit {
  job: Job | undefined;
  loading = true;
  isFavorite = false;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private jobService: JobService,
    private favoriteService: FavoriteService
  ) {}

  ngOnInit(): void {
    const slug = this.route.snapshot.paramMap.get('slug');
    console.log('📋 Job detail for slug:', slug);
    
    if (slug) {
      this.loadJobDetails(slug);
    } else {
      this.error = 'No se encontró el identificador de la vacante';
      this.loading = false;
    }
  }

  loadJobDetails(slug: string): void {
    console.log('🔍 Loading details for:', slug);
    this.loading = true;
    this.error = null;
    
    this.jobService.getJobBySlug(slug).subscribe({
      next: (job) => {
        console.log('✅ Job details loaded:', job?.title);
        this.job = job;
        if (job) {
          this.isFavorite = this.favoriteService.isFavorite(slug);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error loading job details:', error);
        this.error = 'Error al cargar los detalles de la vacante';
        this.loading = false;
      }
    });
  }

  toggleFavorite(): void {
    if (this.job) {
      this.favoriteService.toggleFavorite(this.job);
      this.isFavorite = !this.isFavorite;
      console.log('⭐ Favorite toggled:', this.isFavorite);
    }
  }

  get formattedDate(): string {
    if (!this.job) return '';
    return new Date(this.job.created_at * 1000).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}