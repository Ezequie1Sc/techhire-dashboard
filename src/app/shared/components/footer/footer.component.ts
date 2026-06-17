import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

import { TranslationService } from '../../../core/i18n/translation.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent {

  constructor(
    public translation: TranslationService
  ) {}

}