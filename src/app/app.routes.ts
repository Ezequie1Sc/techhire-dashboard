import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { JobsComponent } from './pages/jobs/jobs.component';
import { JobDetailComponent } from './pages/job-detail/job-detail.component';
import { FavoritesComponent } from './pages/favorites/favorites.component';
import { NotFoundComponent } from './pages/not-found/not-found.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'jobs', component: JobsComponent },
  { path: 'jobs/:slug', component: JobDetailComponent },
  { path: 'favorites', component: FavoritesComponent },

  // Página 404
  { path: '**', component: NotFoundComponent }
];