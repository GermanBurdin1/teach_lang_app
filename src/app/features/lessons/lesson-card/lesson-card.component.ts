import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Router } from '@angular/router';
import { HomeworkService } from '../../../services/homework.service';

@Component({
  selector: 'app-lesson-card',
  templateUrl: './lesson-card.component.html',
  styleUrls: ['./lesson-card.component.css']
})
export class LessonCardComponent {
  @Input() lesson: any;
  @Output() itemDropped = new EventEmitter<{ from: number, to: number, item: string, type: 'task' | 'question' }>();
  @Output() moveToFuture = new EventEmitter<{ item: string, type: 'task' | 'question' }>();
  @Input() lessonId!: number;
  @Input() taskDropIds: string[] = [];
  @Input() questionDropIds: string[] = [];
  @Input() resolvedItems: string[] = [];


  unresolved: string[] = [];
  resolved: string[] = [];
  newTask: string = '';
  newQuestion: string = '';
  newHomeworkFromClass: string[] = [];

  constructor(private router: Router, private homeworkService: HomeworkService) {}

  enterVirtualClass(): void {
    const lessonId = this.lesson?.id;
    if (lessonId) {
      this.router.navigate([`/classroom/${lessonId}/lesson`], {
        queryParams: { startCall: true }
      });
    }
  }


  ngOnInit(): void {
    // Допустим, lesson.materials делится на все задачи/вопросы
    const items = this.lesson?.materials || ['Grammaire: Subjonctif', 'Phonétique: Liaison'];
    this.unresolved = [...items];
    this.homeworkService.getHomeworkStream().subscribe(items => {
      this.newHomeworkFromClass = items;
    });
  }

  markAsResolved(item: string): void {
    const index = this.unresolved.indexOf(item);
    if (index !== -1) {
      this.unresolved.splice(index, 1);
      this.resolved.push(item);
    }
  }

  dropItem(event: CdkDragDrop<string[]>, type: 'task' | 'question') {
    const containerId = event.container.id;
    const previousId = event.previousContainer.id;

    const targetId = this.extractLessonIdFromDropListId(containerId);
    const sourceId = this.extractLessonIdFromDropListId(previousId);

    const isSameList = containerId === previousId;

    if (isSameList) {
      if (this.lesson.status !== 'future') return;

      const list = event.container.data;
      const [moved] = list.splice(event.previousIndex, 1);
      list.splice(event.currentIndex, 0, moved);
      return;
    }

    // ✅ Только эмитим и родитель сам добавит
    this.itemDropped.emit({
      from: sourceId,
      to: targetId,
      item: event.previousContainer.data[event.previousIndex],
      type
    });
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

  private extractLessonIdFromDropListId(dropListId: string): number {
    // dropListId в формате 'tasks-1' или 'questions-6'
    const parts = dropListId.split('-');
    return +parts[1];
  }

  addItem(type: 'task' | 'question', value: string) {
  if (!value.trim()) return;
  this.lesson[type === 'task' ? 'tasks' : 'questions'].push(value.trim());
}

removeItem(type: 'task' | 'question', index: number) {
  this.lesson[type === 'task' ? 'tasks' : 'questions'].splice(index, 1);
}


}
