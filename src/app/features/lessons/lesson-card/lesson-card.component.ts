import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-lesson-card',
  templateUrl: './lesson-card.component.html',
  styleUrls: ['./lesson-card.component.css']
})
export class LessonCardComponent {
  @Input() lesson: any;

  unresolved: string[] = [];
  resolved: string[] = [];


  enterVirtualClass() {
    alert('Вход в виртуальный класс: ' + this.lesson?.id);
  }

  ngOnInit(): void {
    // Допустим, lesson.materials делится на все задачи/вопросы
    const items = this.lesson?.materials || ['Грамматика: Subjonctif', 'Фонетика: Liaison'];
    this.unresolved = [...items];
  }

  markAsResolved(item: string): void {
    const index = this.unresolved.indexOf(item);
    if (index !== -1) {
      this.unresolved.splice(index, 1);
      this.resolved.push(item);
    }
  }

  drop(event: CdkDragDrop<string[]>): void {
    if (event.previousContainer === event.container) return;
    transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
  }
}
