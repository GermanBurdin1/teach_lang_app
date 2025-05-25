import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-lesson-card',
  templateUrl: './lesson-card.component.html',
  styleUrls: ['./lesson-card.component.css']
})
export class LessonCardComponent {
  @Input() lesson: any;
  @Output() itemDropped = new EventEmitter<{ from: number, to: number, item: string, type: 'task' | 'question' }>();

  unresolved: string[] = [];
  resolved: string[] = [];


  enterVirtualClass() {
    alert('Вход в виртуальный класс: ' + this.lesson?.id);
  }

  ngOnInit(): void {
    // Допустим, lesson.materials делится на все задачи/вопросы
    const items = this.lesson?.materials || ['Grammaire: Subjonctif', 'Phonétique: Liaison'];
    this.unresolved = [...items];
  }

  markAsResolved(item: string): void {
    const index = this.unresolved.indexOf(item);
    if (index !== -1) {
      this.unresolved.splice(index, 1);
      this.resolved.push(item);
    }
  }

  dropItem(event: CdkDragDrop<string[]>, type: 'task' | 'question') {
    if (event.previousContainer === event.container) return;

    const item = event.previousContainer.data[event.previousIndex];
    this.itemDropped.emit({
      from: this.lesson.id,
      to: +event.container.id.split('-')[1], // container ID format: "tasks-2"
      item,
      type
    });

    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
  }
}
