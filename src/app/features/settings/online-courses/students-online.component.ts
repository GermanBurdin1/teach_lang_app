import { Component } from '@angular/core';

@Component({
  selector: 'app-students-online',
  templateUrl: './students-online.component.html',
  styleUrls: ['./students-online.component.css']
})
export class StudentsOnlineComponent {
  npsFrequency: string = 'never';

  studentSettings = [
    { label: 'Désactivation automatique des étudiants', tooltip: 'Configuration pour la désactivation automatique', enabled: false },
    { label: 'Activation automatique des étudiants', tooltip: 'Configuration pour l\'activation automatique', enabled: false },
    { label: 'Statistiques dans les résultats du cours', tooltip: 'Afficher les statistiques dans les résultats du cours', enabled: true },
    { label: 'Classement des cours dans les résultats du cours', tooltip: 'Afficher le classement des cours dans les résultats du cours', enabled: true }
  ];
}
