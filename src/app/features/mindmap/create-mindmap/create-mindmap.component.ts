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
import { LayoutModule } from '../../../layout/layout.module';
import { AuthService } from '../../../services/auth.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { NotificationService } from '../../../services/notification.service';

type ConstructorType = 'mindmap' | 'drill_grid' | 'pattern_card' | 'flowchart';

interface ConstructorTypeConfig {
  title: string;
  description: string;
  icon: string;
  steps: Array<{ title: string; description: string }>;
}

export interface DrillGrid {
  id: string;
  name: string;
  rows: string[];
  columns: string[];
  cells: { [key: string]: string }; // ключ: "row_index-column_index", значение: содержимое ячейки
  createdAt: Date;
  type: 'info' | 'homework'; // Тип: для информации (read-only) или для домашних заданий
  userId?: string; // Для homework drill-grids - ID студента (если есть)
  originalId?: string; // Для homework drill-grids - ID оригинального шаблона от преподавателя
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
    MatChipsModule
  ],
  templateUrl: './create-mindmap.component.html',
  styleUrls: ['./create-mindmap.component.css']
})
export class CreateMindmapComponent implements OnInit {
  constructorType: ConstructorType = 'mindmap';
  typeConfig: ConstructorTypeConfig | null = null;
  
  // Drill-grid properties
  drillGridName: string = '';
  drillGridRows: string[] = [];
  drillGridColumns: string[] = [];
  drillGridCells: { [key: string]: string } = {};
  showMyDrillGrids: boolean = false;
  savedDrillGrids: DrillGrid[] = [];
  drillGridFilter: 'all' | 'info' | 'homework' = 'all';
  drillGridTabIndex: number = 0;
  
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

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private location: Location,
    private authService: AuthService,
    private notificationService: NotificationService,
    private http: HttpClient
  ) {}

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
              return {
                id: dg.id,
                name: constructor.title || 'Sans nom',
                rows: dg.rows || [],
                columns: dg.columns || [],
                cells: dg.cells || [],
                createdAt: constructor.createdAt ? new Date(constructor.createdAt) : new Date(),
                type: (dg.purpose === 'homework' ? 'homework' : 'info') as 'info' | 'homework',
                userId: dg.studentUserId || constructor.userId,
                originalId: dg.originalId || undefined // originalId должен быть null для info, установлен для homework
              };
            });

          console.log('✅ Загружены drill-grids из БД:', loadedGrids.length);
          this.savedDrillGrids = loadedGrids;
        } else {
          console.log('ℹ️ Нет drill-grids для загрузки');
          // Fallback на localStorage
          this.loadFromLocalStorage(userId);
        }
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки drill-grids:', error);
        // Fallback на localStorage если БД недоступна
        this.loadFromLocalStorage(userId);
      }
    });
  }

  private loadFromLocalStorage(userId?: string): void {
    // Загружаем info drill-grids (общие для всех)
    const savedInfo = localStorage.getItem('savedDrillGrids_info');
    let infoGrids: DrillGrid[] = [];
    if (savedInfo) {
      try {
        infoGrids = JSON.parse(savedInfo).map((grid: any) => ({
          ...grid,
          createdAt: new Date(grid.createdAt),
          type: 'info' as const
        }));
      } catch (e) {
        console.error('Error loading saved info drill-grids:', e);
      }
    }
    
    // Загружаем homework drill-grids для текущего пользователя
    let homeworkGrids: DrillGrid[] = [];
    if (userId) {
      const savedHomework = localStorage.getItem(`savedDrillGrids_homework_${userId}`);
      if (savedHomework) {
        try {
          homeworkGrids = JSON.parse(savedHomework).map((grid: any) => ({
            ...grid,
            createdAt: new Date(grid.createdAt),
            type: 'homework' as const
          }));
        } catch (e) {
          console.error('Error loading saved homework drill-grids:', e);
        }
      }
    }
    
    this.savedDrillGrids = [...infoGrids, ...homeworkGrids];
  }
  
  saveDrillGrids(): void {
    const user = this.authService.getCurrentUser();
    const userId = user?.id?.toString();
    
    // Разделяем на info и homework
    const infoGrids = this.savedDrillGrids.filter(g => g.type === 'info');
    const homeworkGrids = userId 
      ? this.savedDrillGrids.filter(g => g.type === 'homework' && g.userId === userId)
      : [];
    
    localStorage.setItem('savedDrillGrids_info', JSON.stringify(infoGrids));
    if (userId) {
      localStorage.setItem(`savedDrillGrids_homework_${userId}`, JSON.stringify(homeworkGrids));
    }
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
        
        // Преобразуем cells в правильный формат
        const cells = Object.keys(this.drillGridCells).map(key => {
          const [rowIdx, colIdx] = key.split('_').map(Number);
          return {
            rowId: `row_${rowIdx}`,
            colId: `col_${colIdx}`,
            content: this.drillGridCells[key] || '',
            correctAnswer: undefined,
            hints: [],
            difficulty: undefined as 'easy' | 'medium' | 'hard' | undefined
          };
        });
        
        const drillGridPayload = {
          rows,
          columns,
          cells,
          settings: null,
          purpose: 'info' as const,
          originalId: null // Для новых info drill-grids originalId = null (это шаблоны)
        };

        this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, drillGridPayload, { headers }).subscribe({
          next: (drillGrid: any) => {
            console.log('✅ Drill-grid сохранен в БД:', drillGrid);
            
            // Сохраняем также в localStorage для обратной совместимости
            const newGrid: DrillGrid = {
              id: constructorId,
              name: this.drillGridName,
              rows: [...this.drillGridRows],
              columns: [...this.drillGridColumns],
              cells: { ...this.drillGridCells },
              createdAt: new Date(),
              type: 'info',
              userId: userId
            };
            
            this.savedDrillGrids.push(newGrid);
            this.saveDrillGrids();
            
            this.notificationService.success(`Drill-grid "${this.drillGridName}" sauvegardée avec succès!`);
            this.drillGridName = '';
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
    const rows = Array.isArray(grid.rows) && grid.rows.length > 0 && typeof grid.rows[0] === 'string'
      ? grid.rows.map((row: string, index: number) => ({
          id: `row_${index}`,
          label: row || `Ligne ${index + 1}`,
          examples: []
        }))
      : grid.rows;

    const columns = Array.isArray(grid.columns) && grid.columns.length > 0 && typeof grid.columns[0] === 'string'
      ? grid.columns.map((col: string, index: number) => ({
          id: `col_${index}`,
          label: col || `Colonne ${index + 1}`,
          examples: []
        }))
      : grid.columns;

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
            this.saveDrillGrids();
            
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
    const homeworkGrid: DrillGrid = {
      id: Date.now().toString(),
      name: `${templateGrid.name} (devoir)`,
      rows: [...templateGrid.rows],
      columns: [...templateGrid.columns],
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
    // Для info drill-grids только просмотр (read-only), не загружаем для редактирования
    if (grid.type === 'info') {
      alert('Cette drill-grid est en lecture seule. Utilisez "Dupliquer" pour créer une copie modifiable.');
      return;
    }
    
    this.drillGridName = grid.name;
    this.drillGridRows = [...grid.rows];
    this.drillGridColumns = [...grid.columns];
    this.drillGridCells = { ...grid.cells };
    this.numRows = grid.rows.length;
    this.numColumns = grid.columns.length;
    this.showMyDrillGrids = false;
  }
  
  deleteDrillGrid(gridId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette drill-grid?')) {
      this.savedDrillGrids = this.savedDrillGrids.filter(g => g.id !== gridId);
      this.saveDrillGrids();
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


