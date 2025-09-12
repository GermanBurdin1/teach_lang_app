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
  @Input() lesson: unknown;
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
    const isFuture = (this.lesson as {status?: string})?.status === 'future';

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
    const lessonWithTasks = this.lesson as {tasks?: string[]};
    if (lessonWithTasks?.tasks) {
      lessonWithTasks.tasks.push(task);
    }
    this.newTask = '';
  }

  removeTask(index: number): void {
    const lessonWithTasks = this.lesson as {tasks?: string[]};
    if (lessonWithTasks?.tasks) {
      lessonWithTasks.tasks.splice(index, 1);
    }
  }


  private extractLessonIdFromDropListId(dropListId: string): string {
    return dropListId.split('-')[1];
  }

  // Проверка можно ли войти в класс (только для confirmed уроков в тот же день)
  canEnterClass(): boolean {
    // Проверяем статус - можно войти только в confirmed уроки (одобренные преподавателем)
    if ((this.lesson as {status?: string})?.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const lessonWithTime = this.lesson as {scheduledAt?: string | Date, date?: string | Date};
    const lessonTime = new Date(lessonWithTime?.scheduledAt || lessonWithTime?.date || new Date());
    
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
    this.videoCallService.setLessonData(String((this.lesson as {id: unknown}).id), currentUserId);
    
    this.router.navigate([`/classroom/${(this.lesson as {id: unknown}).id}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  toggleTasksCollapsed(): void {
    this.collapsedTasks = !this.collapsedTasks;
  }

  // Helper методы для шаблона (без as any)
  getLessonTeacher(): string {
    const teacher = (this.lesson as {teacher?: string})?.teacher;
    const studentName = (this.lesson as {studentName?: string})?.studentName;
    return teacher || studentName || 'Étudiant';
  }

  getLessonFormattedDate(): string {
    const date = (this.lesson as {date?: string | Date})?.date;
    const scheduledAt = (this.lesson as {scheduledAt?: string | Date})?.scheduledAt;
    const targetDate = date || scheduledAt;
    
    if (!targetDate) return '';
    
    try {
      return new Date(targetDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  getLessonTasksCount(): number {
    const tasks = (this.lesson as {tasks?: unknown[]})?.tasks;
    return tasks?.length || 0;
  }

  getLessonQuestionsCount(): number {
    const questions = (this.lesson as {questions?: unknown[]})?.questions;
    return questions?.length || 0;
  }

  getLessonMaterialsCount(): number {
    const materials = (this.lesson as {materials?: unknown[]})?.materials;
    return materials?.length || 0;
  }

  getTasksDropListId(): string {
    const id = (this.lesson as {id?: string})?.id;
    return `tasks-${id || ''}`;
  }

  getLessonTasks(): string[] {
    const tasks = (this.lesson as {tasks?: unknown[]})?.tasks || [];
    return tasks.map(task => String(task));
  }

  isLessonPast(): boolean {
    const status = (this.lesson as {status?: string})?.status;
    return status === 'past';
  }
}
