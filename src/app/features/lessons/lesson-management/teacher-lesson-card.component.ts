import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Router } from '@angular/router';
import { VideoCallService } from '../../../services/video-call.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-teacher-lesson-card',
  templateUrl: './teacher-lesson-card.component.html',
  styleUrls: ['./teacher-lesson-card.component.css']
})
export class TeacherLessonCardComponent {
  @Input() lesson: any;
  @Input() lessonId!: string;
  @Input() taskDropIds: string[] = [];
  @Output() itemDropped = new EventEmitter<{ from: string, to: string, item: string }>();
  @Output() openGabarit = new EventEmitter<void>();
  @Input() resolvedItems: string[] = [];
  newTask: string = '';
  collapsedTasks = false;

  constructor(
    private router: Router,
    private videoCallService: VideoCallService,
    private authService: AuthService
  ) { }

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

  addTask(): void {
    const task = this.newTask?.trim();
    if (!task) return;
    this.lesson.tasks.push(task);
    this.newTask = '';
  }

  removeTask(index: number): void {
    this.lesson.tasks.splice(index, 1);
  }


  private extractLessonIdFromDropListId(dropListId: string): string {
    return dropListId.split('-')[1];
  }

  // Проверка можно ли войти в класс (только для confirmed уроков в тот же день)
  canEnterClass(): boolean {
    // Проверяем статус - можно войти только в confirmed уроки (одобренные преподавателем)
    if (this.lesson.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const lessonTime = new Date(this.lesson.scheduledAt || this.lesson.date);
    
    // Проверяем что урок в тот же день
    const isSameDay = now.getFullYear() === lessonTime.getFullYear() &&
                      now.getMonth() === lessonTime.getMonth() &&
                      now.getDate() === lessonTime.getDate();
    
    return isSameDay;
  }

  // Для обратной совместимости (если используется в шаблоне)
  showJoinButton(): boolean {
    return this.canEnterClass();
  }

  // Вход в виртуальный класс
  enterVirtualClass(): void {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) return;

    // Устанавливаем данные урока в VideoCallService
    this.videoCallService.setLessonData(this.lesson.id, currentUserId);
    
    this.router.navigate([`/classroom/${this.lesson.id}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  toggleTasksCollapsed(): void {
    this.collapsedTasks = !this.collapsedTasks;
  }
}
