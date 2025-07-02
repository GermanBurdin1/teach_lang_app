import { Component } from '@angular/core';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  activeMainTab: string = 'settings'; // Gère le niveau supérieur (paramètres/support)
  activeTab: string = 'school'; // Gère les onglets "École"/"Cours en ligne"

  // Méthode pour basculer entre les onglets "École" et "Cours en ligne"
  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  // Méthode pour basculer entre les onglets principaux "Paramètres" et "Support"
  setActiveMainTab(mainTab: string) {
    this.activeMainTab = mainTab;
  }
}
