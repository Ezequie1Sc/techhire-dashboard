import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Job } from '../../models/job.model';

@Injectable({
  providedIn: 'root'
})
export class FavoriteService {
  private storageKey = 'techhire_favorites';
  private favoritesSubject = new BehaviorSubject<Job[]>(this.getFavoritesFromStorage());
  favorites$ = this.favoritesSubject.asObservable();

  constructor() { }

  private getFavoritesFromStorage(): Job[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  private saveFavoritesToStorage(favorites: Job[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(favorites));
  }

  getFavorites(): Job[] {
    return this.favoritesSubject.value;
  }

  addFavorite(job: Job): void {
    const favorites = this.getFavorites();
    if (!this.isFavorite(job.slug)) {
      favorites.push(job);
      this.favoritesSubject.next(favorites);
      this.saveFavoritesToStorage(favorites);
    }
  }

  removeFavorite(slug: string): void {
    const favorites = this.getFavorites().filter(job => job.slug !== slug);
    this.favoritesSubject.next(favorites);
    this.saveFavoritesToStorage(favorites);
  }

  clearFavorites(): void {
    this.favoritesSubject.next([]);
    this.saveFavoritesToStorage([]);
  }

  isFavorite(slug: string): boolean {
    return this.getFavorites().some(job => job.slug === slug);
  }

  toggleFavorite(job: Job): void {
    if (this.isFavorite(job.slug)) {
      this.removeFavorite(job.slug);
    } else {
      this.addFavorite(job);
    }
  }
}