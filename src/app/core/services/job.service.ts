import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { Job, JobResponse } from '../../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = '/api/jobs';
  private jobsCache: Job[] = [];

  constructor(private http: HttpClient) {}

  getJobs(page: number = 1): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.apiUrl}?page=${page}`).pipe(
      tap((response) => {
        this.saveJobsInCache(response.data || []);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al cargar empleos:', error);
        return of(this.emptyResponse());
      })
    );
  }

  searchJobs(keyword: string): Observable<JobResponse> {
    const cleanKeyword = keyword.toLowerCase().trim();

    return this.getJobs(1).pipe(
      map((response: JobResponse) => {
        const filteredJobs = (response.data || []).filter((job: Job) => {
          const title = job.title?.toLowerCase() || '';
          const company = job.company_name?.toLowerCase() || '';
          const location = job.location?.toLowerCase() || '';
          const description = job.description?.toLowerCase() || '';
          const tags = job.tags?.join(' ').toLowerCase() || '';
          const jobTypes = job.job_types?.join(' ').toLowerCase() || '';

          return (
            title.includes(cleanKeyword) ||
            company.includes(cleanKeyword) ||
            location.includes(cleanKeyword) ||
            description.includes(cleanKeyword) ||
            tags.includes(cleanKeyword) ||
            jobTypes.includes(cleanKeyword)
          );
        });

        return {
          data: filteredJobs,
          links: response.links,
          meta: {
            current_page: 1,
            from: filteredJobs.length > 0 ? 1 : 0,
            last_page: 1,
            path: response.meta?.path || '',
            per_page: filteredJobs.length,
            to: filteredJobs.length,
            total: filteredJobs.length
          }
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al buscar empleos:', error);
        return of(this.emptyResponse());
      })
    );
  }

  getJobBySlug(slug: string): Observable<Job | undefined> {
    const decodedSlug = decodeURIComponent(slug);

    const cachedJob = this.jobsCache.find(job => job.slug === decodedSlug);

    if (cachedJob) {
      return of(cachedJob);
    }

    return this.findJobBySlugInPages(decodedSlug, 1);
  }

  private findJobBySlugInPages(slug: string, page: number): Observable<Job | undefined> {
    return this.getJobs(page).pipe(
      switchMap((response: JobResponse) => {
        const job = (response.data || []).find((item: Job) => item.slug === slug);

        if (job) {
          return of(job);
        }

        const lastPage = response.meta?.last_page || 1;

        if (page < lastPage && page < 10) {
          return this.findJobBySlugInPages(slug, page + 1);
        }

        return of(undefined);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al cargar detalle del empleo:', error);
        return of(undefined);
      })
    );
  }

  private saveJobsInCache(jobs: Job[]): void {
    const existingSlugs = new Set(this.jobsCache.map(job => job.slug));

    jobs.forEach(job => {
      if (!existingSlugs.has(job.slug)) {
        this.jobsCache.push(job);
      }
    });
  }

  private emptyResponse(): JobResponse {
    return {
      data: [],
      links: {
        first: '',
        last: '',
        prev: null,
        next: null
      },
      meta: {
        current_page: 1,
        from: 0,
        last_page: 1,
        path: '',
        per_page: 0,
        to: 0,
        total: 0
      }
    };
  }
}