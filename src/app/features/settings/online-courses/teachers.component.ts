import { Component } from '@angular/core';

@Component({
  selector: 'app-teachers',
  templateUrl: './teachers.component.html',
  styleUrls: ['./teachers.component.css']
})
export class TeachersComponent {
  teacherSettings = [
    { label: 'Modifier le planning', tooltip: 'Option pour modifier le planning', enabled: true },
    { label: 'Créer des cours', tooltip: 'Option pour créer des cours', enabled: false },
    { label: 'Modifier le temps du cours', tooltip: 'Option pour modifier le temps du cours', enabled: true },
    { label: 'Annuler les cours', tooltip: 'Option pour annuler les cours', enabled: false },
    { label: 'Modifier les cours passés', tooltip: 'Option pour modifier les cours passés', enabled: true },
    { label: 'Accès au catalogue des matériaux', tooltip: 'Option pour accès au catalogue des matériaux', enabled: false },
  ];
}
