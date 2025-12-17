import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule, MatDialogConfig } from '@angular/material/dialog';
import { DrillGridModalComponent, DrillGridModalData } from '../drill-grid-modal/drill-grid-modal.component';
import { LayoutModule } from '../../../layout/layout.module';
import { AuthService } from '../../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { NotificationService } from '../../../services/notification.service';
import { RoleService } from '../../../services/role.service';

type ConstructorType = 'mindmap' | 'drill_grid' | 'pattern_card' | 'flowchart';

interface ConstructorTypeConfig {
  title: string;
  description: string;
  icon: string;
  steps: Array<{ title: string; description: string }>;
}

export interface DrillGridCell {
  rowId: string;
  colId: string;
  content: string;
  correctAnswer?: string; // Правильный ответ для этой клетки
  isEditable?: boolean; // Можно ли редактировать эту клетку студенту
}

export interface DrillGrid {
  id: string;
  name: string;
  editName?: string; // Временное поле для инлайн-редактирования названия
  rows: Array<{ id: string; label: string }> | string[]; // Поддержка старого формата
  columns: Array<{ id: string; label: string }> | string[]; // Поддержка старого формата
  cells: DrillGridCell[] | { [key: string]: string }; // Поддержка старого формата
  settings?: any;
  purpose?: 'info' | 'homework';
  createdAt: Date;
  type: 'info' | 'homework'; // Тип: для информации (read-only) или для домашних заданий
  userId?: string; // Для homework drill-grids - ID студента (если есть)
  originalId?: string; // Для homework drill-grids - ID оригинального шаблона от преподавателя
  constructorId?: string; // ID конструктора
}

// Тип-гард для проверки формата rows/columns
function isStringArray(arr: any): arr is string[] {
  return Array.isArray(arr) && (arr.length === 0 || typeof arr[0] === 'string');
}

function isObjectArray(arr: any): arr is Array<{id: string; label: string}> {
  return Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'object' && 'id' in arr[0] && 'label' in arr[0];
}

