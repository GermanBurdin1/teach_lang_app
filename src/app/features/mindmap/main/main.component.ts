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
    this.dialogs.openInstall({ title: 'Créer une mindmap' }).subscribe((ok) => {
      if (!ok) return;

      // ✅ сюда твоя логика "создать mindmap"
      console.log('User confirmed -> create mindmap');
    });
  }


  goBack(): void {
    this.router.navigate(['/constructeurs']);
  }
}
