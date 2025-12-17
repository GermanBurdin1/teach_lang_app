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
  courseLessonId?: string; // ID урока курса (course_lessons.id)
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
  private loadedConstructorIds = new Set<string>(); // Отслеживаем уже загруженные ID для защиты от дубликатов
  
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
    // Защита от повторных вызовов во время загрузки
    if (this.loadingDrillGrids) {
      console.warn('⚠️ Загрузка drill-grids уже выполняется, пропускаем повторный вызов');
      return;
    }
    
    this.loadingDrillGrids = true;
    // Очищаем массив и Set перед загрузкой, чтобы избежать дубликатов
    this.savedDrillGrids = [];
    this.loadedConstructorIds.clear();
    
    console.log('🔄 Начало загрузки drill-grids из БД');
    
    const currentUser = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();
    
    if (!currentUser?.id || !token) {
      console.error('⚠️ Пользователь не авторизован');
      this.loadingDrillGrids = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Загружаем конструкторы типа drill_grid для текущего пользователя
    // userId берется из токена на бэкенде, передаем только type в query параметрах
    const url = `${API_ENDPOINTS.CONSTRUCTORS}?type=drill_grid`;

    console.log('📥 Загрузка drill-grids из БД:', { 
      url, 
      userId: currentUser.id, 
      courseId: this.data.courseId
    });

    this.http.get<any>(url, { headers }).subscribe({
      next: (response) => {
        // API может возвращать массив напрямую или в обёртке { data: [...] }
        let constructors: ConstructorFromDB[] = Array.isArray(response) 
          ? response 
          : (response.data || response.constructors || []);
        
        console.log('✅ Конструкторы загружены из БД:', constructors);
        console.log('📊 Количество конструкторов до фильтрации:', constructors.length);
        console.log('📋 Полный ответ API (первые 5):', constructors.slice(0, 5));
        console.log('📋 Все ID конструкторов:', constructors.map(c => c.id));
        
        // Фильтруем по userId текущего залогиненного преподавателя
        if (currentUser.id && constructors.length > 0) {
          const beforeFilter = constructors.length;
          const userIdsBefore = [...new Set(constructors.map(c => c.userId))];
          console.log('🔍 Уникальные userId до фильтрации:', userIdsBefore);
          
          constructors = constructors.filter(c => c.userId === currentUser.id);
          console.log(`🔍 Фильтрация по userId текущего преподавателя (${currentUser.id}): ${beforeFilter} -> ${constructors.length} конструкторов`);
          
          if (constructors.length !== beforeFilter) {
            const wrongUserIds = constructors.filter(c => c.userId !== currentUser.id);
            if (wrongUserIds.length > 0) {
              console.error('❌ ОШИБКА: После фильтрации остались конструкторы с другим userId!', wrongUserIds);
            }
          }
        }
        
        console.log('📊 Количество конструкторов после фильтрации:', constructors.length);
        console.log('📋 ID конструкторов после фильтрации:', constructors.map(c => c.id));
        
        if (!constructors || constructors.length === 0) {
          console.warn('⚠️ Конструкторы не найдены после фильтрации');
          this.loadingDrillGrids = false;
          return;
        }

        // Убираем дубликаты конструкторов по ID перед загрузкой drill-grid данных
        const constructorIds = constructors.map(c => c.id);
        const duplicateIds = constructorIds.filter((id, index) => constructorIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
          console.error('❌ ОБНАРУЖЕНЫ ДУБЛИКАТЫ конструкторов по ID:', duplicateIds);
        }
        
        const uniqueConstructors = Array.from(
          new Map(constructors.map(c => [c.id, c])).values()
        );
        console.log(`🔍 Удалены дубликаты конструкторов: ${constructors.length} -> ${uniqueConstructors.length}`);
        console.log('📋 Уникальные ID конструкторов:', uniqueConstructors.map(c => c.id));

        // Загружаем drill-grid данные для каждого уникального конструктора
        // Используем Promise.allSettled чтобы не прерывать загрузку при ошибке одного элемента
        const drillGridPromises = uniqueConstructors.map(constructor => 
          this.loadDrillGridData(constructor.id, constructor, headers)
        );

        Promise.allSettled(drillGridPromises).then((results) => {
          const successful = results.filter(r => r.status === 'fulfilled').length;
          const failed = results.filter(r => r.status === 'rejected').length;
          console.log(`📊 Результаты загрузки: успешно ${successful}, ошибок ${failed}`);
          
          this.loadingDrillGrids = false;
          console.log('✅ Все drill-grids загружены из БД:', this.savedDrillGrids.length);
          
          // СТРОГАЯ проверка на дубликаты по ID перед финальным сохранением
          const allIds = this.savedDrillGrids.map(g => g.id);
          const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
          
          if (duplicateIds.length > 0) {
            console.error(`❌ КРИТИЧЕСКАЯ ОШИБКА: Обнаружены дубликаты drill-grids!`);
            console.error(`❌ Было: ${this.savedDrillGrids.length}, дубликатов: ${duplicateIds.length}`);
            console.error('🔍 Дублирующиеся ID:', [...new Set(duplicateIds)]);
            
            // Показываем детали дубликатов
            duplicateIds.forEach(dupId => {
              const duplicates = this.savedDrillGrids.filter(g => g.id === dupId);
              console.error(`🔍 Дубликат ID ${dupId}:`, duplicates.map(d => ({ id: d.id, name: d.name, constructorId: d.constructorId })));
            });
          }
          
          const uniqueGrids = Array.from(
            new Map(this.savedDrillGrids.map(grid => [grid.id, grid])).values()
          );
          
          this.savedDrillGrids = uniqueGrids;
          console.log('✅ Drill-grids после удаления дубликатов:', this.savedDrillGrids.length);
          console.log('📋 Финальный список ID:', this.savedDrillGrids.map(g => g.id));
          console.log('📋 Финальный список названий:', this.savedDrillGrids.map(g => g.name));
        });
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки конструкторов из БД:', error);
        console.error('📋 Детали ошибки:', {
          status: error.status,
          message: error.message,
          error: error.error
        });
        this.loadingDrillGrids = false;
      }
    });
  }


  loadDrillGridData(constructorId: string, constructor: ConstructorFromDB, headers: HttpHeaders): Promise<void> {
    return new Promise((resolve, reject) => {
      // СТРОГАЯ проверка: не загружаем ли мы уже этот конструктор (защита от race condition)
      if (this.loadedConstructorIds.has(constructorId)) {
        console.warn(`⚠️ [${constructorId}] Уже в Set загружаемых, пропускаем`);
        resolve();
        return;
      }
      
      // СТРОГАЯ проверка: не существует ли уже в массиве
      const existingInArray = this.savedDrillGrids.findIndex(g => g.id === constructorId);
      if (existingInArray !== -1) {
        console.warn(`⚠️ [${constructorId}] Уже существует в массиве на позиции ${existingInArray}, пропускаем`);
        resolve();
        return;
      }
      
      // Помечаем как загружаемый
      this.loadedConstructorIds.add(constructorId);
      console.log(`📥 [${constructorId}] Начинаем загрузку drill-grid данных`);
      
      this.http.get<DrillGridFromDB>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, { headers }).subscribe({
        next: (drillGridData) => {
          console.log(`✅ [${constructorId}] Drill-grid данные получены`, { 
            purpose: drillGridData.purpose,
            hasRows: !!drillGridData.rows,
            rowsCount: drillGridData.rows?.length || 0
          });
          
          // ИСКЛЮЧАЕМ homework drill-grids - показываем только info drill-grids
          if (drillGridData.purpose === 'homework') {
            console.log(`⚠️ [${constructorId}] Пропускаем homework drill-grid (purpose: homework)`);
            resolve();
            return;
          }
          
          // ПРОВЕРКА: если нет данных rows/columns, значит drill-grid не создан (только конструктор)
          if (!drillGridData.rows || !drillGridData.columns || drillGridData.rows.length === 0 || drillGridData.columns.length === 0) {
            console.log(`⚠️ [${constructorId}] Пропускаем конструктор без данных drill-grid (нет rows/columns)`);
            resolve();
            return;
          }
          
          // ФИНАЛЬНАЯ проверка перед добавлением (на случай race condition)
          const finalCheck = this.savedDrillGrids.findIndex(g => g.id === constructorId);
          if (finalCheck !== -1) {
            console.error(`❌ [${constructorId}] КРИТИЧЕСКАЯ ОШИБКА: Drill-grid уже существует в массиве на позиции ${finalCheck} перед добавлением!`);
            resolve();
            return;
          }
          
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
          console.log(`✅ [${constructorId}] Добавлен в массив. Всего теперь: ${this.savedDrillGrids.length}`);
          resolve();
        },
        error: (error) => {
          // Если drill-grid не найден (404), значит конструктор есть, но данных drill-grid нет
          if (error.status === 404) {
            console.log(`⚠️ [${constructorId}] Конструктор существует, но drill-grid данных нет (404)`);
          } else {
            console.error(`❌ [${constructorId}] Ошибка загрузки drill-grid данных:`, error);
          }
          // Удаляем из Set при ошибке
          this.loadedConstructorIds.delete(constructorId);
          resolve(); // Используем resolve вместо reject, чтобы Promise.allSettled не прерывался
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

  selectDrillGrid(grid: DrillGrid): void {
    // Всегда загружаем данные из БД по constructorId
    if (grid.constructorId) {
      this.loadDrillGridFromDB(grid.constructorId, grid);
    } else {
      console.error('⚠️ Drill-grid не имеет constructorId, невозможно загрузить из БД');
      // Если нет constructorId, используем данные из grid (но это не должно происходить)
      this.createMaterialFromDrillGrid(grid);
    }
  }

  loadDrillGridFromDB(constructorId: string, grid: DrillGrid): void {
    const currentUser = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();
    
    if (!currentUser?.id || !token) {
      console.error('⚠️ Пользователь не авторизован, невозможно загрузить drill-grid из БД');
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
        // Не используем fallback, только БД
      }
    });
  }

  createMaterialFromDrillGrid(grid: DrillGrid, constructorId?: string): void {
    // Используем constructorId из grid, если он есть, иначе используем переданный параметр
    const finalConstructorId = grid.constructorId || constructorId;
    
    // Создаем материал из drill-grid БЕЗ ТЕГА - только courseLessonId
    const material: UploadedFile = {
      id: Date.now(),
      filename: grid.name,
      url: '', // Drill-grid не имеет URL, это структурированные данные
      mimetype: 'application/json',
      courseId: this.data.courseId,
      createdAt: new Date().toISOString(),
      // НЕ используем tag - только courseLessonId
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
      constructorId: finalConstructorId, // Также сохраняем на уровне материала
      courseLessonId: this.data.courseLessonId // Сохраняем ID урока для связи с конструктором (ОСНОВНОЙ ИДЕНТИФИКАТОР)
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

