import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { Job, JobResponse } from '../../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  // URL para usar con el proxy
  
private apiUrl = '/api/jobs';

  constructor(private http: HttpClient) {}

  getJobs(page: number = 1): Observable<JobResponse> {
    console.log('🔍 Fetching jobs from:', `${this.apiUrl}?page=${page}`);
    
    return this.http.get<JobResponse>(`${this.apiUrl}?page=${page}`).pipe(
      map(response => {
        console.log('✅ API Response received');
        console.log('📊 Jobs count:', response.data?.length);
        return response;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error fetching jobs:', error);
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
      })
    );
  }

  searchJobs(keyword: string): Observable<JobResponse> {
    const cleanKeyword = keyword.toLowerCase().trim();
    console.log('🔍 Searching for:', cleanKeyword);

    return this.http.get<JobResponse>(`${this.apiUrl}`).pipe(
      map((response: JobResponse) => {
        console.log('📊 Total jobs to filter:', response.data?.length);
        
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

        console.log('✅ Filtered results:', filteredJobs.length);
        
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
        console.error('❌ Error searching jobs:', error);
        return of({
          data: [],
          links: { first: '', last: '', prev: null, next: null },
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
      })
    );
  }

  getJobBySlug(slug: string): Observable<Job | undefined> {
    console.log('🔍 Fetching job detail for slug:', slug);
    
    return this.http.get<JobResponse>(`${this.apiUrl}`).pipe(
      map((response: JobResponse) => {
        const job = (response.data || []).find((job: Job) => job.slug === slug);
        console.log('✅ Job found:', job?.title || 'Not found');
        return job;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error fetching job detail:', error);
        return of(undefined);
      })
    );
  }
}