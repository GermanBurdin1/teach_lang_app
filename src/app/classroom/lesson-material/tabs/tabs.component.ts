import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LessonTabsService } from '../../../services/lesson-tabs.service';

@Component({
  selector: 'app-tabs',
  standalone: true,
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.css'],
  imports: [CommonModule],
})
export class TabsComponent implements OnInit {
  @Input() showTabs: boolean = false;

  constructor(public lessonTabsService: LessonTabsService) {}

  ngOnInit(): void {
    // Для отладки, чтобы видеть изменения активной вкладки
    this.lessonTabsService.activeTab$.subscribe((tab) => {
      console.log('Active tab changed to:', tab);
    });
  }

  setActiveTab(tab: 'cards' | 'lesson' | 'homework'): void {
    this.lessonTabsService.setActiveTab(tab);
  }
}

