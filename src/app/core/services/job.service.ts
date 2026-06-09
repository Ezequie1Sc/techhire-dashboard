import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Job, JobResponse } from '../../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private apiUrl = 'https://www.arbeitnow.com/api/job-board-api';

  constructor(private http: HttpClient) { }

  getJobs(page: number = 1): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.apiUrl}?page=${page}`);
  }

  getJobBySlug(slug: string): Observable<Job | undefined> {
    return this.http.get<JobResponse>(`${this.apiUrl}`).pipe(
      map(response => response.data.find(job => job.slug === slug))
    );
  }

  searchJobs(keyword: string): Observable<JobResponse> {
    return this.http.get<JobResponse>(`${this.apiUrl}?search=${keyword}`);
  }
}