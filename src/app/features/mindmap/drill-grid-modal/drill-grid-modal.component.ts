import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
// Интерфейсы для drill-grid
export interface DrillGridCell {
  rowId: string;
  colId: string;
  content: string;
  correctAnswer?: string;
  isEditable?: boolean;
}

export interface TableElementStyle {
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  textColor?: string;
  bgColor?: string;
}

export interface NormalizedTableStyle {
  header: Required<TableElementStyle>;
  firstCol: Required<TableElementStyle>;
  cells: Required<TableElementStyle>;
}

export interface DrillGrid {
  id: string;
  name: string;
  rows: Array<{ id: string; label: string }> | string[];
  columns: Array<{ id: string; label: string }> | string[];
  cells: DrillGridCell[] | { [key: string]: string };
  tableStyle?: {
    header?: TableElementStyle;
    firstCol?: TableElementStyle;
    cells?: TableElementStyle;
    // Обратная совместимость со старым форматом
    fontFamily?: string;
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    textColor?: string;
    headerBgColor?: string;
    firstColBgColor?: string;
    cellBgColor?: string;
  };
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
  tableStyle?: DrillGrid['tableStyle'];
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
    MatSelectModule,
    MatTabsModule,
    MatCardModule,
    MatSlideToggleModule,
    MatSliderModule
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
  tableStyle: NormalizedTableStyle;
  drillGridPurpose: 'info' | 'homework';
  editingDrillGrid?: DrillGrid | null;
  onSave?: (data: any) => void;
  onUpdate?: (data: any) => void;
  selectedTabIndex = 0;

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
    this.tableStyle = this.normalizeTableStyle(data.tableStyle);
    this.drillGridPurpose = data.drillGridPurpose;
    this.editingDrillGrid = data.editingDrillGrid;
    this.onSave = data.onSave;
    this.onUpdate = data.onUpdate;
  }

  private normalizeTableStyle(style?: DrillGrid['tableStyle']): NormalizedTableStyle {
    if (!style) {
      return this.getDefaultTableStyle();
    }

    // Если уже новая структура с header/firstCol/cells
    if (style.header || style.firstCol || style.cells) {
      const defaultHeader = this.getDefaultHeaderStyle();
      const defaultFirstCol = this.getDefaultFirstColStyle();
      const defaultCells = this.getDefaultCellStyle();
      
      return {
        header: {
          fontFamily: style.header?.fontFamily ?? defaultHeader.fontFamily,
          fontSize: style.header?.fontSize ?? defaultHeader.fontSize,
          bold: style.header?.bold ?? defaultHeader.bold,
          italic: style.header?.italic ?? defaultHeader.italic,
          underline: style.header?.underline ?? defaultHeader.underline,
          textColor: style.header?.textColor ?? defaultHeader.textColor,
          bgColor: style.header?.bgColor ?? defaultHeader.bgColor
        },
        firstCol: {
          fontFamily: style.firstCol?.fontFamily ?? defaultFirstCol.fontFamily,
          fontSize: style.firstCol?.fontSize ?? defaultFirstCol.fontSize,
          bold: style.firstCol?.bold ?? defaultFirstCol.bold,
          italic: style.firstCol?.italic ?? defaultFirstCol.italic,
          underline: style.firstCol?.underline ?? defaultFirstCol.underline,
          textColor: style.firstCol?.textColor ?? defaultFirstCol.textColor,
          bgColor: style.firstCol?.bgColor ?? defaultFirstCol.bgColor
        },
        cells: {
          fontFamily: style.cells?.fontFamily ?? defaultCells.fontFamily,
          fontSize: style.cells?.fontSize ?? defaultCells.fontSize,
          bold: style.cells?.bold ?? defaultCells.bold,
          italic: style.cells?.italic ?? defaultCells.italic,
          underline: style.cells?.underline ?? defaultCells.underline,
          textColor: style.cells?.textColor ?? defaultCells.textColor,
          bgColor: style.cells?.bgColor ?? defaultCells.bgColor
        }
      };
    }

    // Миграция со старого формата
    return {
      header: {
        fontFamily: style.fontFamily || 'Inter',
        fontSize: style.fontSize || 16,
        bold: style.bold ?? true,
        italic: style.italic ?? false,
        underline: style.underline ?? false,
        textColor: style.textColor || '#111827',
        bgColor: style.headerBgColor || '#f3f4f6'
      },
      firstCol: {
        fontFamily: style.fontFamily || 'Inter',
        fontSize: style.fontSize || 14,
        bold: style.bold ?? false,
        italic: style.italic ?? false,
        underline: style.underline ?? false,
        textColor: style.textColor || '#111827',
        bgColor: style.firstColBgColor || '#f9fafb'
      },
      cells: {
        fontFamily: style.fontFamily || 'Inter',
        fontSize: style.fontSize || 14,
        bold: style.bold ?? false,
        italic: style.italic ?? false,
        underline: style.underline ?? false,
        textColor: style.textColor || '#111827',
        bgColor: style.cellBgColor || '#ffffff'
      }
    };
  }

  ngOnInit(): void {
  }

  trackByIndex(index: number): number {
    return index;
  }

  getCellValue(rowIndex: number, colIndex: number): string {
    const key = `${rowIndex}-${colIndex}`;
    return this.drillGridCells[key] || '';
  }

  getCellStyle(rowIndex: number, colIndex: number): any {
    const cell = this.getCellData(rowIndex, colIndex);
    const style = (cell as any).style || {};
    const cellStyle = this.tableStyle.cells;
    const fs = this.getFontSizeValue(style.fontSize ?? cellStyle.fontSize);
    const bg = style.bgColor || cellStyle.bgColor;
    const txt = style.textColor || cellStyle.textColor;
    const fontFamily = style.fontFamily || cellStyle.fontFamily;
    const fontSize = fs ?? undefined;
    const fontWeight = style.bold ?? cellStyle.bold ? '600' : '400';
    const fontStyle = style.italic ?? cellStyle.italic ? 'italic' : 'normal';
    const textDecoration = style.underline ?? cellStyle.underline ? 'underline' : 'none';
    return {
      'background-color': bg,
      'color': txt,
      'font-family': fontFamily,
      'font-size.px': fontSize,
      'font-weight': fontWeight,
      'font-style': fontStyle,
      'text-decoration': textDecoration
    };
  }

  getHeaderStyle(): any {
    const headerStyle = this.tableStyle.header;
    const fs = this.getFontSizeValue(headerStyle.fontSize);
    return {
      'background-color': headerStyle.bgColor,
      'color': headerStyle.textColor,
      'font-family': headerStyle.fontFamily,
      'font-size.px': fs ?? undefined,
      'font-weight': headerStyle.bold ? '600' : '400',
      'font-style': headerStyle.italic ? 'italic' : 'normal',
      'text-decoration': headerStyle.underline ? 'underline' : 'none'
    };
  }

  getFirstColStyle(): any {
    const firstColStyle = this.tableStyle.firstCol;
    const fs = this.getFontSizeValue(firstColStyle.fontSize);
    return {
      'background-color': firstColStyle.bgColor,
      'color': firstColStyle.textColor,
      'font-family': firstColStyle.fontFamily,
      'font-size.px': fs ?? undefined,
      'font-weight': firstColStyle.bold ? '600' : '400',
      'font-style': firstColStyle.italic ? 'italic' : 'normal',
      'text-decoration': firstColStyle.underline ? 'underline' : 'none'
    };
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
      tableStyle: this.tableStyle,
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
        tableStyle: this.tableStyle,
        drillGridPurpose: this.drillGridPurpose
      });
    } else if (this.onSave) {
      this.onSave({
        drillGridName: this.drillGridName,
        drillGridRows: this.drillGridRows,
        drillGridColumns: this.drillGridColumns,
        drillGridCells: this.drillGridCells,
        drillGridCellsData: this.drillGridCellsData,
        tableStyle: this.tableStyle,
        drillGridPurpose: this.drillGridPurpose
      });
    }
    this.dialogRef.close();
  }

  private getDefaultTableStyle(): NormalizedTableStyle {
    return {
      header: this.getDefaultHeaderStyle(),
      firstCol: this.getDefaultFirstColStyle(),
      cells: this.getDefaultCellStyle()
    };
  }

  private getDefaultHeaderStyle(): Required<TableElementStyle> {
    return {
      fontFamily: 'Inter',
      fontSize: 16,
      bold: true,
      italic: false,
      underline: false,
      textColor: '#111827',
      bgColor: '#f3f4f6'
    };
  }

  private getDefaultFirstColStyle(): Required<TableElementStyle> {
    return {
      fontFamily: 'Inter',
      fontSize: 14,
      bold: false,
      italic: false,
      underline: false,
      textColor: '#111827',
      bgColor: '#f9fafb'
    };
  }

  private getDefaultCellStyle(): Required<TableElementStyle> {
    return {
      fontFamily: 'Inter',
      fontSize: 14,
      bold: false,
      italic: false,
      underline: false,
      textColor: '#111827',
      bgColor: '#ffffff'
    };
  }

  private getFontSizeValue(val: any): number | null {
    const n = Number(val);
    return isNaN(n) ? null : n;
  }

  close(): void {
    this.dialogRef.close();
  }
}

