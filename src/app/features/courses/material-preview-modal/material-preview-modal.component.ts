import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UploadedFile } from '../../../services/file-upload.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { DrillGridModalComponent, DrillGridModalData, DrillGrid, DrillGridCell } from '../../mindmap/drill-grid-modal/drill-grid-modal.component';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

export interface MaterialPreviewModalData {
  material: UploadedFile;
}

@Component({
  selector: 'app-material-preview-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './material-preview-modal.component.html',
  styleUrls: ['./material-preview-modal.component.css']
})
export class MaterialPreviewModalComponent {
  material: UploadedFile;

  constructor(
    public dialogRef: MatDialogRef<MaterialPreviewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MaterialPreviewModalData,
    private http: HttpClient,
    private authService: AuthService,
    private dialog: MatDialog
  ) {
    this.material = data.material;
  }

  getFileUrl(url: string | null | undefined): string {
    if (!url) return '#';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url.replace('http://135.125.107.45:3011', 'http://localhost:3011');
    }
    
    if (url.startsWith('/')) {
      return `http://localhost:3011${url}`;
    }
    
    return `http://localhost:3011/files/uploads/${url}`;
  }

  getMaterialTypeFromMime(mimetype: string): string {
    if (!mimetype) return 'file';
    
    if (mimetype.includes('audio')) return 'audio';
    if (mimetype.includes('video')) return 'video';
    if (mimetype.includes('image')) return 'image';
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('text')) return 'text';
    if (mimetype.includes('json')) return 'drill_grid';
    
    return 'file';
  }

  isDrillGrid(material: UploadedFile): boolean {
    return (material as any).drillGridData?.type === 'drill_grid' || 
           material.mimetype === 'application/json';
  }

  getDrillGridData(material: UploadedFile): any {
    return (material as any).drillGridData?.data || null;
  }

  getDrillGridRowsArray(material: UploadedFile): string[] {
    const data = this.getDrillGridData(material);
    if (!data || !data.rows) {
      return [];
    }
    if (Array.isArray(data.rows)) {
      if (data.rows.length > 0 && typeof data.rows[0] === 'object' && 'label' in data.rows[0]) {
        return (data.rows as Array<{id: string; label: string}>).map(r => r.label);
      } else {
        return data.rows as string[];
      }
    }
    return [];
  }

  getDrillGridColumnsArray(material: UploadedFile): string[] {
    const data = this.getDrillGridData(material);
    if (!data || !data.columns) {
      return [];
    }
    if (Array.isArray(data.columns)) {
      if (data.columns.length > 0 && typeof data.columns[0] === 'object' && 'label' in data.columns[0]) {
        return (data.columns as Array<{id: string; label: string}>).map(c => c.label);
      } else {
        return data.columns as string[];
      }
    }
    return [];
  }

  getDrillGridCellContent(material: UploadedFile, rowIdx: number, colIdx: number): string {
    const data = this.getDrillGridData(material);
    if (!data || !data.cells) {
      return '';
    }

    if (Array.isArray(data.cells)) {
      const expectedRowId = `row_${rowIdx}`;
      const expectedColId = `col_${colIdx}`;
      
      const cell = data.cells.find((c: any) => 
        c.rowId === expectedRowId && c.colId === expectedColId
      );
      
      if (cell && cell.content) {
        return cell.content;
      }
    }

    if (typeof data.cells === 'object' && !Array.isArray(data.cells)) {
      const keys = [`${rowIdx}-${colIdx}`, `${rowIdx}_${colIdx}`];
      for (const key of keys) {
        const value = data.cells[key];
        if (value !== undefined) {
          if (typeof value === 'object' && value !== null && 'content' in value) {
            return value.content || '';
          }
          if (typeof value === 'string') {
            return value;
          }
        }
      }
    }

    return '';
  }

  openDrillGridFullscreen(material: UploadedFile): void {
    const constructorId = (material as any).constructorId;
    if (!constructorId) {
      console.error('❌ ConstructorId не найден для материала:', material);
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      console.error('❌ Токен не найден');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, { headers }).subscribe({
      next: (drillGridData: any) => {
        this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, { headers }).subscribe({
          next: (constructor: any) => {
            const drillGrid: DrillGrid = {
              id: constructorId,
              name: constructor.name || material.filename,
              rows: drillGridData.rows || [],
              columns: drillGridData.columns || [],
              cells: drillGridData.cells || {},
              purpose: drillGridData.purpose || 'info',
              type: drillGridData.purpose || 'info',
              createdAt: new Date(constructor.createdAt || Date.now()),
              constructorId: constructorId
            };

            const drillGridRows: string[] = Array.isArray(drillGrid.rows) 
              ? (typeof drillGrid.rows[0] === 'object' 
                  ? (drillGrid.rows as Array<{id: string; label: string}>).map(r => r.label)
                  : drillGrid.rows as string[])
              : [];

            const drillGridColumns: string[] = Array.isArray(drillGrid.columns)
              ? (typeof drillGrid.columns[0] === 'object'
                  ? (drillGrid.columns as Array<{id: string; label: string}>).map(c => c.label)
                  : drillGrid.columns as string[])
              : [];

            let drillGridCells: { [key: string]: string } = {};
            let drillGridCellsData: DrillGridCell[] = [];

            if (Array.isArray(drillGrid.cells)) {
              drillGridCellsData = drillGrid.cells as DrillGridCell[];
              drillGridCellsData.forEach(cell => {
                const rowIdx = parseInt(cell.rowId.replace('row_', ''));
                const colIdx = parseInt(cell.colId.replace('col_', ''));
                drillGridCells[`${rowIdx}-${colIdx}`] = cell.content || '';
              });
            } else if (typeof drillGrid.cells === 'object') {
              drillGridCells = drillGrid.cells as { [key: string]: string };
              Object.keys(drillGridCells).forEach(key => {
                const [rowIdx, colIdx] = key.split('-').map(Number);
                drillGridCellsData.push({
                  rowId: `row_${rowIdx}`,
                  colId: `col_${colIdx}`,
                  content: drillGridCells[key] || '',
                  correctAnswer: undefined,
                  isEditable: true
                });
              });
            }

            const dialogConfig: MatDialogConfig = {
              width: '100vw',
              height: '100vh',
              maxWidth: '100vw',
              maxHeight: '100vh',
              panelClass: 'drill-grid-fullscreen-modal',
              data: {
                mode: 'preview' as 'preview',
                drillGridName: drillGrid.name,
                drillGridRows: drillGridRows,
                drillGridColumns: drillGridColumns,
                drillGridCells: drillGridCells,
                drillGridCellsData: drillGridCellsData,
                drillGridPurpose: drillGrid.purpose || 'info',
                editingDrillGrid: drillGrid
              } as DrillGridModalData,
              disableClose: false,
              hasBackdrop: true
            };

            this.dialog.open(DrillGridModalComponent, dialogConfig);
          },
          error: (error) => {
            console.error('❌ Ошибка загрузки конструктора:', error);
          }
        });
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки drill-grid:', error);
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }
}

