import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tabs',
  standalone: true, // Указываем, что компонент является Standalone
  templateUrl: './tabs.component.html',
  styleUrls: ['./tabs.component.css'],
  imports: [CommonModule], // Здесь можно импортировать другие Standalone-компоненты, директивы и пайпы
})
export class TabsComponent {
  @Input() showTabs: boolean = false;
  activeTab: 'cards' | 'lesson' | 'homework' = 'cards';

  setActiveTab(tab: 'cards' | 'lesson' | 'homework') {
    this.activeTab = tab;
  }

  ngOnChanges(): void {
    console.log('showTabs значение:', this.showTabs);
  }
}
