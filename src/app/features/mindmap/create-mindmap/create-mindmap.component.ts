import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { LayoutModule } from '../../../layout/layout.module';

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
    MatFormFieldModule
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
    private location: Location
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
  
  saveDrillGrids(): void {
    localStorage.setItem('savedDrillGrids', JSON.stringify(this.savedDrillGrids));
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
      alert('Veuillez nommer la drill-grid avant de la sauvegarder.');
      return;
    }
    
    const newGrid: DrillGrid = {
      id: Date.now().toString(),
      name: this.drillGridName,
      rows: [...this.drillGridRows],
      columns: [...this.drillGridColumns],
      cells: { ...this.drillGridCells },
      createdAt: new Date()
    };
    
    this.savedDrillGrids.push(newGrid);
    this.saveDrillGrids();
    
    alert(`Drill-grid "${this.drillGridName}" sauvegardée avec succès!`);
    this.drillGridName = '';
  }
  
  toggleMyDrillGrids(): void {
    this.showMyDrillGrids = !this.showMyDrillGrids;
  }
  
  loadDrillGrid(grid: DrillGrid): void {
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


