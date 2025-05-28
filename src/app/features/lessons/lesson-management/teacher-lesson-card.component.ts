import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';

@Component({
  selector: 'app-teacher-lesson-card',
  templateUrl: './teacher-lesson-card.component.html',
  styleUrls: ['./teacher-lesson-card.component.css']
})
export class TeacherLessonCardComponent {
  @Input() lesson: any;
  @Input() lessonId!: number;
  @Input() taskDropIds: string[] = [];
  @Output() itemDropped = new EventEmitter<{ from: number, to: number, item: string }>();
  @Output() openGabarit = new EventEmitter<void>();

  constructor(private router: Router) {}

  dropItem(event: CdkDragDrop<string[]>) {
    const fromId = this.extractLessonIdFromDropListId(event.previousContainer.id);
    const toId = this.extractLessonIdFromDropListId(event.container.id);

    const isSame = fromId === toId;
    const isFuture = this.lesson.status === 'future';

    if (isSame && isFuture) {
      const list = event.container.data;
      const [moved] = list.splice(event.previousIndex, 1);
      list.splice(event.currentIndex, 0, moved);
    } else if (!isSame && isFuture) {
      this.itemDropped.emit({
        from: fromId,
        to: toId,
        item: event.previousContainer.data[event.previousIndex]
      });

      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }
  }

  private extractLessonIdFromDropListId(dropListId: string): number {
    return +dropListId.split('-')[1];
  }

  showJoinButton(): boolean {
    const now = new Date();
    const lessonTime = new Date(this.lesson.date);
    const diffInMin = (lessonTime.getTime() - now.getTime()) / 60000;
    return this.lesson.status === 'future' && diffInMin <= 10 && diffInMin >= -60;
  }

  enterVirtualClass(): void {
    const lessonId = this.lesson?.id;
    if (lessonId) {
      this.router.navigate([`/classroom/${lessonId}/lesson`], {
        queryParams: { startCall: true }
      });
    }
  }
}
