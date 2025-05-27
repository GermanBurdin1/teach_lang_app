import { Component, Input } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-gabarit',
  templateUrl: './gabarit-component.html',
  styleUrls: ['./gabarit-component.css']
})
export class GabaritComponent {
  @Input() lesson: any;
  @Input() visible: boolean = false;
  @Input() close!: () => void;

  get texts() { return this.lesson?.texts || []; }
  get audios() { return this.lesson?.audios || []; }
  get videos() { return this.lesson?.videos || []; }

  add(type: 'text' | 'audio' | 'video') {
    const label = prompt(`Ajouter un(e) ${type} :`);
    if (!label) return;
    this.lesson[type + 's'].push(label);
  }

  onDrop(event: CdkDragDrop<string[]>, type: 'texts' | 'audios' | 'videos') {
    moveItemInArray(this.lesson[type], event.previousIndex, event.currentIndex);
  }
}
