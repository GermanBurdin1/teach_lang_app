import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { LayoutModule } from '../../../layout/layout.module';

type ConstructorType = 'mindmap' | 'drill_grid' | 'pattern_card' | 'flowchart';

interface ConstructorTypeConfig {
  title: string;
  description: string;
  icon: string;
  steps: Array<{ title: string; description: string }>;
}

@Component({
  selector: 'app-create-mindmap',
  standalone: true,
  imports: [CommonModule, LayoutModule, MatButtonModule, MatIconModule],
  templateUrl: './create-mindmap.component.html',
  styleUrls: ['./create-mindmap.component.css']
})
export class CreateMindmapComponent implements OnInit {
  constructorType: ConstructorType = 'mindmap';
  typeConfig: ConstructorTypeConfig | null = null;

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
        { title: 'Choisir un cours', description: 'Associez la drill-grid à un parcours existant.' },
        { title: 'Nommer la drill-grid', description: 'Décrivez son objectif principal.' },
        { title: 'Configurer la matrice', description: 'Définissez les lignes, colonnes et cellules de la matrice.' }
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
      } else {
        // Если тип не указан или невалидный, перенаправляем на выбор типа
        this.router.navigate(['/constructeurs']);
      }
    });
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