@Component({
  selector: 'app-create-mindmap',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    LayoutModule, 
    MatButtonModule, 
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatChipsModule,
    MatSelectModule,
    MatDialogModule
  ],
  templateUrl: './create-mindmap.component.html',
  styleUrls: ['./create-mindmap.component.css']
})
export class CreateMindmapComponent implements OnInit {
  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private roleService: RoleService
  ) {}
  
  constructorType: ConstructorType = 'mindmap';
  typeConfig: ConstructorTypeConfig | null = null;
  
  // Drill-grid properties
  drillGridName: string = '';
  drillGridRows: string[] = [];
  drillGridColumns: string[] = [];
  drillGridCells: { [key: string]: string } = {};
  drillGridCellsData: DrillGridCell[] = []; // Новый формат с правильными ответами и редактируемостью
  showMyDrillGrids: boolean = false;
  savedDrillGrids: DrillGrid[] = [];
  drillGridFilter: 'all' | 'info' | 'homework' = 'all';
  drillGridTabIndex: number = 0;
  editingDrillGrid: DrillGrid | null = null; // Текущий редактируемый drill-grid
  viewingDrillGrid: DrillGrid | null = null; // Drill-grid в режиме просмотра
  drillGridPurpose: 'info' | 'homework' = 'info'; // Purpose текущего drill-grid
  matrixViewMode: 'config' | 'preview' = 'config'; // Режим просмотра: конфигурация или финальный просмотр
  renamingGridId: string | null = null;
  
  // Matrix configuration
  numRows: number = 3;
  numColumns: number = 4;

  private typeConfigs: Record<ConstructorType, ConstructorTypeConfig> = {
    mindmap: {
      title: 'Nouvelle mindmap pédagogique',
      description: 'Préparez le squelette de votre leçon avant de passer à l\'éditeur visuel.',
      icon: 'account_tree',
      steps: [
        { title: 'Choisir un cours', description: 'Associez la mindmap à un parcours existant.' },
        { title: 'Nommer la mindmap', description: 'Décrivez son objectif principal.' },
        { title: 'Structurer le plan', description: 'Ajoutez les sections clés et préparez les nœuds initiaux.' }
      ]
    },
    drill_grid: {
      title: 'Nouvelle drill-grid',
      description: 'Créez une matrice d\'exercices pour la grammaire et le vocabulaire.',
      icon: 'grid_on',
      steps: [
        { title: 'Nommer la drill-grid', description: 'Décrivez son objectif principal.' },
        { title: 'Configurer la matrice', description: 'Définissez les lignes, colonnes et cellules de la matrice.' },
        { title: 'Choisir un cours', description: 'Associez la drill-grid à un parcours existant quand vous le souhaitez.' }
      ]
    },
    pattern_card: {
      title: 'Nouvelle pattern-card',
      description: 'Créez des modèles de phrases pour automatiser la conversation.',
      icon: 'format_quote',
      steps: [
        { title: 'Choisir un cours', description: 'Associez la pattern-card à un parcours existant.' },
        { title: 'Nommer la pattern-card', description: 'Décrivez son objectif principal.' },
        { title: 'Définir le modèle', description: 'Créez le modèle de phrase avec des emplacements à remplir.' }
      ]
    },
    flowchart: {
      title: 'Nouveau flowchart',
      description: 'Créez un schéma algorithmique pour choisir les formes, temps et modalités.',
      icon: 'device_hub',
      steps: [
        { title: 'Choisir un cours', description: 'Associez le flowchart à un parcours existant.' },
        { title: 'Nommer le flowchart', description: 'Décrivez son objectif principal.' },
        { title: 'Construire l\'algorithme', description: 'Créez les nœuds de décision et les chemins de l\'algorithme.' }
      ]
    }
  };


  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const type = params['type'] as ConstructorType;
      if (type && this.isValidConstructorType(type)) {
        this.constructorType = type;
        this.typeConfig = this.typeConfigs[type];
        
        // Инициализация для drill-grid
        if (type === 'drill_grid') {
          this.initializeDrillGrid();
        }
      } else {
        // Если тип не указан или невалидный, перенаправляем на выбор типа
        this.router.navigate(['/constructeurs']);
      }
    });
    
    // Загружаем сохраненные drill-grids из localStorage
    this.loadSavedDrillGrids();
  }

  // Сохранение нового имени из карточки сохраненных drill-grids
  saveGridName(grid: DrillGrid): void {
    const newName = (grid as any).editName ? (grid as any).editName.trim() : '';
    const constructorId = grid.constructorId || grid.id;

    if (!newName) {
      this.notificationService.error('Veuillez saisir un nom pour la drill-grid');
      return;
    }
    if (!constructorId) {
      this.notificationService.error('ID du constructeur manquant');
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    this.renamingGridId = constructorId;
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Обновляем название конструктора (источник правды для имени)
    this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, { title: newName }, { headers }).subscribe({
      next: () => {
        // Обновляем локально имя карточки
        grid.name = newName;
        (grid as any).editName = newName;

        // Перезагружаем список из БД, чтобы синхронизировать все поля
        this.loadSavedDrillGrids();
        this.notificationService.success('Nom mis à jour');
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour du nom du constructeur:', error);
        this.notificationService.error('Erreur lors de la mise à jour du nom');
      },
      complete: () => {
        this.renamingGridId = null;
      }
    });
  }
  
  initializeDrillGrid(): void {
    // Инициализируем матрицу с пустыми строками и столбцами
    this.drillGridRows = Array(this.numRows).fill('').map((_, i) => '');
    this.drillGridColumns = Array(this.numColumns).fill('').map((_, i) => '');
    this.drillGridCells = {};
  }
  
  loadSavedDrillGrids(): void {
    const user = this.authService.getCurrentUser();
    const userId = user?.id?.toString();
    const token = this.authService.getAccessToken();
    
    if (!token || !userId) {
      console.warn('⚠️ Не удалось загрузить drill-grids: отсутствует токен или userId');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Загружаем все drill-grids текущего пользователя через специальный endpoint
    this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/drill-grid/my`, { headers }).subscribe({
      next: (drillGrids: any) => {
        console.log('✅ Загружены drill-grids из БД:', drillGrids);
        
        if (Array.isArray(drillGrids) && drillGrids.length > 0) {
          const loadedGrids: DrillGrid[] = drillGrids
            .filter((dg: any) => dg && !dg.error)
            .map((dg: any) => {
              const constructor = dg.constructorRef || {};
              const displayName = constructor.title || 'Sans nom';
              return {
                id: dg.id,
                name: displayName,
                editName: displayName,
                rows: dg.rows || [],
                columns: dg.columns || [],
                cells: dg.cells || [],
                settings: dg.settings,
                purpose: dg.purpose || 'info',
                createdAt: constructor.createdAt ? new Date(constructor.createdAt) : new Date(),
                type: (dg.purpose === 'homework' ? 'homework' : 'info') as 'info' | 'homework',
                userId: dg.studentUserId || constructor.userId,
                originalId: dg.originalId || undefined, // originalId должен быть null для info, установлен для homework
                constructorId: dg.id
              };
            });

          console.log('✅ Загружены drill-grids из БД:', loadedGrids.length);
          this.savedDrillGrids = loadedGrids;
        } else {
          console.log('ℹ️ Нет drill-grids для загрузки');
          this.savedDrillGrids = [];
        }
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки drill-grids:', error);
        this.savedDrillGrids = [];
      }
    });
  }
  
  get filteredDrillGrids(): DrillGrid[] {
    if (this.drillGridFilter === 'all') {
      return this.savedDrillGrids;
    }
    return this.savedDrillGrids.filter(g => g.type === this.drillGridFilter);
  }
  
  get infoDrillGrids(): DrillGrid[] {
    return this.savedDrillGrids.filter(g => g.type === 'info');
  }
  
  get homeworkDrillGrids(): DrillGrid[] {
    return this.savedDrillGrids.filter(g => g.type === 'homework');
  }
  
  createMatrix(): void {
    // Создаем матрицу с заданным количеством строк и столбцов
    this.drillGridRows = Array(this.numRows).fill('').map((_, i) => '');
    this.drillGridColumns = Array(this.numColumns).fill('').map((_, i) => '');
    this.drillGridCells = {};
  }
  
  updateCell(rowIndex: number, colIndex: number, value: string): void {
    const key = `${rowIndex}-${colIndex}`;
    this.drillGridCells[key] = value;
    
    // Также обновляем drillGridCellsData для синхронизации
    const cellData = this.getCellData(rowIndex, colIndex);
    cellData.content = value;
    
    // Если ячейка не найдена в drillGridCellsData, создаем новую
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
  
  getCellValue(rowIndex: number, colIndex: number): string {
    const key = `${rowIndex}-${colIndex}`;
    return this.drillGridCells[key] || '';
  }
  
  addRow(): void {
    this.drillGridRows.push('');
    this.numRows++;
  }
  
  removeRow(index: number): void {
    if (this.drillGridRows.length > 1) {
      // Удаляем ячейки этой строки и сдвигаем индексы
      const cellsToUpdate: { [key: string]: string } = {};
      Object.keys(this.drillGridCells).forEach(key => {
        const [rowIdx, colIdx] = key.split('-').map(Number);
        if (rowIdx === index) {
          // Удаляем ячейки этой строки
          delete this.drillGridCells[key];
        } else if (rowIdx > index) {
          // Сдвигаем индексы строк ниже
          const newKey = `${rowIdx - 1}-${colIdx}`;
          cellsToUpdate[newKey] = this.drillGridCells[key];
          delete this.drillGridCells[key];
        }
      });
      // Применяем обновления
      Object.keys(cellsToUpdate).forEach(key => {
        this.drillGridCells[key] = cellsToUpdate[key];
      });
      
      this.drillGridRows.splice(index, 1);
      this.numRows--;
    }
  }
  
  addColumn(): void {
    this.drillGridColumns.push('');
    this.numColumns++;
  }
  
  removeColumn(index: number): void {
    if (this.drillGridColumns.length > 1) {
      // Удаляем ячейки этого столбца и сдвигаем индексы
      const cellsToUpdate: { [key: string]: string } = {};
      Object.keys(this.drillGridCells).forEach(key => {
        const [rowIdx, colIdx] = key.split('-').map(Number);
        if (colIdx === index) {
          // Удаляем ячейки этого столбца
          delete this.drillGridCells[key];
        } else if (colIdx > index) {
          // Сдвигаем индексы столбцов правее
          const newKey = `${rowIdx}-${colIdx - 1}`;
          cellsToUpdate[newKey] = this.drillGridCells[key];
          delete this.drillGridCells[key];
        }
      });
      // Применяем обновления
      Object.keys(cellsToUpdate).forEach(key => {
        this.drillGridCells[key] = cellsToUpdate[key];
      });
      
      this.drillGridColumns.splice(index, 1);
      this.numColumns--;
    }
  }
  
  saveDrillGrid(): void {
    // Если редактируем существующий drill-grid, обновляем его
    if (this.editingDrillGrid && this.editingDrillGrid.constructorId) {
      this.updateDrillGrid();
      return;
    }
    
    // Иначе создаем новый
    if (!this.drillGridName.trim()) {
      this.notificationService.error('Veuillez nommer la drill-grid avant de la sauvegarder.');
      return;
    }
    
    const user = this.authService.getCurrentUser();
    const userId = user?.id?.toString();
    const token = this.authService.getAccessToken();
    
    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    // Преобразуем cells из объекта в массив для API
    const cellsArray = Object.keys(this.drillGridCells).map(key => ({
      rowIndex: parseInt(key.split('_')[0]),
      colIndex: parseInt(key.split('_')[1]),
      value: this.drillGridCells[key]
    }));

    // Сначала создаем конструктор
    const constructorPayload = {
      title: this.drillGridName,
      type: 'drill_grid' as const,
      courseId: null,
      description: null
    };

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Создаем конструктор и затем drill-grid
    this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}`, constructorPayload, { headers }).subscribe({
      next: (constructor: any) => {
        const constructorId = constructor?.id || constructor?.data?.id;
        
        if (!constructorId) {
          console.error('❌ Конструктор создан, но ID отсутствует:', constructor);
          this.notificationService.error('Erreur: ID du constructeur manquant');
          return;
        }

        // Теперь создаем drill-grid в БД
        // Преобразуем rows и columns в правильный формат согласно entity
        const rows = this.drillGridRows.map((row, index) => ({
          id: `row_${index}`,
          label: row || `Ligne ${index + 1}`,
          examples: []
        }));
        
        const columns = this.drillGridColumns.map((col, index) => ({
          id: `col_${index}`,
          label: col || `Colonne ${index + 1}`,
          examples: []
        }));
        
        // Преобразуем cells в правильный формат с правильными ответами и редактируемостью
        const cells: DrillGridCell[] = [];
        
        // Используем новый формат если есть данные
        if (this.drillGridCellsData.length > 0) {
          cells.push(...this.drillGridCellsData);
        } else {
          // Иначе преобразуем из старого формата
          Object.keys(this.drillGridCells).forEach(key => {
            const [rowIdx, colIdx] = key.split('-').map(Number);
            const cellData = this.getCellData(rowIdx, colIdx);
            cells.push({
              rowId: `row_${rowIdx}`,
              colId: `col_${colIdx}`,
              content: this.drillGridCells[key] || '',
              correctAnswer: cellData.correctAnswer,
              isEditable: cellData.isEditable ?? true
            });
          });
        }
        
        const drillGridPayload = {
          rows,
          columns,
          cells,
          settings: null,
          purpose: this.drillGridPurpose as 'info' | 'homework',
          originalId: this.editingDrillGrid?.originalId || null
        };

        this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, drillGridPayload, { headers }).subscribe({
          next: (drillGrid: any) => {
            console.log('✅ Drill-grid сохранен в БД:', drillGrid);
            this.notificationService.success(`Drill-grid "${this.drillGridName}" sauvegardée avec succès!`);
            this.drillGridName = '';
            this.editingDrillGrid = null;
            this.drillGridCellsData = [];
            this.drillGridCells = {};
            this.drillGridRows = [];
            this.drillGridColumns = [];

            // Обновляем список из БД, чтобы "Mes drill-grids sauvegardées" показывал свежие данные
            this.loadSavedDrillGrids();
          },
          error: (error) => {
            console.error('❌ Ошибка сохранения drill-grid в БД:', error);
            this.notificationService.error(`Erreur lors de la sauvegarde du drill-grid: ${error.message || 'Erreur inconnue'}`);
          }
        });
      },
      error: (error) => {
        console.error('❌ Ошибка создания конструктора:', error);
        this.notificationService.error(`Erreur lors de la création du constructeur: ${error.message || 'Erreur inconnue'}`);
      }
    });
  }

  // Обновить существующий drill-grid
  updateDrillGrid(): void {
    if (!this.editingDrillGrid) {
      return;
    }
    
    const constructorId = this.editingDrillGrid.constructorId || this.editingDrillGrid.id;
    if (!constructorId) {
      this.notificationService.error('ID du constructeur manquant');
      return;
    }

    const user = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();
    if (!user?.id || !token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Обновляем название конструктора
    this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, {
      title: this.drillGridName
    }, { headers }).subscribe({
      next: () => {
        // Преобразуем rows и columns
        const rows = this.drillGridRows.map((row, index) => ({
          id: `row_${index}`,
          label: row || `Ligne ${index + 1}`,
          examples: []
        }));
        
        const columns = this.drillGridColumns.map((col, index) => ({
          id: `col_${index}`,
          label: col || `Colonne ${index + 1}`,
          examples: []
        }));
        
        // Преобразуем cells - собираем данные из всех ячеек матрицы
        const cells: DrillGridCell[] = [];
        
        // Проходим по всем ячейкам матрицы и собираем данные
        for (let rowIdx = 0; rowIdx < this.drillGridRows.length; rowIdx++) {
          for (let colIdx = 0; colIdx < this.drillGridColumns.length; colIdx++) {
            const cellData = this.getCellData(rowIdx, colIdx);
            const key = `${rowIdx}-${colIdx}`;
            const content = this.drillGridCells[key] || cellData.content || '';
            
            cells.push({
              rowId: `row_${rowIdx}`,
              colId: `col_${colIdx}`,
              content: content,
              correctAnswer: cellData.correctAnswer,
              isEditable: cellData.isEditable ?? true
            });
          }
        }
        
        const drillGridPayload = {
          rows,
          columns,
          cells,
          settings: null,
          purpose: this.drillGridPurpose as 'info' | 'homework'
        };

        // Обновляем drill-grid
        this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, drillGridPayload, { headers }).subscribe({
          next: (updatedDrillGrid: any) => {
            console.log('✅ Drill-grid обновлен:', updatedDrillGrid);
            
        // После обновления конструктора и drill-grid перезагружаем список, чтобы подтянуть новое имя
        this.loadSavedDrillGrids();
        
            // Обновляем локальный массив savedDrillGrids
            const index = this.savedDrillGrids.findIndex(g => g.id === constructorId || g.constructorId === constructorId);
            if (index !== -1) {
              // Обновляем существующий drill-grid в массиве
              const updatedGrid: DrillGrid = {
                ...this.savedDrillGrids[index],
                name: this.drillGridName,
            editName: this.drillGridName,
                rows: rows,
                columns: columns,
                cells: cells,
                purpose: this.drillGridPurpose as 'info' | 'homework'
              };
            this.savedDrillGrids[index] = updatedGrid;
            }
            
            this.notificationService.success(`Drill-grid "${this.drillGridName}" mise à jour avec succès!`);
            this.editingDrillGrid = null;
            this.drillGridCellsData = [];
            this.drillGridCells = {};
            this.drillGridRows = [];
            this.drillGridColumns = [];
            this.drillGridName = '';
          },
          error: (error) => {
            console.error('❌ Ошибка обновления drill-grid:', error);
            this.notificationService.error(`Erreur lors de la mise à jour du drill-grid: ${error.message || 'Erreur inconnue'}`);
          }
        });
      },
      error: (error) => {
        console.error('❌ Ошибка обновления конструктора:', error);
        this.notificationService.error(`Erreur lors de la mise à jour du constructeur: ${error.message || 'Erreur inconnue'}`);
      }
    });
  }
  
  duplicateDrillGrid(grid: DrillGrid): void {
    const user = this.authService.getCurrentUser();
    const userId = user?.id?.toString();
    const token = this.authService.getAccessToken();
    
    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    // Определяем originalId: если это копия info drill-grid, originalId = grid.id
    // Если это копия homework drill-grid, сохраняем его originalId
    const originalId = grid.type === 'info' ? grid.id : (grid.originalId || grid.id);

    // Преобразуем cells из объекта в массив для API
    const cellsArray = Array.isArray(grid.cells) 
      ? grid.cells 
      : Object.keys(grid.cells).map(key => {
          const [rowIdx, colIdx] = key.split('_').map(Number);
          return {
            rowId: `row_${rowIdx}`,
            colId: `col_${colIdx}`,
            content: (grid.cells as any)[key] || '',
            correctAnswer: undefined,
            hints: [],
            difficulty: undefined as 'easy' | 'medium' | 'hard' | undefined
          };
        });

    // Преобразуем rows и columns в правильный формат
    let rows: Array<{id: string; label: string; examples: never[]}>;
    if (Array.isArray(grid.rows) && grid.rows.length > 0) {
      if (typeof grid.rows[0] === 'string') {
        rows = (grid.rows as string[]).map((row: string, index: number) => ({
          id: `row_${index}`,
          label: row || `Ligne ${index + 1}`,
          examples: []
        }));
      } else {
        rows = (grid.rows as Array<{id: string; label: string}>).map((row: {id: string; label: string}) => ({
          id: row.id,
          label: row.label,
          examples: []
        }));
      }
    } else {
      rows = [];
    }

    let columns: Array<{id: string; label: string; examples: never[]}>;
    if (Array.isArray(grid.columns) && grid.columns.length > 0) {
      if (typeof grid.columns[0] === 'string') {
        columns = (grid.columns as string[]).map((col: string, index: number) => ({
          id: `col_${index}`,
          label: col || `Colonne ${index + 1}`,
          examples: []
        }));
      } else {
        columns = (grid.columns as Array<{id: string; label: string}>).map((col: {id: string; label: string}) => ({
          id: col.id,
          label: col.label,
          examples: []
        }));
      }
    } else {
      columns = [];
    }

    // Создаем конструктор для дубликата
    const constructorPayload = {
      title: `${grid.name} (copie)`,
      type: 'drill_grid' as const,
      courseId: null,
      description: null
    };

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Создаем конструктор и затем drill-grid
    this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}`, constructorPayload, { headers }).subscribe({
      next: (constructor: any) => {
        const constructorId = constructor?.id || constructor?.data?.id;
        
        if (!constructorId) {
          console.error('❌ Конструктор создан, но ID отсутствует:', constructor);
          this.notificationService.error('Erreur: ID du constructeur manquant');
          return;
        }

        // Создаем drill-grid с originalId
        const drillGridPayload = {
          rows,
          columns,
          cells: cellsArray,
          settings: null,
          purpose: grid.type === 'homework' ? 'homework' as const : 'info' as const,
          originalId: originalId // Передаем originalId для связи с оригиналом
        };

        this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, drillGridPayload, { headers }).subscribe({
          next: (drillGrid: any) => {
            console.log('✅ Drill-grid дублирован в БД:', drillGrid);
            
            // Обновляем локальный список
            const duplicatedGrid: DrillGrid = {
              id: constructorId,
              name: `${grid.name} (copie)`,
              rows: grid.rows,
              columns: grid.columns,
              cells: grid.cells,
              createdAt: new Date(),
              type: grid.type,
              userId: userId,
              originalId: originalId
            };
            
            this.savedDrillGrids.push(duplicatedGrid);
            
            this.notificationService.success(`Drill-grid "${duplicatedGrid.name}" dupliquée avec succès!`);
          },
          error: (error) => {
            console.error('❌ Ошибка дублирования drill-grid в БД:', error);
            this.notificationService.error(`Erreur lors de la duplication: ${error.message || 'Erreur inconnue'}`);
          }
        });
      },
      error: (error) => {
        console.error('❌ Ошибка создания конструктора для дубликата:', error);
        this.notificationService.error(`Erreur lors de la création du constructeur: ${error.message || 'Erreur inconnue'}`);
      }
    });
  }
  
  /**
   * Создает homework drill-grid для студента на основе шаблона от преподавателя
   * Используется при добавлении домашнего задания через lesson-preview-modal
   * 
   * @param templateGrid - Шаблон drill-grid от преподавателя (type: 'info')
   * @param studentUserId - ID студента, для которого создается homework
   * @returns Созданный homework drill-grid
   * 
   * Пример использования из lesson-preview-modal:
   * const component = this.createMindmapComponentRef;
   * const homeworkGrid = component.createHomeworkDrillGrid(templateGrid, studentId);
   */
  createHomeworkDrillGrid(templateGrid: DrillGrid, studentUserId: string): DrillGrid {
    // Преобразуем rows и columns в правильный формат
    let rowsCopy: string[] | Array<{id: string; label: string}>;
    if (isStringArray(templateGrid.rows)) {
      rowsCopy = [...templateGrid.rows];
    } else if (isObjectArray(templateGrid.rows)) {
      rowsCopy = [...templateGrid.rows];
    } else {
      rowsCopy = [];
    }
    
    let columnsCopy: string[] | Array<{id: string; label: string}>;
    if (isStringArray(templateGrid.columns)) {
      columnsCopy = [...templateGrid.columns];
    } else if (isObjectArray(templateGrid.columns)) {
      columnsCopy = [...templateGrid.columns];
    } else {
      columnsCopy = [];
    }
    
    const homeworkGrid: DrillGrid = {
      id: Date.now().toString(),
      name: `${templateGrid.name} (devoir)`,
      rows: rowsCopy,
      columns: columnsCopy,
      cells: {}, // Пустые ячейки для студента - он будет их заполнять
      createdAt: new Date(),
      type: 'homework',
      userId: studentUserId,
      originalId: templateGrid.id
    };
    
    // Сохраняем в localStorage студента
    const savedHomework = localStorage.getItem(`savedDrillGrids_homework_${studentUserId}`);
    let homeworkGrids: DrillGrid[] = savedHomework ? JSON.parse(savedHomework) : [];
    homeworkGrids.push(homeworkGrid);
    localStorage.setItem(`savedDrillGrids_homework_${studentUserId}`, JSON.stringify(homeworkGrids));
    
    return homeworkGrid;
  }
  
  toggleMyDrillGrids(): void {
    this.showMyDrillGrids = !this.showMyDrillGrids;
  }
  
  loadDrillGrid(grid: DrillGrid): void {
    const constructorId = grid.constructorId || grid.id;
    const user = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();
    
    if (!token || !constructorId) {
      console.warn('⚠️ Не удалось загрузить drill-grid: отсутствует токен или constructorId');
      // Fallback на локальные данные
      this.loadDrillGridFromLocal(grid);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Загружаем актуальные данные с сервера
    this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, { headers }).subscribe({
      next: (drillGridData: any) => {
        console.log('✅ Загружен drill-grid с сервера:', drillGridData);
        
        // Получаем данные конструктора для названия
        this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, { headers }).subscribe({
          next: (constructorData: any) => {
            const constructor = constructorData || {};
            const gridName = constructor.title || grid.name || 'Sans nom';
            
            // Преобразуем rows и columns в простой формат для редактирования
            let rowsArray: string[] = [];
            if (Array.isArray(drillGridData.rows) && drillGridData.rows.length > 0) {
              if (typeof drillGridData.rows[0] === 'object') {
                rowsArray = (drillGridData.rows as Array<{ id: string; label: string }>).map(r => r.label);
              } else {
                rowsArray = drillGridData.rows as string[];
              }
            }
            
            let columnsArray: string[] = [];
            if (Array.isArray(drillGridData.columns) && drillGridData.columns.length > 0) {
              if (typeof drillGridData.columns[0] === 'object') {
                columnsArray = (drillGridData.columns as Array<{ id: string; label: string }>).map(c => c.label);
              } else {
                columnsArray = drillGridData.columns as string[];
              }
            }
            
            // Загружаем данные в форму редактирования
            this.editingDrillGrid = { 
              ...grid, 
              constructorId: constructorId,
              id: constructorId
            };
            this.viewingDrillGrid = null;
            
            this.drillGridName = gridName;
            this.drillGridRows = [...rowsArray];
            this.drillGridColumns = [...columnsArray];
            this.drillGridPurpose = drillGridData.purpose || grid.purpose || grid.type || 'info';
            
            // Преобразуем cells в новый формат с правильными ответами
            // Сначала очищаем старые данные
            this.drillGridCells = {};
            this.drillGridCellsData = [];
            
            if (Array.isArray(drillGridData.cells) && drillGridData.cells.length > 0) {
              // Новый формат - массив DrillGridCell
              drillGridData.cells.forEach((cell: DrillGridCell) => {
                const rowIdx = parseInt(cell.rowId.replace('row_', ''));
                const colIdx = parseInt(cell.colId.replace('col_', ''));
                const key = `${rowIdx}-${colIdx}`;
                
                // Сохраняем в оба формата для совместимости
                this.drillGridCells[key] = cell.content || '';
                this.drillGridCellsData.push({
                  rowId: cell.rowId,
                  colId: cell.colId,
                  content: cell.content || '',
                  correctAnswer: cell.correctAnswer,
                  isEditable: cell.isEditable ?? true
                });
              });
            } else if (drillGridData.cells && typeof drillGridData.cells === 'object') {
              // Старый формат - объект
              Object.keys(drillGridData.cells).forEach(key => {
                const [rowIdx, colIdx] = key.split('-').map(Number);
                const content = (drillGridData.cells as { [key: string]: string })[key] || '';
                
                this.drillGridCells[key] = content;
                this.drillGridCellsData.push({
                  rowId: `row_${rowIdx}`,
                  colId: `col_${colIdx}`,
                  content: content,
                  correctAnswer: undefined,
                  isEditable: true
                });
              });
            } else {
              // Пустые ячейки - создаем для всех позиций
              for (let rowIdx = 0; rowIdx < rowsArray.length; rowIdx++) {
                for (let colIdx = 0; colIdx < columnsArray.length; colIdx++) {
                  const key = `${rowIdx}-${colIdx}`;
                  this.drillGridCells[key] = '';
                  this.drillGridCellsData.push({
                    rowId: `row_${rowIdx}`,
                    colId: `col_${colIdx}`,
                    content: '',
                    correctAnswer: undefined,
                    isEditable: true
                  });
                }
              }
            }
            
            this.numRows = rowsArray.length;
            this.numColumns = columnsArray.length;
            this.showMyDrillGrids = false;
          },
          error: (error) => {
            console.error('❌ Ошибка загрузки конструктора:', error);
            // Fallback на локальные данные
            this.loadDrillGridFromLocal(grid);
          }
        });
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки drill-grid с сервера:', error);
        // Fallback на локальные данные
        this.loadDrillGridFromLocal(grid);
      }
    });
  }

  private loadDrillGridFromLocal(grid: DrillGrid): void {
    // Загружаем drill-grid для редактирования из локальных данных
    this.editingDrillGrid = { ...grid, constructorId: grid.constructorId || grid.id };
    this.viewingDrillGrid = null;
    
    // Преобразуем rows и columns в простой формат для редактирования
    let rowsArray: string[] = [];
    if (Array.isArray(grid.rows) && grid.rows.length > 0) {
      if (typeof grid.rows[0] === 'object') {
        rowsArray = (grid.rows as Array<{ id: string; label: string }>).map(r => r.label);
      } else {
        rowsArray = grid.rows as string[];
      }
    }
    
    let columnsArray: string[] = [];
    if (Array.isArray(grid.columns) && grid.columns.length > 0) {
      if (typeof grid.columns[0] === 'object') {
        columnsArray = (grid.columns as Array<{ id: string; label: string }>).map(c => c.label);
      } else {
        columnsArray = grid.columns as string[];
      }
    }
    
    this.drillGridName = grid.name;
    this.drillGridRows = [...rowsArray];
    this.drillGridColumns = [...columnsArray];
    this.drillGridPurpose = grid.purpose || grid.type || 'info';
    
    // Преобразуем cells в новый формат с правильными ответами
    // Сначала очищаем старые данные
    this.drillGridCells = {};
    this.drillGridCellsData = [];
    
    if (Array.isArray(grid.cells) && grid.cells.length > 0) {
      // Новый формат - массив DrillGridCell
      grid.cells.forEach((cell: DrillGridCell) => {
        const rowIdx = parseInt(cell.rowId.replace('row_', ''));
        const colIdx = parseInt(cell.colId.replace('col_', ''));
        const key = `${rowIdx}-${colIdx}`;
        
        // Сохраняем в оба формата для совместимости
        this.drillGridCells[key] = cell.content || '';
        this.drillGridCellsData.push({
          rowId: cell.rowId,
          colId: cell.colId,
          content: cell.content || '',
          correctAnswer: cell.correctAnswer,
          isEditable: cell.isEditable ?? true
        });
      });
    } else if (grid.cells && typeof grid.cells === 'object') {
      // Старый формат - объект
      Object.keys(grid.cells).forEach(key => {
        const [rowIdx, colIdx] = key.split('-').map(Number);
        const content = (grid.cells as { [key: string]: string })[key] || '';
        
        this.drillGridCells[key] = content;
        this.drillGridCellsData.push({
          rowId: `row_${rowIdx}`,
          colId: `col_${colIdx}`,
          content: content,
          correctAnswer: undefined,
          isEditable: true
        });
      });
    } else {
      // Пустые ячейки - создаем для всех позиций
      for (let rowIdx = 0; rowIdx < rowsArray.length; rowIdx++) {
        for (let colIdx = 0; colIdx < columnsArray.length; colIdx++) {
          const key = `${rowIdx}-${colIdx}`;
          this.drillGridCells[key] = '';
          this.drillGridCellsData.push({
            rowId: `row_${rowIdx}`,
            colId: `col_${colIdx}`,
            content: '',
            correctAnswer: undefined,
            isEditable: true
          });
        }
      }
    }
    
    this.numRows = rowsArray.length;
    this.numColumns = columnsArray.length;
    this.showMyDrillGrids = false;
  }

  // Просмотр drill-grid без редактирования
  viewDrillGrid(grid: DrillGrid): void {
    this.viewingDrillGrid = grid;
    this.editingDrillGrid = null;
  }

  // Получить данные клетки (content, correctAnswer, isEditable)
  getCellData(rowIdx: number, colIdx: number): DrillGridCell {
    const cell = this.drillGridCellsData.find(c => 
      c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`
    );
    
    if (cell) {
      return cell;
    }
    
    // Если не найдено, создаем новую клетку
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

  // Обновить правильный ответ для клетки
  updateCorrectAnswer(rowIdx: number, colIdx: number, correctAnswer: string): void {
    const cell = this.getCellData(rowIdx, colIdx);
    cell.correctAnswer = correctAnswer;
  }

  // Переключить редактируемость клетки
  toggleCellEditable(rowIdx: number, colIdx: number): void {
    const cell = this.getCellData(rowIdx, colIdx);
    cell.isEditable = !cell.isEditable;
  }

  // Изменить purpose drill-grid
  changeDrillGridPurpose(purpose: 'info' | 'homework'): void {
    this.drillGridPurpose = purpose;
  }

  // Получить содержимое клетки для просмотра
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

  // Получить правильный ответ для просмотра
  getViewCellCorrectAnswer(grid: DrillGrid, rowIdx: number, colIdx: number): string | undefined {
    if (Array.isArray(grid.cells)) {
      const cell = grid.cells.find((c: DrillGridCell) => 
        c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`
      );
      return cell?.correctAnswer;
    }
    return undefined;
  }

  // Получить редактируемость для просмотра
  getViewCellEditable(grid: DrillGrid, rowIdx: number, colIdx: number): boolean {
    if (Array.isArray(grid.cells)) {
      const cell = grid.cells.find((c: DrillGridCell) => 
        c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`
      );
      return cell?.isEditable ?? false;
    }
    return false;
  }

  // Открыть диалог для ввода правильного ответа
  openCorrectAnswerDialog(rowIdx: number, colIdx: number): void {
    const cell = this.getCellData(rowIdx, colIdx);
    const currentAnswer = cell.correctAnswer || '';
    
    const answer = prompt('Entrez la réponse correcte pour cette cellule:', currentAnswer);
    if (answer !== null) {
      this.updateCorrectAnswer(rowIdx, colIdx, answer);
    }
  }

  // Проверка, является ли пользователь преподавателем
  isTeacher(): boolean {
    return this.roleService.isTeacher();
  }

  // Проверка, может ли пользователь редактировать drill-grid
  canEditDrillGrid(grid: DrillGrid): boolean {
    const isTeacher = this.isTeacher();
    const isInfo = grid.purpose === 'info' || grid.type === 'info';
    
    // Info drill-grids могут редактировать только преподаватели
    if (isInfo) {
      return isTeacher;
    }
    
    // Homework drill-grids могут редактировать и преподаватели, и студенты (владельцы)
    return true;
  }

  // Получить массив строк из rows drill-grid
  getGridRowsArray(grid: DrillGrid): string[] {
    if (Array.isArray(grid.rows) && grid.rows.length > 0) {
      if (typeof grid.rows[0] === 'object') {
        return (grid.rows as Array<{id: string; label: string}>).map(r => r.label);
      }
      return grid.rows as string[];
    }
    return [];
  }

  // Получить массив строк из columns drill-grid
  getGridColumnsArray(grid: DrillGrid): string[] {
    if (Array.isArray(grid.columns) && grid.columns.length > 0) {
      if (typeof grid.columns[0] === 'object') {
        return (grid.columns as Array<{id: string; label: string}>).map(c => c.label);
      }
      return grid.columns as string[];
    }
    return [];
  }
  
  deleteDrillGrid(gridId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette drill-grid?')) {
      this.savedDrillGrids = this.savedDrillGrids.filter(g => g.id !== gridId);
    }
  }
  
  onTabChange(index: number): void {
    if (index === 0) {
      this.drillGridFilter = 'all';
    } else if (index === 1) {
      this.drillGridFilter = 'info';
    } else if (index === 2) {
      this.drillGridFilter = 'homework';
    }
  }

  private isValidConstructorType(type: string): type is ConstructorType {
    return ['mindmap', 'drill_grid', 'pattern_card', 'flowchart'].includes(type);
  }

  get steps() {
    return this.typeConfig?.steps || [];
  }

  // Открыть модальное окно для просмотра/редактирования матрицы
  openMatrixModal(mode: 'config' | 'preview'): void {
    if (this.drillGridRows.length === 0 || this.drillGridColumns.length === 0) {
      this.notificationService.warning('Veuillez d\'abord créer la matrice');
      return;
    }

    const dialogConfig: MatDialogConfig = {
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      panelClass: 'drill-grid-fullscreen-modal',
      data: {
        mode: mode,
        drillGridName: this.drillGridName,
        drillGridRows: this.drillGridRows,
        drillGridColumns: this.drillGridColumns,
        drillGridCells: this.drillGridCells,
        drillGridCellsData: this.drillGridCellsData,
        drillGridPurpose: this.drillGridPurpose,
        editingDrillGrid: this.editingDrillGrid,
        onSave: (data: any) => {
          this.drillGridName = data.drillGridName;
          this.drillGridRows = data.drillGridRows;
          this.drillGridColumns = data.drillGridColumns;
          this.drillGridCells = data.drillGridCells;
          this.drillGridCellsData = data.drillGridCellsData;
          this.drillGridPurpose = data.drillGridPurpose;
          this.saveDrillGrid();
        },
        onUpdate: (data: any) => {
          this.drillGridName = data.drillGridName;
          this.drillGridRows = data.drillGridRows;
          this.drillGridColumns = data.drillGridColumns;
          this.drillGridCells = data.drillGridCells;
          this.drillGridCellsData = data.drillGridCellsData;
          this.drillGridPurpose = data.drillGridPurpose;
          this.updateDrillGrid();
        }
      } as DrillGridModalData,
      disableClose: false,
      hasBackdrop: true
    };

    const dialogRef = this.dialog.open(DrillGridModalComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(() => {
      // Модалка закрыта
    });
  }

  // Получить текущую матрицу для предпросмотра
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

  goBack(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Используем navigateByUrl для более надежной навигации
    this.router.navigateByUrl('/constructeurs').catch(err => {
      console.error('Navigation error:', err);
      // Fallback на Location если navigateByUrl не сработал
      this.location.go('/constructeurs');
    });
  }
}


