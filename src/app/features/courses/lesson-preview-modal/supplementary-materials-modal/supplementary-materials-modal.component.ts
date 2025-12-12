import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { UploadedFile } from '../../../../services/file-upload.service';

export interface DrillGrid {
  id: string;
  name: string;
  rows: string[];
  columns: string[];
  cells: { [key: string]: string };
  createdAt: Date;
}

export interface SupplementaryMaterialsModalData {
  section: string;
  lesson: string;
  subSection?: string;
  courseId: string;
}

@Component({
  selector: 'app-supplementary-materials-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTabsModule
  ],
  templateUrl: './supplementary-materials-modal.component.html',
  styleUrls: ['./supplementary-materials-modal.component.css']
})
export class SupplementaryMaterialsModalComponent implements OnInit {
  selectedTab: number = 0;
  savedDrillGrids: DrillGrid[] = [];
  
  // В будущем здесь будут другие типы материалов из конструктора
  // savedMindmaps: Mindmap[] = [];
  // savedPatternCards: PatternCard[] = [];
  // savedFlowcharts: Flowchart[] = [];

  constructor(
    public dialogRef: MatDialogRef<SupplementaryMaterialsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SupplementaryMaterialsModalData
  ) {}

  ngOnInit(): void {
    this.loadSavedDrillGrids();
  }

  loadSavedDrillGrids(): void {
    const saved = localStorage.getItem('savedDrillGrids');
    if (saved) {
      try {
        this.savedDrillGrids = JSON.parse(saved).map((grid: any) => ({
          ...grid,
          createdAt: new Date(grid.createdAt)
        }));
      } catch (e) {
        console.error('Error loading saved drill-grids:', e);
        this.savedDrillGrids = [];
      }
    }
  }

  selectDrillGrid(grid: DrillGrid): void {
    // Создаем материал из drill-grid
    const material: UploadedFile = {
      id: Date.now(),
      filename: grid.name,
      url: '', // Drill-grid не имеет URL, это структурированные данные
      mimetype: 'application/json',
      courseId: this.data.courseId,
      createdAt: new Date().toISOString(),
      tag: `${this.data.lesson}_supplementary`,
      description: `Drill-grid: ${grid.rows.length} lignes × ${grid.columns.length} colonnes`
    };

    // Сохраняем данные drill-grid в description или создаем специальное поле
    // Для простоты сохраним JSON в description, но лучше создать отдельное поле
    const drillGridData = {
      type: 'drill_grid',
      data: {
        id: grid.id,
        name: grid.name,
        rows: grid.rows,
        columns: grid.columns,
        cells: grid.cells
      }
    };
    
    // Расширяем материал данными drill-grid
    const materialWithData = {
      ...material,
      drillGridData: drillGridData
    };

    this.dialogRef.close({
      action: 'addDrillGrid',
      material: materialWithData,
      drillGrid: grid
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}

