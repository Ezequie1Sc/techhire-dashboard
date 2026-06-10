import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { Job, JobResponse } from '../../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = '/api/jobs';

  constructor(private http: HttpClient) {}

  getJobs(page: number = 1): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.apiUrl}?page=${page}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error al cargar empleos:', error);
        return of(this.emptyResponse());
      })
    );
  }

  searchJobs(keyword: string): Observable<JobResponse> {
    const cleanKeyword = keyword.toLowerCase().trim();

    return this.http.get<JobResponse>(`${this.apiUrl}?page=1`).pipe(
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
    return this.http.get<JobResponse>(`${this.apiUrl}?page=1`).pipe(
      map((response: JobResponse) => {
        return (response.data || []).find((job: Job) => job.slug === slug);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error al buscar detalle del empleo:', error);
        return of(undefined);
      })
    );
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