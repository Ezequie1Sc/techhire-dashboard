import { Component, OnInit, ChangeDetectorRef, ElementRef, ViewChild, HostListener } from '@angular/core';
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
  @ViewChild('jobsCarousel') jobsCarousel!: ElementRef<HTMLDivElement>;
  @ViewChild('categoriesCarousel') categoriesCarousel!: ElementRef<HTMLDivElement>;

  latestJobs: Job[] = [];
  loading = false;
  error: string | null = null;

  techCategories = [
    'Frontend',
    'Backend',
    'Mobile',
    'Cloud',
    'DevOps',
    'Data',
    'Cybersecurity'
  ];

  techRoles = [
    'Frontend',
    'Backend',
    'Mobile',
    'DevOps',
    'Data',
    'AI/ML',
    'Cloud'
  ];

  constructor(
    private jobService: JobService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadLatestJobs();
  }

  ngAfterViewInit(): void {
    // Detectar eventos táctiles para pausar/reanudar animación
    const carousel = this.categoriesCarousel?.nativeElement;
    if (carousel) {
      // Cuando el usuario toca la pantalla
      carousel.addEventListener('touchstart', () => {
        carousel.classList.add('is-touching');
      });
      
      // Cuando el usuario deja de tocar
      carousel.addEventListener('touchend', () => {
        setTimeout(() => {
          carousel.classList.remove('is-touching');
        }, 100); // Pequeño delay para permitir el scroll
      });
      
      // Si el toque se cancela
      carousel.addEventListener('touchcancel', () => {
        carousel.classList.remove('is-touching');
      });
      
      // Scroll manual con el dedo
      carousel.addEventListener('scroll', () => {
        // Pequeño efecto visual de que el carrusel está siendo controlado
        carousel.classList.add('is-touching');
        clearTimeout((carousel as any)._scrollTimeout);
        (carousel as any)._scrollTimeout = setTimeout(() => {
          carousel.classList.remove('is-touching');
        }, 1500);
      });
    }
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
          this.latestJobs = (response.data || []).slice(0, 8);

          if (this.latestJobs.length === 0) {
            this.error = 'No se encontraron vacantes disponibles.';
          }
        },
        error: () => {
          this.error = 'No se pudieron cargar las vacantes.';
        }
      });
  }

  // Scroll para vacantes
  scrollCarousel(direction: 'left' | 'right'): void {
    const carousel = this.jobsCarousel?.nativeElement;
    if (!carousel) return;

    const scrollAmount = carousel.clientWidth * 0.85;

    carousel.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }

  // Scroll para categorías (desktop)
  scrollCategories(direction: 'left' | 'right'): void {
    const carousel = this.categoriesCarousel?.nativeElement;
    if (!carousel) return;

    const scrollAmount = 200;

    carousel.scrollBy({
      left: direction === 'right' ? scrollAmount : -scrollAmount,
      behavior: 'smooth'
    });
  }
}