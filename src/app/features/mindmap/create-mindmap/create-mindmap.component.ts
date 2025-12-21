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
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule, MatDialogConfig } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DrillGridModalComponent, DrillGridModalData } from '../drill-grid-modal/drill-grid-modal.component';
import { PatternCardModalComponent, PatternCardModalData, PatternCard, GrammarSection, GrammarTopic } from '../pattern-card-modal/pattern-card-modal.component';
import { PatternCardViewerComponent } from '../pattern-card-viewer/pattern-card-viewer.component';
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
  style?: {
    bgColor?: string;
    textColor?: string;
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: number;
    fontFamily?: string;
  };
}

export interface DrillGrid {
  id: string;
  name: string;
  editName?: string; // Временное поле для инлайн-редактирования названия
  rows: Array<{ id: string; label: string }> | string[]; // Поддержка старого формата
  columns: Array<{ id: string; label: string }> | string[]; // Поддержка старого формата
  cells: DrillGridCell[] | { [key: string]: string }; // Поддержка старого формата
  tableStyle?: {
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
    MatDialogModule,
    MatMenuModule,
    MatTooltipModule
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
  tableStyle: DrillGrid['tableStyle'] = this.getDefaultTableStyle();
  
  // Matrix configuration
  numRows: number = 3;
  numColumns: number = 4;

  // Pattern-card properties
  patternCardName: string = '';
  patternCard: PatternCard | null = null;
  savedPatternCards: PatternCard[] = [];
  showMyPatternCards: boolean = false;
  editingPatternCard: PatternCard | null = null;
  viewingPatternCard: PatternCard | null = null;
  
  // Grammar hierarchy
  grammarSections: GrammarSection[] = [];
  selectedSection: GrammarSection | null = null;
  expandedTopics: Set<string> = new Set();
  expandedPatternCards: Set<string> = new Set();
  patternCardsByTopic: { [topicId: string]: PatternCard[] } = {};

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

  private getDefaultTableStyle(): DrillGrid['tableStyle'] {
    return {
      fontFamily: 'Inter',
      fontSize: 14,
      bold: false,
      italic: false,
      underline: false,
      textColor: '#111827',
      headerBgColor: '#f3f4f6',
      firstColBgColor: '#f9fafb',
      cellBgColor: '#ffffff',
    };
  }

  // Методы стилизации для мини-превью
  getMiniPreviewHeaderStyle(): any {
    const style = this.tableStyle || this.getDefaultTableStyle();
    if (!style) {
      return this.getDefaultTableStyle();
    }
    // Поддержка новой структуры с header/firstCol/cells
    if ((style as any).header) {
      const headerStyle = (style as any).header;
      return {
        'background-color': headerStyle.bgColor || '#f3f4f6',
        'color': headerStyle.textColor || '#111827',
        'font-family': headerStyle.fontFamily || 'Inter',
        'font-size.px': headerStyle.fontSize || 16,
        'font-weight': headerStyle.bold ? '600' : '400',
        'font-style': headerStyle.italic ? 'italic' : 'normal',
        'text-decoration': headerStyle.underline ? 'underline' : 'none'
      };
    }
    // Старая структура
    return {
      'background-color': style.headerBgColor || '#f3f4f6',
      'color': style.textColor || '#111827',
      'font-family': style.fontFamily || 'Inter',
      'font-size.px': style.fontSize || 14,
      'font-weight': style.bold ? '600' : '400',
      'font-style': style.italic ? 'italic' : 'normal',
      'text-decoration': style.underline ? 'underline' : 'none'
    };
  }

  getMiniPreviewFirstColStyle(): any {
    const style = this.tableStyle || this.getDefaultTableStyle();
    if (!style) {
      return this.getDefaultTableStyle();
    }
    // Поддержка новой структуры с header/firstCol/cells
    if ((style as any).firstCol) {
      const firstColStyle = (style as any).firstCol;
      return {
        'background-color': firstColStyle.bgColor || '#f9fafb',
        'color': firstColStyle.textColor || '#111827',
        'font-family': firstColStyle.fontFamily || 'Inter',
        'font-size.px': firstColStyle.fontSize || 14,
        'font-weight': firstColStyle.bold ? '600' : '400',
        'font-style': firstColStyle.italic ? 'italic' : 'normal',
        'text-decoration': firstColStyle.underline ? 'underline' : 'none'
      };
    }
    // Старая структура
    return {
      'background-color': style.firstColBgColor || '#f9fafb',
      'color': style.textColor || '#111827',
      'font-family': style.fontFamily || 'Inter',
      'font-size.px': style.fontSize || 14,
      'font-weight': style.bold ? '600' : '400',
      'font-style': style.italic ? 'italic' : 'normal',
      'text-decoration': style.underline ? 'underline' : 'none'
    };
  }

  getMiniPreviewCellStyle(rowIndex: number, colIndex: number): any {
    const cell = this.drillGridCellsData.find(c => 
      c.rowId === `row_${rowIndex}` && c.colId === `col_${colIndex}`
    );
    const cellStyle = (cell as any)?.style || {};
    const style = this.tableStyle || this.getDefaultTableStyle();
    if (!style) {
      const defaultStyle = this.getDefaultTableStyle();
      if (!defaultStyle) {
        // Fallback если даже defaultStyle undefined
        return {
          'background-color': cellStyle.bgColor || '#ffffff',
          'color': cellStyle.textColor || '#111827',
          'font-family': cellStyle.fontFamily || 'Inter',
          'font-size.px': cellStyle.fontSize || 14,
          'font-weight': cellStyle.bold ? '600' : '400',
          'font-style': cellStyle.italic ? 'italic' : 'normal',
          'text-decoration': cellStyle.underline ? 'underline' : 'none'
        };
      }
      return {
        'background-color': cellStyle.bgColor || defaultStyle.cellBgColor || '#ffffff',
        'color': cellStyle.textColor || defaultStyle.textColor || '#111827',
        'font-family': cellStyle.fontFamily || defaultStyle.fontFamily || 'Inter',
        'font-size.px': cellStyle.fontSize || defaultStyle.fontSize || 14,
        'font-weight': (cellStyle.bold ?? defaultStyle.bold) ? '600' : '400',
        'font-style': (cellStyle.italic ?? defaultStyle.italic) ? 'italic' : 'normal',
        'text-decoration': (cellStyle.underline ?? defaultStyle.underline) ? 'underline' : 'none'
      };
    }
    
    // Поддержка новой структуры с header/firstCol/cells
    if ((style as any).cells) {
      const cellsStyle = (style as any).cells;
      return {
        'background-color': cellStyle.bgColor || cellsStyle.bgColor || '#ffffff',
        'color': cellStyle.textColor || cellsStyle.textColor || '#111827',
        'font-family': cellStyle.fontFamily || cellsStyle.fontFamily || 'Inter',
        'font-size.px': cellStyle.fontSize || cellsStyle.fontSize || 14,
        'font-weight': (cellStyle.bold ?? cellsStyle.bold) ? '600' : '400',
        'font-style': (cellStyle.italic ?? cellsStyle.italic) ? 'italic' : 'normal',
        'text-decoration': (cellStyle.underline ?? cellsStyle.underline) ? 'underline' : 'none'
      };
    }
    
    // Старая структура
    return {
      'background-color': cellStyle.bgColor || style.cellBgColor || '#ffffff',
      'color': cellStyle.textColor || style.textColor || '#111827',
      'font-family': cellStyle.fontFamily || style.fontFamily || 'Inter',
      'font-size.px': cellStyle.fontSize || style.fontSize || 14,
      'font-weight': (cellStyle.bold ?? style.bold) ? '600' : '400',
      'font-style': (cellStyle.italic ?? style.italic) ? 'italic' : 'normal',
      'text-decoration': (cellStyle.underline ?? style.underline) ? 'underline' : 'none'
    };
  }


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
        // Инициализация для pattern-card
        if (type === 'pattern_card') {
          this.initializePatternCard();
        }
      } else {
        // Если тип не указан или невалидный, перенаправляем на выбор типа
        this.router.navigate(['/constructeurs']);
      }
    });
    
    // Загружаем сохраненные drill-grids из localStorage
    this.loadSavedDrillGrids();
  }

  initializePatternCard(): void {
    this.patternCardName = '';
    this.patternCard = null;
    this.editingPatternCard = null;
    this.viewingPatternCard = null;
    this.loadGrammarSections();
    this.loadPatternCards();
  }

  loadGrammarSections(): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<GrammarSection[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections`, { headers }).subscribe({
      next: (sections) => {
        this.grammarSections = sections;
        if (sections.length > 0 && !this.selectedSection) {
          this.selectedSection = sections[0];
          this.loadSectionTopics(sections[0].id);
        }
      },
      error: (error) => {
        console.error('Error loading grammar sections:', error);
      }
    });
  }

  onSectionSelected(section: GrammarSection | null): void {
    if (section) {
      this.selectedSection = section;
      this.expandedTopics.clear();
      this.loadSectionTopics(section.id);
    }
  }

  loadSectionTopics(sectionId: string): void {
    const token = this.authService.getAccessToken();
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<GrammarTopic[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections/${sectionId}/topics`, { headers }).subscribe({
      next: (allTopics) => {
        if (this.selectedSection) {
          // Фильтруем только темы верхнего уровня (без parentTopicId)
          const rootTopics = allTopics.filter(t => !t.parentTopicId);
          // Организуем иерархию
          this.buildTopicHierarchy(rootTopics, allTopics);
          this.selectedSection.topics = rootTopics;
          this.organizePatternCardsByTopics();
        }
      },
      error: (error) => {
        console.error('Error loading topics:', error);
      }
    });
  }

  buildTopicHierarchy(rootTopics: GrammarTopic[], allTopics: GrammarTopic[]): void {
    rootTopics.forEach(topic => {
      topic.subtopics = allTopics.filter(t => t.parentTopicId === topic.id);
      if (topic.subtopics.length > 0) {
        this.buildTopicHierarchy(topic.subtopics, allTopics);
      }
    });
  }

  organizePatternCardsByTopics(): void {
    this.patternCardsByTopic = {};
    this.savedPatternCards.forEach(card => {
      if (card.topicId) {
        if (!this.patternCardsByTopic[card.topicId]) {
          this.patternCardsByTopic[card.topicId] = [];
        }
        this.patternCardsByTopic[card.topicId].push(card);
      }
    });
  }

  toggleTopic(topicId: string): void {
    if (this.expandedTopics.has(topicId)) {
      this.expandedTopics.delete(topicId);
      // Сворачиваем все карточки этой темы при сворачивании темы
      const cards = this.getPatternCardsForTopic(topicId);
      cards.forEach(card => {
        if (card.id) {
          this.expandedPatternCards.delete(card.id);
        }
      });
      // Рекурсивно сворачиваем карточки всех подтем
      const topic = this.findTopicById(topicId);
      if (topic && topic.subtopics) {
        this.collapseAllCardsInTopic(topic);
      }
    } else {
      this.expandedTopics.add(topicId);
      // Загружаем подтемы если их нет
      const topic = this.findTopicById(topicId);
      if (topic && (!topic.subtopics || topic.subtopics.length === 0)) {
        this.loadSubtopics(topicId);
      }
    }
  }

  collapseAllCardsInTopic(topic: GrammarTopic): void {
    // Сворачиваем карточки текущей темы
    const cards = this.getPatternCardsForTopic(topic.id);
    cards.forEach(card => {
      if (card.id) {
        this.expandedPatternCards.delete(card.id);
      }
    });
    // Рекурсивно сворачиваем карточки подтем
    if (topic.subtopics) {
      topic.subtopics.forEach(subtopic => {
        this.collapseAllCardsInTopic(subtopic);
      });
    }
  }

  findTopicById(topicId: string): GrammarTopic | null {
    if (!this.selectedSection?.topics) return null;
    return this.findTopicRecursive(this.selectedSection.topics, topicId);
  }

  findTopicRecursive(topics: GrammarTopic[], topicId: string): GrammarTopic | null {
    for (const topic of topics) {
      if (topic.id === topicId) return topic;
      if (topic.subtopics) {
        const found = this.findTopicRecursive(topic.subtopics, topicId);
        if (found) return found;
      }
    }
    return null;
  }


  loadSubtopics(topicId: string): void {
    const token = this.authService.getAccessToken();
    if (!token || !this.selectedSection) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.get<GrammarTopic[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections/${this.selectedSection.id}/topics`, { headers }).subscribe({
      next: (allTopics) => {
        const subtopics = allTopics.filter(t => t.parentTopicId === topicId);
        const topic = this.findTopicById(topicId);
        if (topic) {
          topic.subtopics = subtopics;
          // Рекурсивно строим иерархию для подтем
          this.buildTopicHierarchy(subtopics, allTopics);
        }
      },
      error: (error) => {
        console.error('Error loading subtopics:', error);
      }
    });
  }

  getPatternCardsForTopic(topicId: string): PatternCard[] {
    return this.patternCardsByTopic[topicId] || [];
  }

  getCommonVisibilityForTopic(topicId: string): 'public' | 'students' | 'private' {
    const cards = this.getPatternCardsForTopic(topicId);
    if (cards.length === 0) {
      return 'public';
    }

    // Проверяем, все ли карточки имеют одинаковую видимость
    const visibilities = cards.map(card => card.visibility || 'public');
    const uniqueVisibilities = [...new Set(visibilities)];
    
    // Если все карточки имеют одинаковую видимость, возвращаем её
    if (uniqueVisibilities.length === 1) {
      return uniqueVisibilities[0] as 'public' | 'students' | 'private';
    }
    
    // Если видимости разные, возвращаем дефолт 'public'
    return 'public';
  }

  togglePatternCard(cardId: string): void {
    if (this.expandedPatternCards.has(cardId)) {
      this.expandedPatternCards.delete(cardId);
    } else {
      this.expandedPatternCards.add(cardId);
    }
  }

  isPatternCardExpanded(cardId: string): boolean {
    return this.expandedPatternCards.has(cardId);
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
    // Инициализируем матрицу с пустыми строками и столбцами без сохранения старых данных
    this.numRows = 3;
    this.numColumns = 4;
    this.tableStyle = this.getDefaultTableStyle();
    this.createMatrix(false);
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
                tableStyle: dg.tableStyle || this.getDefaultTableStyle(),
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
  
  onMatrixSizeChange(): void {
    this.createMatrix(true);
  }

  createMatrix(preserveExisting: boolean = false): void {
    // Создаем матрицу с заданным количеством строк и столбцов
    this.drillGridRows = Array(this.numRows).fill('').map((_, i) => this.drillGridRows[i] || '');
    this.drillGridColumns = Array(this.numColumns).fill('').map((_, i) => this.drillGridColumns[i] || '');

    const prevCells = preserveExisting ? { ...this.drillGridCells } : {};
    const prevData = preserveExisting ? [...this.drillGridCellsData] : [];

    const newCells: { [key: string]: string } = {};
    const newCellsData: DrillGridCell[] = [];

    for (let rowIdx = 0; rowIdx < this.numRows; rowIdx++) {
      for (let colIdx = 0; colIdx < this.numColumns; colIdx++) {
        const key = `${rowIdx}-${colIdx}`;
        let content = '';
        let correctAnswer: string | undefined = undefined;
        let isEditable: boolean | undefined = true;

        if (preserveExisting) {
          if (prevCells[key] !== undefined) {
            content = prevCells[key];
          }
          const prevCellData = prevData.find(c => c.rowId === `row_${rowIdx}` && c.colId === `col_${colIdx}`);
          if (prevCellData) {
            correctAnswer = prevCellData.correctAnswer;
            isEditable = prevCellData.isEditable;
          }
        }

        newCells[key] = content;
        newCellsData.push({
          rowId: `row_${rowIdx}`,
          colId: `col_${colIdx}`,
          content,
          correctAnswer,
          isEditable
        });
      }
    }

    this.drillGridCells = newCells;
    this.drillGridCellsData = newCellsData;
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
          tableStyle: this.tableStyle,
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
          tableStyle: this.tableStyle,
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
                purpose: this.drillGridPurpose as 'info' | 'homework',
                tableStyle: this.tableStyle
              };
            this.savedDrillGrids[index] = updatedGrid;
            }
            
            // Обновляем editingDrillGrid с новыми данными вместо очистки
            this.editingDrillGrid = {
              ...this.editingDrillGrid!,
              name: this.drillGridName,
              rows: rows,
              columns: columns,
              cells: cells,
              purpose: this.drillGridPurpose as 'info' | 'homework',
              tableStyle: this.tableStyle,
              constructorId: constructorId
            };
            
            this.notificationService.success(`Drill-grid "${this.drillGridName}" mise à jour avec succès!`);
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
            this.tableStyle = drillGridData.tableStyle || grid.tableStyle || this.getDefaultTableStyle();
            
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
    this.tableStyle = grid.tableStyle || this.getDefaultTableStyle();
    
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
        tableStyle: this.tableStyle,
        drillGridPurpose: this.drillGridPurpose,
        editingDrillGrid: this.editingDrillGrid,
        onSave: (data: any) => {
          this.drillGridName = data.drillGridName;
          this.drillGridRows = data.drillGridRows;
          this.drillGridColumns = data.drillGridColumns;
          this.drillGridCells = data.drillGridCells;
          this.drillGridCellsData = data.drillGridCellsData;
          this.tableStyle = data.tableStyle || this.getDefaultTableStyle();
          this.drillGridPurpose = data.drillGridPurpose;
          this.saveDrillGrid();
        },
        onUpdate: (data: any) => {
          this.drillGridName = data.drillGridName;
          this.drillGridRows = data.drillGridRows;
          this.drillGridColumns = data.drillGridColumns;
          this.drillGridCells = data.drillGridCells;
          this.drillGridCellsData = data.drillGridCellsData;
          this.tableStyle = data.tableStyle || this.getDefaultTableStyle();
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

  // === PATTERN-CARD METHODS ===

  openPatternCardModal(mode: 'config' | 'preview'): void {
    const dialogConfig: MatDialogConfig = {
      width: '90vw',
      maxWidth: '1200px',
      height: '90vh',
      maxHeight: '800px',
      panelClass: 'pattern-card-modal-container',
      data: {
        mode: mode,
        patternCardName: this.patternCardName,
        patternCard: this.patternCard,
        editingPatternCard: this.editingPatternCard,
        onSave: (data: any) => {
          this.patternCardName = data.patternCardName;
          this.patternCard = data.patternCard;
          this.savePatternCard();
        },
        onUpdate: (data: any) => {
          this.patternCardName = data.patternCardName;
          this.patternCard = data.patternCard;
          this.updatePatternCard();
        }
      } as PatternCardModalData,
      disableClose: false,
      hasBackdrop: true
    };

    const dialogRef = this.dialog.open(PatternCardModalComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(() => {
      // Модалка закрыта
    });
  }

  savePatternCard(): void {
    if (this.editingPatternCard && this.editingPatternCard.id) {
      this.updatePatternCard();
      return;
    }

    if (!this.patternCardName.trim()) {
      this.notificationService.error('Veuillez nommer la pattern-card avant de la sauvegarder.');
      return;
    }

    if (!this.patternCard || !this.patternCard.pattern || !this.patternCard.example) {
      this.notificationService.error('Veuillez configurer le pattern et l\'exemple avant de sauvegarder.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const userId = user?.id?.toString();
    const token = this.authService.getAccessToken();

    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const constructorPayload = {
      title: this.patternCardName,
      type: 'pattern_card' as const,
      courseId: null,
      description: null
    };

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}`, constructorPayload, { headers }).subscribe({
      next: (constructor: any) => {
        const constructorId = constructor?.id || constructor?.data?.id;

        if (!constructorId) {
          console.error('❌ Конструктор создан, но ID отсутствует:', constructor);
          this.notificationService.error('Erreur: ID du constructeur manquant');
          return;
        }

        const patternCardPayload = {
          pattern: this.patternCard!.pattern,
          example: this.patternCard!.example,
          blanks: this.patternCard!.blanks || [],
          variations: this.patternCard!.variations || null,
          difficulty: this.patternCard!.difficulty || null,
          category: this.patternCard!.category || null,
          explanation: this.patternCard!.explanation || null,
          tags: this.patternCard!.tags || null,
          topicId: this.patternCard!.topicId || null,
          visibility: this.patternCard!.visibility || 'public'
        };

        this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/pattern-card`, patternCardPayload, { headers }).subscribe({
          next: (response: any) => {
            this.notificationService.success('Pattern-card créée avec succès!');
            this.loadPatternCards();
            this.resetPatternCardForm();
          },
          error: (error) => {
            console.error('❌ Erreur lors de la création de la pattern-card:', error);
            this.notificationService.error('Erreur lors de la création de la pattern-card');
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du constructeur:', error);
        this.notificationService.error('Erreur lors de la création du constructeur');
      }
    });
  }

  updatePatternCard(): void {
    if (!this.editingPatternCard || !this.editingPatternCard.id) {
      this.notificationService.error('Aucune pattern-card à mettre à jour.');
      return;
    }

    if (!this.patternCardName.trim()) {
      this.notificationService.error('Veuillez nommer la pattern-card.');
      return;
    }

    if (!this.patternCard || !this.patternCard.pattern || !this.patternCard.example) {
      this.notificationService.error('Veuillez configurer le pattern et l\'exemple.');
      return;
    }

    const user = this.authService.getCurrentUser();
    const token = this.authService.getAccessToken();

    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const constructorId = this.editingPatternCard.id;
    const patternCardPayload = {
      pattern: this.patternCard.pattern,
      example: this.patternCard.example,
      blanks: this.patternCard.blanks || [],
      variations: this.patternCard.variations || null,
      difficulty: this.patternCard.difficulty || null,
      category: this.patternCard.category || null,
      explanation: this.patternCard.explanation || null,
      tags: this.patternCard.tags || null,
      topicId: this.patternCard.topicId || null,
      visibility: this.patternCard.visibility || 'public'
    };

    // Обновляем сначала название конструктора, затем pattern-card
    this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, { title: this.patternCardName }, { headers }).subscribe({
      next: () => {
        // Затем обновляем pattern-card
        this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/pattern-card`, patternCardPayload, { headers }).subscribe({
          next: (response: any) => {
            this.notificationService.success('Pattern-card mise à jour avec succès!');
            this.loadPatternCards();
            if (this.editingPatternCard && this.patternCard) {
              this.editingPatternCard = {
                ...this.editingPatternCard,
                pattern: this.patternCard.pattern,
                example: this.patternCard.example,
                blanks: this.patternCard.blanks,
                variations: this.patternCard.variations,
                difficulty: this.patternCard.difficulty,
                category: this.patternCard.category,
                explanation: this.patternCard.explanation,
                tags: this.patternCard.tags
              };
            }
          },
          error: (error) => {
            console.error('❌ Erreur lors de la mise à jour de la pattern-card:', error);
            this.notificationService.error('Erreur lors de la mise à jour de la pattern-card');
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour du nom:', error);
        this.notificationService.error('Erreur lors de la mise à jour du nom');
      }
    });
  }

  loadPatternCards(): void {
    const user = this.authService.getCurrentUser();
    const userId = user?.id?.toString();
    const token = this.authService.getAccessToken();

    if (!token || !userId) {
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Сначала загружаем все темы для всех секций
    const allTopicsPromises = this.grammarSections.map(section => {
      return this.http.get<GrammarTopic[]>(`${API_ENDPOINTS.CONSTRUCTORS}/grammar/sections/${section.id}/topics`, { headers }).toPromise();
    });

    Promise.all(allTopicsPromises).then(allTopicsArrays => {
      // Объединяем все темы и строим иерархию
      allTopicsArrays.forEach((topics, index) => {
        if (topics && this.grammarSections[index]) {
          const rootTopics = topics.filter(t => !t.parentTopicId);
          this.buildTopicHierarchy(rootTopics, topics);
          this.grammarSections[index].topics = rootTopics;
        }
      });

      // Теперь загружаем pattern cards
      this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}?type=pattern_card`, { headers }).subscribe({
        next: (constructors: any[]) => {
          const patternCardPromises = constructors.map(constructor => {
            return Promise.all([
              Promise.resolve(constructor),
              this.http.get<any>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructor.id}/pattern-card`, { headers }).toPromise()
            ]);
          });

          Promise.all(patternCardPromises).then(results => {
            this.savedPatternCards = results
              .filter(([constructor, pc]) => pc !== null && pc !== undefined)
              .map(([constructor, pc]) => ({
                ...pc,
                id: constructor.id,
                pattern: pc.pattern || '',
                example: pc.example || '',
                blanks: pc.blanks || [],
                variations: pc.variations || null,
                difficulty: pc.difficulty || null,
                category: pc.category || null,
                explanation: pc.explanation || null,
                tags: pc.tags || null,
                topicId: pc.topicId || null,
                visibility: pc.visibility || 'public',
                constructorTitle: constructor.title || ''
              }));
            this.organizePatternCardsByTopics();
          });
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des pattern-cards:', error);
        }
      });
    }).catch(error => {
      console.error('Error loading topics:', error);
      // Если не удалось загрузить темы, загружаем карточки без проверки артиклей
      this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}?type=pattern_card`, { headers }).subscribe({
        next: (constructors: any[]) => {
          const patternCardPromises = constructors.map(constructor => {
            return Promise.all([
              Promise.resolve(constructor),
              this.http.get<any>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructor.id}/pattern-card`, { headers }).toPromise()
            ]);
          });

          Promise.all(patternCardPromises).then(results => {
            this.savedPatternCards = results
              .filter(([constructor, pc]) => pc !== null && pc !== undefined)
              .map(([constructor, pc]) => ({
                ...pc,
                id: constructor.id,
                pattern: pc.pattern || '',
                example: pc.example || '',
                blanks: pc.blanks || [],
                variations: pc.variations || null,
                difficulty: pc.difficulty || null,
                category: pc.category || null,
                explanation: pc.explanation || null,
                tags: pc.tags || null,
                topicId: pc.topicId || null,
                visibility: pc.visibility || 'public',
                constructorTitle: constructor.title || ''
              }));
            this.organizePatternCardsByTopics();
          });
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des pattern-cards:', error);
        }
      });
    }).catch(error => {
      console.error('Error loading topics:', error);
      // Если не удалось загрузить темы, загружаем карточки без проверки артиклей
      this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}?type=pattern_card`, { headers }).subscribe({
        next: (constructors: any[]) => {
          const patternCardPromises = constructors.map(constructor => {
            return Promise.all([
              Promise.resolve(constructor),
              this.http.get<any>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructor.id}/pattern-card`, { headers }).toPromise()
            ]);
          });

          Promise.all(patternCardPromises).then(results => {
            this.savedPatternCards = results
              .filter(([constructor, pc]) => pc !== null && pc !== undefined)
              .map(([constructor, pc]) => ({
                ...pc,
                id: constructor.id,
                pattern: pc.pattern || '',
                example: pc.example || '',
                blanks: pc.blanks || [],
                variations: pc.variations || null,
                difficulty: pc.difficulty || null,
                category: pc.category || null,
                explanation: pc.explanation || null,
                tags: pc.tags || null,
                topicId: pc.topicId || null,
                visibility: pc.visibility || 'public',
                constructorTitle: constructor.title || ''
              }));
            this.organizePatternCardsByTopics();
          });
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des pattern-cards:', error);
        }
      });
    });
  }

  loadPatternCard(patternCard: PatternCard): void {
    const constructorId = patternCard.id;
    const token = this.authService.getAccessToken();

    if (!token || !constructorId) {
      this.editingPatternCard = patternCard;
      this.patternCardName = (patternCard as any).constructorTitle || patternCard.pattern || '';
      this.patternCard = { ...patternCard };
      this.showMyPatternCards = false;
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Загружаем данные конструктора для получения названия
    this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, { headers }).subscribe({
      next: (constructorData: any) => {
        this.editingPatternCard = patternCard;
        this.patternCardName = constructorData.title || (patternCard as any).constructorTitle || patternCard.pattern || '';
        this.patternCard = { ...patternCard };
        this.showMyPatternCards = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du constructeur:', error);
        // Fallback на локальные данные
        this.editingPatternCard = patternCard;
        this.patternCardName = (patternCard as any).constructorTitle || patternCard.pattern || '';
        this.patternCard = { ...patternCard };
        this.showMyPatternCards = false;
      }
    });
  }

  viewPatternCard(patternCard: PatternCard): void {
    this.viewingPatternCard = patternCard;
  }

  testPatternCard(patternCard: PatternCard): void {
    if (!patternCard.id) {
      this.notificationService.error('ID de la pattern-card manquant');
      return;
    }

    const dialogConfig: MatDialogConfig = {
      width: '90vw',
      maxWidth: '1000px',
      height: '90vh',
      maxHeight: '800px',
      panelClass: 'pattern-card-viewer-modal',
      data: {
        patternCardId: patternCard.id,
        patternCardName: this.getPatternCardTitle(patternCard)
      },
      disableClose: false,
      hasBackdrop: true
    };

    this.dialog.open(PatternCardViewerComponent, dialogConfig);
  }

  deletePatternCard(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette pattern-card?')) {
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.delete(`${API_ENDPOINTS.CONSTRUCTORS}/${id}`, { headers }).subscribe({
      next: () => {
        this.notificationService.success('Pattern-card supprimée avec succès!');
        this.loadPatternCards();
        if (this.editingPatternCard?.id === id) {
          this.resetPatternCardForm();
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression:', error);
        this.notificationService.error('Erreur lors de la suppression');
      }
    });
  }

  updatePatternCardVisibility(card: PatternCard, visibility: 'public' | 'students' | 'private'): void {
    if (!card.id) {
      this.notificationService.error('ID de la pattern-card manquant');
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${card.id}/pattern-card`, { visibility }, { headers }).subscribe({
      next: () => {
        // Обновляем локальную копию карточки
        const cardIndex = this.savedPatternCards.findIndex(c => c.id === card.id);
        if (cardIndex !== -1) {
          this.savedPatternCards[cardIndex] = { ...this.savedPatternCards[cardIndex], visibility } as PatternCard;
          this.organizePatternCardsByTopics();
        }
        
        const visibilityText = visibility === 'public' ? 'tous les utilisateurs' : visibility === 'students' ? 'vos étudiants' : 'personne';
        this.notificationService.success(`Visibilité mise à jour: accessible à ${visibilityText}`);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour de la visibilité:', error);
        this.notificationService.error('Erreur lors de la mise à jour de la visibilité');
      }
    });
  }

  getVisibilityLabel(visibility: string): string {
    switch (visibility) {
      case 'public':
        return 'Tous les utilisateurs';
      case 'students':
        return 'Mes étudiants';
      case 'private':
        return 'Personne';
      default:
        return 'Personne';
    }
  }

  getVisibilityIcon(visibility: string): string {
    switch (visibility) {
      case 'public':
        return 'public';
      case 'students':
        return 'school';
      case 'private':
        return 'lock';
      default:
        return 'lock';
    }
  }

  updateAllCardsVisibilityForTopic(topicId: string, visibility: 'public' | 'students' | 'private'): void {
    const cards = this.getPatternCardsForTopic(topicId);
    if (cards.length === 0) {
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Обновляем все карточки последовательно
    let completed = 0;
    let errors = 0;
    const total = cards.length;

    cards.forEach(card => {
      if (card.id) {
        this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${card.id}/pattern-card`, { visibility }, { headers }).subscribe({
          next: () => {
            // Обновляем локальную копию карточки
            const cardIndex = this.savedPatternCards.findIndex(c => c.id === card.id);
            if (cardIndex !== -1) {
              this.savedPatternCards[cardIndex] = { ...this.savedPatternCards[cardIndex], visibility } as PatternCard;
            }
            completed++;
            
            // Если все карточки обновлены, обновляем организацию и показываем уведомление
            if (completed + errors === total) {
              this.organizePatternCardsByTopics();
              const visibilityText = visibility === 'public' ? 'tous les utilisateurs' : visibility === 'students' ? 'vos étudiants' : 'personne';
              if (errors === 0) {
                this.notificationService.success(`${completed} carte(s) mise(s) à jour: accessible à ${visibilityText}`);
              } else {
                this.notificationService.warning(`${completed} carte(s) mise(s) à jour, ${errors} erreur(s)`);
              }
            }
          },
          error: (error) => {
            console.error('❌ Erreur lors de la mise à jour de la visibilité:', error);
            errors++;
            if (completed + errors === total) {
              this.organizePatternCardsByTopics();
              const visibilityText = visibility === 'public' ? 'tous les utilisateurs' : visibility === 'students' ? 'vos étudiants' : 'personne';
              if (completed > 0) {
                this.notificationService.warning(`${completed} carte(s) mise(s) à jour, ${errors} erreur(s)`);
              } else {
                this.notificationService.error('Erreur lors de la mise à jour de la visibilité');
              }
            }
          }
        });
      }
    });
  }

  resetPatternCardForm(): void {
    this.patternCardName = '';
    this.patternCard = null;
    this.editingPatternCard = null;
    this.viewingPatternCard = null;
  }

  toggleMyPatternCards(): void {
    this.showMyPatternCards = !this.showMyPatternCards;
    if (this.showMyPatternCards) {
      this.loadPatternCards();
    }
  }

  getPatternCardTitle(card: PatternCard): string {
    // ВСЕГДА используем pattern вместо constructorTitle, чтобы избежать странных сокращений типа "C.", "U.", "L."
    if (card.pattern) {
      const maxLength = 80;
      const patternText = card.pattern.trim();
      return patternText.length > maxLength ? patternText.substring(0, maxLength) + '...' : patternText;
    }
    
    // Fallback на constructorTitle только если pattern отсутствует
    const constructorTitle = (card as any).constructorTitle;
    if (constructorTitle && constructorTitle.trim().length > 3) {
      return constructorTitle.trim();
    }
    
    return 'Pattern sans nom';
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


