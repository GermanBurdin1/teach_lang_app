import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LayoutModule } from '../../../layout/layout.module';
import { DialogService } from '../../../shared/components/modale/service/dialog.service';
import { MindmapService } from '../mindmap.service';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, LayoutModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {
  constructor(private router: Router, private dialogs: DialogService, private mindmapService: MindmapService,) { }

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
          value: 'Ma mindmap',
        },
        {
          type: 'select',
          name: 'type',
          label: 'Type',
          required: true,
          value: 'personal',
          options: [
            { value: 'personal', label: 'Personnelle' },
            { value: 'instant', label: 'Instant' },
            { value: 'course', label: 'Cours' },
          ],
        },
      ],
    }).subscribe(result => {
      if (!result.confirmed) return;

      const title = String(result.values['name'] ?? '').trim();
      const type = result.values['type'] as 'course' | 'instant' | 'personal';

      // простая валидация на фронте
      if (!title) return;

      const dto = {
        title,          // ✅ то, что ждёт entity/DTO
        type,           // ✅ MindmapType
        courseId: null, // ✅ optional (если создаёшь personal/instant)
        nodes: [],      // ✅ optional (можно убрать вообще)
      };

      this.mindmapService.createMindMap(dto).subscribe({
        next: created => {
          console.log('Mindmap created:', created);
          // например: this.router.navigate(['/mindmaps', created.id]);
        },
        error: err => {
          console.error('Create mindmap failed:', err);
        },
      });
    });
  }




  goBack(): void {
    this.router.navigate(['/constructeurs']);
  }
}
