import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { UploadedFile } from '../../../../services/file-upload.service';
import { AuthService } from '../../../../services/auth.service';
import { API_ENDPOINTS } from '../../../../core/constants/api.constants';

export interface DrillGrid {
  id: string;
  name: string;
  rows: string[];
  columns: string[];
  cells: { [key: string]: string };
  createdAt: Date;
  constructorId?: string; // ID конструктора из БД (UUID)
}

export interface ConstructorFromDB {
  id: string; // UUID в БД
  title: string;
  type: string;
  courseId: number | null;
  description?: string | null;
  userId: string;
  createdAt: string;
}

export interface DrillGridFromDB {
  rows: Array<{ id: string; label: string; examples: any[] }>;
  columns: Array<{ id: string; label: string; examples: any[] }>;
  cells: Array<{
    rowId: string;
    colId: string;
    content: string;
    correctAnswer?: string;
    hints?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
  }>;
  settings?: any;
  purpose?: string;
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
    MatTabsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './supplementary-materials-modal.component.html',
  styleUrls: ['./supplementary-materials-modal.component.css']
})
export class SupplementaryMaterialsModalComponent implements OnInit {
  selectedTab: number = 0;
  savedDrillGrids: DrillGrid[] = [];
  loadingDrillGrids: boolean = false;
  
  // В будущем здесь будут другие типы материалов из конструктора
  // savedMindmaps: Mindmap[] = [];
  // savedPatternCards: PatternCard[] = [];
  // savedFlowcharts: Flowchart[] = [];

  constructor(
    public dialogRef: MatDialogRef<SupplementaryMaterialsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SupplementaryMaterialsModalData,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadDrillGridsFromDB();
  }

