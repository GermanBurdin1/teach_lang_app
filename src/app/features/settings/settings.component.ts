import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  activeMainTab: string = 'settings'; // Отвечает за верхний уровень (настройки/поддержка)
  activeTab: string = 'school'; // Отвечает за вкладки "Школа"/"Онлайн-уроки"

  // Метод для переключения между вкладками "Школа" и "Онлайн-уроки"
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // Метод для переключения между основными вкладками "Настройки" и "Поддержка"
  setActiveMainTab(mainTab: string) {
    this.activeMainTab = mainTab;
  }
}
