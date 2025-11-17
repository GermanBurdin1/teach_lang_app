import { Component } from '@angular/core';

@Component({
  selector: 'app-create-mindmap',
  templateUrl: './create-mindmap.component.html',
  styleUrls: ['./create-mindmap.component.css']
})
export class CreateMindmapComponent {
  steps = [
    { title: 'Choisir un cours', description: 'Associez la mindmap à un parcours existant.' },
    { title: 'Nommer la mindmap', description: 'Décrivez son objectif principal.' },
    { title: 'Structurer le plan', description: 'Ajoutez les sections clés et préparez les nœuds initiaux.' }
  ];
}