  loadDrillGridsFromDB(): void {
    this.loadingDrillGrids = true;
    const currentUser = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();
    
    if (!currentUser?.id || !token) {
      console.error('⚠️ Пользователь не авторизован');
      this.loadingDrillGrids = false;
      // Fallback к localStorage
      this.loadSavedDrillGrids();
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Загружаем конструкторы типа drill_grid для текущего пользователя
    // userId берется из токена на бэкенде, передаем только type в query параметрах
    const url = `${API_ENDPOINTS.CONSTRUCTORS}?type=drill_grid`;

    console.log('📥 Загрузка drill-grids из БД:', { url, userId: currentUser.id, courseId: this.data.courseId });

    this.http.get<any>(url, { headers }).subscribe({
      next: (response) => {
        // API может возвращать массив напрямую или в обёртке { data: [...] }
        const constructors: ConstructorFromDB[] = Array.isArray(response) 
          ? response 
          : (response.data || response.constructors || []);
        
        console.log('✅ Конструкторы загружены из БД:', constructors);
        console.log('📊 Количество конструкторов:', constructors.length);
        console.log('📋 Полный ответ API:', response);
        
        if (!constructors || constructors.length === 0) {
          console.warn('⚠️ Конструкторы не найдены, пробуем загрузить без фильтра userId');
          // Пробуем загрузить все drill-grids без фильтра по userId
          this.loadAllDrillGrids(headers);
          return;
        }

        // Загружаем drill-grid данные для каждого конструктора
        const drillGridPromises = constructors.map(constructor => 
          this.loadDrillGridData(constructor.id, constructor, headers)
        );

        Promise.all(drillGridPromises).then(() => {
          this.loadingDrillGrids = false;
          console.log('✅ Все drill-grids загружены:', this.savedDrillGrids.length);
        }).catch(error => {
          console.error('❌ Ошибка при загрузке drill-grids:', error);
          this.loadingDrillGrids = false;
          // Fallback к localStorage при ошибке
          this.loadSavedDrillGrids();
        });
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки конструкторов из БД:', error);
        console.error('📋 Детали ошибки:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        // Пробуем загрузить все drill-grids без фильтра
        this.loadAllDrillGrids(headers);
      }
    });
  }

  loadAllDrillGrids(headers: HttpHeaders): void {
    // Пробуем загрузить все drill-grids без фильтра по userId
    const url = `${API_ENDPOINTS.CONSTRUCTORS}?type=drill_grid`;
    console.log('📥 Попытка загрузить все drill-grids:', url);

    this.http.get<any>(url, { headers }).subscribe({
      next: (response) => {
        // API может возвращать массив напрямую или в обёртке { data: [...] }
        const constructors: ConstructorFromDB[] = Array.isArray(response) 
          ? response 
          : (response.data || response.constructors || []);
        
        console.log('✅ Все конструкторы загружены (без фильтра userId):', constructors);
        console.log('📊 Количество конструкторов:', constructors.length);
        console.log('📋 Полный ответ API:', response);
        
        if (!constructors || constructors.length === 0) {
          this.loadingDrillGrids = false;
          // Fallback к localStorage если в БД нет данных
          this.loadSavedDrillGrids();
          return;
        }

        // Загружаем drill-grid данные для каждого конструктора
        const drillGridPromises = constructors.map(constructor => 
          this.loadDrillGridData(constructor.id, constructor, headers)
        );

        Promise.all(drillGridPromises).then(() => {
          this.loadingDrillGrids = false;
          console.log('✅ Все drill-grids загружены:', this.savedDrillGrids.length);
        }).catch(error => {
          console.error('❌ Ошибка при загрузке drill-grids:', error);
          this.loadingDrillGrids = false;
          // Fallback к localStorage при ошибке
          this.loadSavedDrillGrids();
        });
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки всех конструкторов:', error);
        this.loadingDrillGrids = false;
        // Fallback к localStorage при ошибке
        this.loadSavedDrillGrids();
      }
    });
  }

  loadDrillGridData(constructorId: string, constructor: ConstructorFromDB, headers: HttpHeaders): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.get<DrillGridFromDB>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, { headers }).subscribe({
        next: (drillGridData) => {
          console.log(`✅ Drill-grid данные загружены для конструктора ${constructorId}:`, drillGridData);
          
          // Преобразуем данные из БД в формат DrillGrid
          const drillGrid: DrillGrid = {
            id: constructorId, // constructorId уже строка (UUID)
            name: constructor.title,
            rows: drillGridData.rows?.map((row: any) => typeof row === 'string' ? row : row.label) || [],
            columns: drillGridData.columns?.map((col: any) => typeof col === 'string' ? col : col.label) || [],
            cells: this.convertCellsFromDB(drillGridData.cells || []),
            createdAt: new Date(constructor.createdAt || new Date()),
            constructorId: constructorId
          };

          this.savedDrillGrids.push(drillGrid);
          resolve();
        },
        error: (error) => {
          console.error(`❌ Ошибка загрузки drill-grid данных для конструктора ${constructorId}:`, error);
          reject(error);
        }
      });
    });
  }

  convertCellsFromDB(cells: DrillGridFromDB['cells']): { [key: string]: string } {
    const result: { [key: string]: string } = {};
    
    cells.forEach(cell => {
      // Извлекаем индексы из rowId и colId (формат: "row_0", "col_1")
      const rowIndex = parseInt(cell.rowId.replace('row_', ''), 10);
      const colIndex = parseInt(cell.colId.replace('col_', ''), 10);
      const key = `${rowIndex}-${colIndex}`;
      result[key] = cell.content || '';
    });

    return result;
  }

  loadSavedDrillGrids(): void {
    // Fallback: загружаем из localStorage если БД недоступна
    const saved = localStorage.getItem('savedDrillGrids');
    if (saved) {
      try {
        this.savedDrillGrids = JSON.parse(saved).map((grid: any) => ({
          ...grid,
          createdAt: new Date(grid.createdAt)
        }));
      } catch (e) {
        console.error('Error loading saved drill-grids from localStorage:', e);
        this.savedDrillGrids = [];
      }
    }
  }

  selectDrillGrid(grid: DrillGrid): void {
    // Если есть constructorId, загружаем данные из БД
    if (grid.constructorId) {
      this.loadDrillGridFromDB(grid.constructorId, grid);
    } else {
      // Используем данные из localStorage (fallback)
      this.createMaterialFromDrillGrid(grid);
    }
  }

  loadDrillGridFromDB(constructorId: string, grid: DrillGrid): void {
    const currentUser = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();
    
    if (!currentUser?.id || !token) {
      console.error('⚠️ Пользователь не авторизован');
      // Fallback к данным из grid
      this.createMaterialFromDrillGrid(grid);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('📥 Загрузка drill-grid из БД для выбора:', constructorId);

    this.http.get<DrillGridFromDB>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, { headers }).subscribe({
      next: (drillGridData) => {
        console.log('✅ Drill-grid данные загружены из БД:', drillGridData);
        
        // Преобразуем данные из БД в формат для материала
        const updatedGrid: DrillGrid = {
          ...grid,
          rows: drillGridData.rows.map(row => row.label),
          columns: drillGridData.columns.map(col => col.label),
          cells: this.convertCellsFromDB(drillGridData.cells)
        };

        this.createMaterialFromDrillGrid(updatedGrid, constructorId);
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки drill-grid из БД:', error);
        // Fallback к данным из grid
        this.createMaterialFromDrillGrid(grid);
      }
    });
  }

  createMaterialFromDrillGrid(grid: DrillGrid, constructorId?: string): void {
    // Используем constructorId из grid, если он есть, иначе используем переданный параметр
    const finalConstructorId = grid.constructorId || constructorId;
    
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

    // Сохраняем данные drill-grid
    const drillGridData = {
      type: 'drill_grid',
      data: {
        id: finalConstructorId?.toString() || grid.id,
        name: grid.name,
        rows: grid.rows,
        columns: grid.columns,
        cells: grid.cells,
        constructorId: finalConstructorId // Сохраняем ID конструктора для связи с БД
      }
    };
    
    // Расширяем материал данными drill-grid
    const materialWithData = {
      ...material,
      drillGridData: drillGridData,
      constructorId: finalConstructorId // Также сохраняем на уровне материала
    } as UploadedFile;

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

