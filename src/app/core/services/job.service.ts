import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Job, JobResponse } from '../../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = 'https://www.arbeitnow.com/api/job-board-api';

  constructor(private http: HttpClient) {}

  getJobs(page: number = 1): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.apiUrl}?page=${page}`).pipe(
      catchError(this.handleError)
    );
  }

  searchJobs(keyword: string): Observable<JobResponse> {
    const cleanKeyword = keyword.toLowerCase().trim();

    return this.getJobs(1).pipe(
      map((response: JobResponse) => {
        const filteredData = response.data.filter((job: Job) => {
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
          ...response,
          data: filteredData,
          meta: {
            ...response.meta!,
            current_page: 1,
            last_page: 1,
            total: filteredData.length
          }
        };
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error en búsqueda:', error);
        return of({ data: [] } as JobResponse);
      })
    );
  }

  getJobBySlug(slug: string): Observable<Job | undefined> {
    return this.getJobs(1).pipe(
      map((response: JobResponse) =>
        response.data.find((job: Job) => job.slug === slug)
      ),
      catchError(() => of(undefined))
    );
  }

  private handleError(error: HttpErrorResponse): Observable<JobResponse> {
    console.error('Error al cargar empleos:', error);

    return of({
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
    });
  }
}