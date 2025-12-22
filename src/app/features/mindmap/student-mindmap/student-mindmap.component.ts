import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LayoutModule } from '../../../layout/layout.module';

@Component({
  selector: 'app-student-mindmap',
  standalone: true,
  imports: [CommonModule, LayoutModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './student-mindmap.component.html',
  styleUrls: ['./student-mindmap.component.css']
})
export class StudentMindmapComponent {
  constructor(private router: Router) {}

  createPersonalMindmap(): void {
    this.router.navigate(['/mindmap', 'student', 'create'], {
      queryParams: { type: 'mindmap' }
    });
  }
}



