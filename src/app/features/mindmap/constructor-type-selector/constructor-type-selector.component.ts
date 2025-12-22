import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LayoutModule } from '../../../layout/layout.module';

export type ConstructorType = 'mindmap' | 'drill_grid' | 'pattern_card' | 'flowchart';

interface ConstructorTypeInfo {
  type: ConstructorType;
  title: string;
  description: string;
  icon: string;
  color: string;
}

@Component({
  selector: 'app-constructor-type-selector',
  standalone: true,
  imports: [CommonModule, LayoutModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './constructor-type-selector.component.html',
  styleUrls: ['./constructor-type-selector.component.css']
})
export class ConstructorTypeSelectorComponent {
  constructorTypes: ConstructorTypeInfo[] = [
    {
      type: 'mindmap',
      title: 'Mindmap',
      description: 'Visualisation des liens et de la structure des connaissances',
      icon: 'account_tree',
      color: '#5c6ac4'
    },
    {
      type: 'drill_grid',
      title: 'Drill-grid',
      description: 'Cartes-matrices pour la grammaire et l\'utilisation des mots',
      icon: 'grid_on',
      color: '#10b981'
    },
    {
      type: 'pattern_card',
      title: 'Pattern-cards',
      description: 'Modèles de phrases pour l\'automatisation conversationnelle',
      icon: 'format_quote',
      color: '#f59e0b'
    },
    {
      type: 'flowchart',
      title: 'Flowchart',
      description: 'Diagrammes algorithmiques pour le choix des formes, temps, modalités',
      icon: 'device_hub',
      color: '#ef4444'
    }
  ];

  constructor(private router: Router) {}

  selectType(type: ConstructorType): void {
    if (type === 'mindmap') {
      // Для Mindmap переходим на страницу с выбором типа mindmap
      this.router.navigate(['/constructeurs', 'mindmap']);
    } else {
      // Для других типов переходим к созданию конструктора с выбранным типом
      this.router.navigate(['/constructeurs', 'create'], {
        queryParams: { type }
      });
    }
  }

  goBack(): void {
    // Можно вернуться на главную страницу приложения или оставить пустым
    this.router.navigate(['/']);
  }
}



