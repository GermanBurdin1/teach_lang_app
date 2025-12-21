import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface GrammarCategory {
  id: string;
  title: string;
  icon: string;
  children?: GrammarCategory[];
}

@Component({
  selector: 'app-training',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent implements OnInit {
  activeTrainingTab = 'audio';
  expandedCategories: Set<string> = new Set();

  grammarStructure: GrammarCategory[] = [
    {
      id: 'morphology',
      title: 'Morphologie',
      icon: 'text_fields',
      children: [
        {
          id: 'parts-of-speech',
          title: 'Parties du discours',
          icon: 'menu_book',
          children: [
            {
              id: 'autonomous',
              title: 'Autonomes',
              icon: 'star',
              children: [
                { id: 'noun', title: 'Nom (substantif)', icon: 'label' },
                { id: 'adjective', title: 'Adjectif', icon: 'description' },
                { id: 'verb', title: 'Verbe', icon: 'flash_on' },
                { id: 'adverb', title: 'Adverbe', icon: 'trending_up' },
                { id: 'pronoun', title: 'Pronom', icon: 'person' },
                { id: 'numeral', title: 'Numéral', icon: 'looks_one' }
              ]
            },
            {
              id: 'auxiliary',
              title: 'Auxiliaires',
              icon: 'support',
              children: [
                { id: 'preposition', title: 'Préposition', icon: 'arrow_forward' },
                { id: 'conjunction', title: 'Conjonction', icon: 'link' },
                { id: 'particle', title: 'Particule', icon: 'adjust' },
                { id: 'interjection', title: 'Interjection', icon: 'mood' }
              ]
            }
          ]
        }
      ]
    },
    {
      id: 'syntax',
      title: 'Syntaxe',
      icon: 'code',
      children: []
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  setActiveTrainingTab(tab: string): void {
    this.activeTrainingTab = tab;
  }

  toggleCategory(categoryId: string): void {
    if (this.expandedCategories.has(categoryId)) {
      this.expandedCategories.delete(categoryId);
    } else {
      this.expandedCategories.add(categoryId);
    }
  }

  isExpanded(categoryId: string): boolean {
    return this.expandedCategories.has(categoryId);
  }
}

