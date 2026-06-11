import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.css']
})
export class NotFoundComponent implements OnInit, OnDestroy {
  title = '404 - Página no encontrada';

  ngOnInit(): void {
    // Puedes agregar lógica adicional aquí si lo necesitas
    // Por ejemplo, analytics para rastrear páginas no encontradas
    console.log('Usuario llegó a página 404');
  }

  ngOnDestroy(): void {
    // Limpieza si es necesaria
  }
}