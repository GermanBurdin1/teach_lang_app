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
  @Output() moveToFuture = new EventEmitter<{ item: string, type: 'task' | 'question' }>();

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
    // 🔒 Только future-занятия могут изменяться
    if (this.lesson.status !== 'future') return;

    const containerId = event.container.id;
    const previousId = event.previousContainer.id;

    // 🟢 Перемещение внутри одного списка (reordering)
    if (containerId === previousId) {
      const list = event.container.data;
      const [moved] = list.splice(event.previousIndex, 1);
      list.splice(event.currentIndex, 0, moved);
      return;
    }

    // 🚫 Запрещаем перенос между карточками
    return;
  }


  isPast(): boolean {
    return this.lesson.status === 'past';
  }

  showJoinButton(): boolean {
    const now = new Date();
    const lessonTime = new Date(this.lesson.date);
    const diffInMs = lessonTime.getTime() - now.getTime();
    const diffInMin = diffInMs / 60000;

    return this.lesson.status === 'future' && diffInMin <= 10 && diffInMin >= -60;
  }

  onPastItemClick(item: string, type: 'task' | 'question') {
  if (!this.isPast()) return;
  this.moveToFuture.emit({ item, type });
}

}
