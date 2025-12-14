import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
// Интерфейсы для drill-grid
export interface DrillGridCell {
  rowId: string;
  colId: string;
  content: string;
  correctAnswer?: string;
  isEditable?: boolean;
}

export interface DrillGrid {
  id: string;
  name: string;
  rows: Array<{ id: string; label: string }> | string[];
  columns: Array<{ id: string; label: string }> | string[];
  cells: DrillGridCell[] | { [key: string]: string };
  settings?: any;
  purpose?: 'info' | 'homework';
  createdAt: Date;
  type: 'info' | 'homework';
  userId?: string;
  originalId?: string;
  constructorId?: string;
}

export interface DrillGridModalData {
  mode: 'config' | 'preview';
  drillGridName: string;
  drillGridRows: string[];
  drillGridColumns: string[];
  drillGridCells: { [key: string]: string };
  drillGridCellsData: DrillGridCell[];
  drillGridPurpose: 'info' | 'homework';
  editingDrillGrid?: DrillGrid | null;
  onSave?: (data: any) => void;
  onUpdate?: (data: any) => void;
}

@Component({
  selector: 'app-drill-grid-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule
  ],
  templateUrl: './drill-grid-modal.component.html',
  styleUrls: ['./drill-grid-modal.component.css']
})
export class DrillGridModalComponent implements OnInit {
  mode: 'config' | 'preview';
  drillGridName: string;
  drillGridRows: string[];
  drillGridColumns: string[];
  drillGridCells: { [key: string]: string };
  drillGridCellsData: DrillGridCell[];
  drillGridPurpose: 'info' | 'homework';
  editingDrillGrid?: DrillGrid | null;
  onSave?: (data: any) => void;
  onUpdate?: (data: any) => void;

  constructor(
    public dialogRef: MatDialogRef<DrillGridModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DrillGridModalData
  ) {
    this.mode = data.mode;
    this.drillGridName = data.drillGridName;
    this.drillGridRows = [...data.drillGridRows];
    this.drillGridColumns = [...data.drillGridColumns];
    this.drillGridCells = { ...data.drillGridCells };
    this.drillGridCellsData = [...data.drillGridCellsData];
    this.drillGridPurpose = data.drillGridPurpose;
    this.editingDrillGrid = data.editingDrillGrid;
    this.onSave = data.onSave;
    this.onUpdate = data.onUpdate;
  }

  ngOnInit(): void {
  }

  getCellValue(rowIndex: number, colIndex: number): string {
    const key = `${rowIndex}-${colIndex}`;
    return this.drillGridCells[key] || '';
  }

  updateCell(rowIndex: number, colIndex: number, value: string): void {
    const key = `${rowIndex}-${colIndex}`;
    this.drillGridCells[key] = value;
    
    // Также обновляем drillGridCellsData для синхронизации
    const cellData = this.getCellData(rowIndex, colIndex);
    cellData.content = value;
    
    const existingCellIndex = this.drillGridCellsData.findIndex(c => 
      c.rowId === `row_${rowIndex}` && c.colId === `col_${colIndex}`
    );
    
    if (existingCellIndex === -1) {
      this.drillGridCellsData.push({
        rowId: `row_${rowIndex}`,
        colId: `col_${colIndex}`,
        content: value,
        correctAnswer: undefined,
        isEditable: true
      });
    } else {
      this.drillGridCellsData[existingCellIndex].content = value;
    }
  }

  getCellData(rowIdx: number, colIdx: number): DrillGridCell {
    const cell = this.drillGridCellsData.find(c => 
      c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`
    );
    
    if (cell) {
      return cell;
    }
    
    const newCell: DrillGridCell = {
      rowId: `row_${rowIdx}`,
      colId: `col_${colIdx}`,
      content: this.getCellValue(rowIdx, colIdx),
      correctAnswer: undefined,
      isEditable: true
    };
    
    this.drillGridCellsData.push(newCell);
    return newCell;
  }

  getCurrentMatrixForPreview(): DrillGrid {
    return {
      id: this.editingDrillGrid?.id || '',
      name: this.drillGridName,
      rows: this.drillGridRows.map((row, index) => ({
        id: `row_${index}`,
        label: row || `Ligne ${index + 1}`
      })),
      columns: this.drillGridColumns.map((col, index) => ({
        id: `col_${index}`,
        label: col || `Colonne ${index + 1}`
      })),
      cells: this.drillGridCellsData.length > 0 
        ? this.drillGridCellsData 
        : Object.keys(this.drillGridCells).map(key => {
            const [rowIdx, colIdx] = key.split('-').map(Number);
            const cellData = this.getCellData(rowIdx, colIdx);
            return {
              rowId: `row_${rowIdx}`,
              colId: `col_${colIdx}`,
              content: this.drillGridCells[key] || '',
              correctAnswer: cellData.correctAnswer,
              isEditable: cellData.isEditable ?? true
            };
          }),
      createdAt: new Date(),
      type: this.drillGridPurpose,
      purpose: this.drillGridPurpose,
      constructorId: this.editingDrillGrid?.constructorId
    };
  }

  getGridRowsArray(grid: DrillGrid): string[] {
    if (Array.isArray(grid.rows) && grid.rows.length > 0) {
      if (typeof grid.rows[0] === 'object') {
        return (grid.rows as Array<{ id: string; label: string }>).map(r => r.label);
      } else {
        return grid.rows as string[];
      }
    }
    return [];
  }

  getGridColumnsArray(grid: DrillGrid): string[] {
    if (Array.isArray(grid.columns) && grid.columns.length > 0) {
      if (typeof grid.columns[0] === 'object') {
        return (grid.columns as Array<{ id: string; label: string }>).map(c => c.label);
      } else {
        return grid.columns as string[];
      }
    }
    return [];
  }

  getViewCellContent(grid: DrillGrid, rowIdx: number, colIdx: number): string {
    if (Array.isArray(grid.cells)) {
      const cell = grid.cells.find((c: DrillGridCell) => 
        c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`
      );
      return cell?.content || '';
    } else {
      const key = `${rowIdx}-${colIdx}`;
      return (grid.cells as { [key: string]: string })[key] || '';
    }
  }

  getViewCellCorrectAnswer(grid: DrillGrid, rowIdx: number, colIdx: number): string | undefined {
    if (Array.isArray(grid.cells)) {
      const cell = grid.cells.find((c: DrillGridCell) => 
        c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`
      );
      return cell?.correctAnswer;
    }
    return undefined;
  }

  getViewCellEditable(grid: DrillGrid, rowIdx: number, colIdx: number): boolean {
    if (Array.isArray(grid.cells)) {
      const cell = grid.cells.find((c: DrillGridCell) => 
        c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`
      );
      return cell?.isEditable ?? false;
    }
    return false;
  }

  save(): void {
    if (this.onUpdate && this.editingDrillGrid) {
      this.onUpdate({
        drillGridName: this.drillGridName,
        drillGridRows: this.drillGridRows,
        drillGridColumns: this.drillGridColumns,
        drillGridCells: this.drillGridCells,
        drillGridCellsData: this.drillGridCellsData,
        drillGridPurpose: this.drillGridPurpose
      });
    } else if (this.onSave) {
      this.onSave({
        drillGridName: this.drillGridName,
        drillGridRows: this.drillGridRows,
        drillGridColumns: this.drillGridColumns,
        drillGridCells: this.drillGridCells,
        drillGridCellsData: this.drillGridCellsData,
        drillGridPurpose: this.drillGridPurpose
      });
    }
    this.dialogRef.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}

