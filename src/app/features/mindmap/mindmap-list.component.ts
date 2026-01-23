import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MindmapService } from './mindmap.service';
import { Mindmap } from './models/mindmap.model';

@Component({
  selector: 'app-mindmap-list',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div style="display:flex; align-items:center; gap:12px; margin-bottom: 16px;">
      <button mat-stroked-button (click)="back()">
        <mat-icon>arrow_back</mat-icon>
        Retour
      </button>
      <h2 style="margin:0;">Mes mindmaps</h2>
    </div>

    <ng-container *ngIf="loading; else content">
      <p>Chargement...</p>
    </ng-container>

    <ng-template #content>
      <ng-container *ngIf="mindmaps.length > 0; else empty">
        <mat-card
          *ngFor="let m of mindmaps"
          style="margin-bottom: 12px; cursor: pointer;"
          (click)="open(m)"
        >
          <mat-card-title>{{ m.title }}</mat-card-title>
          <mat-card-subtitle>Type: {{ m.type }}</mat-card-subtitle>
        </mat-card>
      </ng-container>

      <ng-template #empty>
        <p>Aucune mindmap pour le moment.</p>
      </ng-template>
    </ng-template>
  `,
})
export class MindmapListComponent implements OnInit {
  mindmaps: Mindmap[] = [];
  loading = true;

  constructor(private api: MindmapService, private router: Router) {}

  ngOnInit(): void {
    this.api.getAllMindmaps().subscribe({
      next: (list) => {
        this.mindmaps = list ?? [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load mindmaps', err);
        this.loading = false;
      },
    });
  }

  open(m: Mindmap): void {
    this.router.navigate(['/constructeurs', 'instant'], {
      queryParams: { mindmapId: m.id, type: m.type },
    });
  }

  back(): void {
    this.router.navigate(['/constructeurs', 'mindmap']);
  }
}
