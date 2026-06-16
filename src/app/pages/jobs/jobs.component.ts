import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { JobService } from '../../core/services/job.service';
import { Job, JobResponse } from '../../models/job.model';

import { JobCardComponent } from '../../shared/components/job-card/job-card.component';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    JobCardComponent,
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
  selectedRegion = 'Todas';
  selectedSort = 'recientes';

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
    'Security'
  ];

  modes = ['Todas', 'Remoto', 'Presencial', 'Híbrido'];

  regions = [
    'Todas',
    'Latam',
    'Europa',
    'Remoto Global'
  ];

  sortOptions = [
    { value: 'recientes', label: 'Más recientes' },
    { value: 'antiguos', label: 'Más antiguos' },
    { value: 'titulo_asc', label: 'Título A-Z' },
    { value: 'titulo_desc', label: 'Título Z-A' }
  ];

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
      // Búsqueda por texto
      const searchableText = this.normalizeText(`
        ${job.title || ''}
        ${job.company_name || ''}
        ${job.location || ''}
        ${job.description || ''}
        ${job.tags?.join(' ') || ''}
        ${job.job_types?.join(' ') || ''}
      `);

      const matchesSearch = !term || searchableText.includes(term);

      // Filtro por categoría
      const matchesCategory =
        this.selectedCategory === 'Todas' ||
        this.checkCategory(job, this.selectedCategory);

      // Filtro por modalidad
      const matchesMode =
        this.selectedMode === 'Todas' ||
        this.checkMode(job, this.selectedMode);

      // Filtro por región
      const matchesRegion =
        this.selectedRegion === 'Todas' ||
        this.checkRegion(job.location, this.selectedRegion);

      return matchesSearch && matchesCategory && matchesMode && matchesRegion;
    });

    // Ordenamiento
    this.sortJobs();

    this.currentPage = 1;
    this.updatePagination();
    this.error = null;
    this.cdr.detectChanges();
  }

  private checkCategory(job: Job, category: string): boolean {
    const searchableText = this.normalizeText(`
      ${job.title || ''}
      ${job.tags?.join(' ') || ''}
      ${job.job_types?.join(' ') || ''}
    `);
    
    const categoryNormalized = this.normalizeText(category);
    return searchableText.includes(categoryNormalized);
  }

  private checkMode(job: Job, mode: string): boolean {
    switch (mode) {
      case 'Remoto':
        return job.remote === true;
      case 'Presencial':
        return job.remote === false;
      case 'Híbrido':
        return job.job_types?.some(type => this.normalizeText(type).includes('híbrido')) || false;
      default:
        return false;
    }
  }

  private checkRegion(location: string | undefined, selectedRegion: string): boolean {
    if (!location) return false;
    
    // Si es Remoto Global, aceptamos cualquier vacante remote
    if (selectedRegion === 'Remoto Global') {
      return true;
    }
    
    const locationLower = location.toLowerCase();
    const regionMap: Record<string, string[]> = {
      'Latam': ['méxico', 'argentina', 'brasil', 'chile', 'colombia', 'perú', 'uruguay', 'paraguay', 'bolivia', 'ecuador', 'venezuela', 'costa rica', 'panamá', 'guatemala', 'honduras', 'nicaragua', 'el salvador', 'república dominicana', 'puerto rico', 'cuba'],
      'Europa': ['españa', 'madrid', 'barcelona', 'valencia', 'sevilla', 'bilbao', 'zaragoza', 'málaga', 'murcia', 'palma', 'las palmas', 'alemania', 'berlín', 'múnich', 'hamburgo', 'colonia', 'francfurt', 'stuttgart', 'düsseldorf', 'leipzig', 'dresde', 'hannover', 'núremberg', 'francia', 'parís', 'marsella', 'lyon', 'toulouse', 'burdeos', 'lille', 'rennes', 'reims', 'le havre', 'saint-étienne', 'montpellier', 'grenoble', 'dijon', 'nantes', 'strasburgo', 'italia', 'roma', 'milán', 'nápoles', 'turin', 'palermo', 'genova', 'bolonia', 'florencia', 'bari', 'catania', 'venecia', 'verona', 'mesina', 'padua', 'trieste', 'brescia', 'taranto', 'prato', 'regio de calabria', 'módena', 'reggio emilia', 'perugia', 'livorno', 'cagliari', 'ferrara', 'ravena', 'sassari', 'siena', 'trieste', 'trento', 'bolzano', 'como', 'bérgamo', 'vicenza', 'treviso', 'novara', 'piacenza', 'parma', 'carrara', 'la spezia', 'livorno', 'grosseto', 'arezzo', 'siena', 'perugia', 'terni', 'viterbo', 'latina', 'frosinone', 'rieti', 'l\'aquila', 'chieti', 'pescara', 'teramo', 'campobasso', 'isernia', 'foggia', 'andria', 'trani', 'barletta', 'bisceglie', 'molfetta', 'corato', 'molfetta', 'bisceglie', 'trani', 'andria', 'barletta', 'bari', 'matera', 'potenza', 'catanzaro', 'crotone', 'vibo valentia', 'cosenza', 'regio de calabria', 'caltanissetta', 'enna', 'catania', 'ragusa', 'siracusa', 'trapani', 'agrigento', 'palermo', 'messina', 'sassari', 'nuoro', 'oristano', 'cagliari'],
      'Norteamérica': ['estados unidos', 'eeuu', 'usa', 'canadá', 'méxico'],
      'Asia': ['china', 'japón', 'india', 'corea del sur', 'singapur', 'taiwán', 'hong kong', 'tailandia', 'vietnam', 'indonesia', 'malasia', 'filipinas', 'pakistán', 'bangladesh', 'sri lanka', 'nepal', 'camboya', 'laos', 'myanmar', 'mongolia', 'kazajistán', 'uzbekistán', 'turkmenistán', 'kirguistán', 'tayikistán', 'afganistán', 'iran', 'irak', 'arabia saudita', 'yemen', 'omán', 'emiratos árabes unidos', 'qatar', 'bahrein', 'kuwait', 'israel', 'jordania', 'líbano', 'siria', 'turquía', 'chipre', 'georgia', 'armenia', 'azerbaijan'],
      'África': ['egipto', 'nigeria', 'sudáfrica', 'kenia', 'etiopía', 'argelia', 'marruecos', 'túnez', 'libia', 'sudán', 'uganda', 'tanzania', 'ruanda', 'zambia', 'zimbabue', 'mozambique', 'angola', 'namibia', 'botsuana', 'senegal', 'costa de marfil', 'ghana', 'camerún', 'república democrática del congo', 'mali', 'burkina faso', 'niger', 'chad', 'republica del congo', 'guinea', 'cabo verde', 'benin', 'togo', 'nigeria'],
      'Oceanía': ['australia', 'nueva zelanda', 'fiji', 'papúa nueva guinea', 'islas salomón', 'vanuatu', 'samoa', 'tonga', 'micronesia', 'palau', 'islas marshall', 'kiribati', 'nauru', 'tuvalu', 'islas cook', 'niue']
    };

    return regionMap[selectedRegion]?.some(region => locationLower.includes(region)) || false;
  }

  private sortJobs(): void {
    switch (this.selectedSort) {
      case 'recientes':
        this.filteredJobs.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'antiguos':
        this.filteredJobs.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        });
        break;
      case 'titulo_asc':
        this.filteredJobs.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        break;
      case 'titulo_desc':
        this.filteredJobs.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        break;
      default:
        break;
    }
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
    this.selectedRegion = 'Todas';
    this.selectedSort = 'recientes';
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
      this.selectedMode !== 'Todas' ||
      this.selectedRegion !== 'Todas' ||
      this.selectedSort !== 'recientes'
    );
  }

  getSortLabel(value: string): string {
    const option = this.sortOptions.find(o => o.value === value);
    return option ? option.label : value;
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}