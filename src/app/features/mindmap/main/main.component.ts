import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { LayoutModule } from '../../../layout/layout.module';
import { DialogService } from '../../../shared/components/modale/service/dialog.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, LayoutModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {
  constructor(private router: Router, private dialogs: DialogService) { }

  startInstantMindmap(): void {
    this.router.navigate(['/constructeurs', 'instant']);
  }

  createCourseMindmap(): void {
    this.router.navigate(['/constructeurs', 'create'], {
      queryParams: { type: 'mindmap' }
    });
  }


  createPersonalMindmap() {
    this.dialogs.openUniversal({
      title: 'Créer une mindmap personnelle',
      description: 'Choisis les paramètres de ta mindmap',
      content: 'Tu peux changer ces valeurs plus tard.',
      okText: 'Créer',
      cancelText: 'Annuler',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Nom de la mindmap',
          placeholder: 'Ex: Planification du budget alimentaire',
          required: true,
          value: 'Ma mindmap'
        },
        {
          type: 'select',
          name: 'type',
          label: 'Type',
          required: true,
          value: 'personal',
          options: [
            { value: 'business', label: 'Business' },
            { value: 'apprentissage', label: 'Apprentissage' },
            { value: 'autre', label: 'Autre' },
          ]
        }
      ]
    }).subscribe(result => {
      if (!result.confirmed) return;

      // ✅ тут все данные
      const { name, type } = result.values;
      console.log('Create mindmap with:', { name, type });

      // например:
      // this.mindmapService.create({ name, type }).subscribe(...)
    });
  }



  goBack(): void {
    this.router.navigate(['/constructeurs']);
  }
}
