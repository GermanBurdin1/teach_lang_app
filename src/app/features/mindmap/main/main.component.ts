import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LayoutModule } from '../../../layout/layout.module';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [CommonModule, LayoutModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.css']
})
export class MainComponent {
  constructor(private router: Router) {}

  startInstantMindmap(): void {
    this.router.navigate(['/constructeurs', 'instant']);
  }

  createCourseMindmap(): void {
    this.router.navigate(['/constructeurs', 'create'], {
      queryParams: { type: 'mindmap' }
    });
  }

  createPersonalMindmap(): void {
    this.router.navigate(['/constructeurs', 'instant'], {
      queryParams: { type: 'mindmap' }
    });
  }

  goBack(): void {
    this.router.navigate(['/constructeurs']);
  }
}
