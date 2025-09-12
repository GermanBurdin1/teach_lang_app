import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HomeworkService } from '../../../services/homework.service';
import { VideoCallService } from '../../../services/video-call.service';
import { AuthService } from '../../../services/auth.service';

interface Lesson {
  id: number;
  title?: string;
  date?: string;
  status?: string;
  tasks?: unknown[];
  questions?: unknown[];
  [key: string]: unknown;
}
import { LessonService } from '../../../services/lesson.service';

@Component({
  selector: 'app-lesson-card',
  templateUrl: './lesson-card.component.html',
  styleUrls: ['./lesson-card.component.css']
})
export class LessonCardComponent implements OnInit {
  @Input() lesson: Lesson | null = null;
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
  collapsedTasks = false;
  collapsedQuestions = false;
  collapsedHomework = false;

  // Новые поля для работы с реальными данными
  realTasks: unknown[] = [];
  realQuestions: unknown[] = [];
  currentUserId: string = '';
  currentUserRole: 'student' | 'teacher' = 'student';

  // Состояние модала отмены
  showCancelModal = false;
  cancellationReason = '';
  cancellationReasons = [
    'Maladie',
    'Urgence familiale',
    'Problème de transport',
    'Autre engagement',
    'Autre'
  ];

  constructor(
    private router: Router, 
    private homeworkService: HomeworkService,
    private videoCallService: VideoCallService,
    private authService: AuthService,
    private lessonService: LessonService
  ) {}

  ngOnInit(): void {
    // Получаем текущего пользователя
    const currentUser = this.authService.getCurrentUser();
    this.currentUserId = currentUser?.id || '';
    this.currentUserRole = (currentUser?.currentRole as 'student' | 'teacher') || 'student';
    
    // Загружаем задачи и вопросы урока
    this.loadLessonData();
    
    // Допустим, lesson.materials делится на все задачи/вопросы
    const items = this.lesson?.['materials'] || ['Grammaire: Subjonctif', 'Phonétique: Liaison'];
    this.unresolved = Array.isArray(items) ? [...items] : ['Grammaire: Subjonctif', 'Phonétique: Liaison'];
    this.homeworkService.getHomeworkStream().subscribe(items => {
      this.newHomeworkFromClass = items;
    });
  }

  loadLessonData(): void {
    if (!this.lesson?.id) return;

    // Загружаем задачи урока
    this.homeworkService.getTasksForLesson(this.lesson.id.toString()).subscribe({
      next: (tasks) => {
        this.realTasks = tasks;
        console.log('📝 Задачи загружены:', tasks);
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки задач:', error);
      }
    });

    // Загружаем вопросы урока
    this.homeworkService.getQuestionsForLesson(this.lesson.id.toString()).subscribe({
      next: (questions) => {
        this.realQuestions = questions;
        console.log('❓ Вопросы загружены:', questions);
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки вопросов:', error);
      }
    });
  }

  enterVirtualClass(): void {
    const lessonId = this.lesson?.id;
    if (lessonId) {
      // Устанавливаем данные урока в VideoCallService
      this.videoCallService.setLessonData(lessonId.toString(), this.currentUserId);
      
      this.router.navigate([`/classroom/${lessonId}/lesson`], {
        queryParams: { startCall: true }
      });
    }
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
      if (this.lesson?.status !== 'future') return;

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
    return this.lesson?.status === 'past';
  }

  showJoinButton(): boolean {
    const now = new Date();
    const lessonTime = new Date(this.lesson?.date || new Date());
    const diffInMs = lessonTime.getTime() - now.getTime();
    const diffInMin = diffInMs / 60000;

    return this.lesson?.status === 'future' && diffInMin <= 10 && diffInMin >= -60;
  }

  showCancelButton(): boolean {
    const now = new Date();
    const lessonTime = new Date(this.lesson?.date || new Date());
    const diffInMs = lessonTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (60 * 60 * 1000);

    return this.lesson?.status === 'future' && this.currentUserRole === 'student' && diffInHours > -2;
  }

  canCancelWithRefund(): boolean {
    const now = new Date();
    const lessonTime = new Date(this.lesson?.date || new Date());
    const diffInMs = lessonTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (60 * 60 * 1000);

    return diffInHours >= 2;
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
    
    if (type === 'task') {
      this.addTaskToLesson(value.trim());
    } else {
      this.addQuestionToLesson(value.trim());
    }
  }

  addTaskToLesson(title: string): void {
    if (!this.lesson?.id) return;

    this.homeworkService.addTaskToLesson(
      this.lesson.id.toString(),
      title,
      null,
      this.currentUserId,
      this.currentUserRole
    ).subscribe({
      next: (task) => {
        this.realTasks.push(task);
        this.newTask = '';
        console.log('✅ Задача добавлена:', task);
      },
      error: (error) => {
        console.error('❌ Ошибка добавления задачи:', error);
      }
    });
  }

  addQuestionToLesson(question: string): void {
    if (!this.lesson?.id) return;

    this.homeworkService.addQuestionToLesson(
      this.lesson.id.toString(),
      question,
      this.currentUserId,
      this.currentUserRole
    ).subscribe({
      next: (questionData) => {
        this.realQuestions.push(questionData);
        this.newQuestion = '';
        console.log('✅ Вопрос добавлен:', questionData);
      },
      error: (error) => {
        console.error('❌ Ошибка добавления вопроса:', error);
      }
    });
  }

  removeItem(type: 'task' | 'question', index: number) {
    const key = type === 'task' ? 'tasks' : 'questions';
    if (this.lesson?.[key] && Array.isArray(this.lesson[key])) {
      (this.lesson[key] as unknown[]).splice(index, 1);
    }
  }

  openCancelModal(): void {
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.cancellationReason = '';
  }

  cancelLesson(): void {
    if (!this.cancellationReason.trim() || !this.lesson?.id) return;

    this.lessonService.cancelLesson(this.lesson.id.toString(), this.cancellationReason).subscribe({
      next: (response) => {
        console.log('✅ Урок отменен:', response);
        if (this.lesson) {
          this.lesson.status = (response as {status?: string})['status'] || this.lesson.status;
        }
        this.closeCancelModal();
        
        // Показываем сообщение пользователю
        alert((response as {message?: string})['message'] || 'Урок отменен');
      },
      error: (error) => {
        console.error('❌ Ошибка отмены урока:', error);
        alert('Ошибка при отмене урока. Попробуйте еще раз.');
      }
    });
  }

  completeTask(taskId: string): void {
    this.homeworkService.completeTask(taskId, this.currentUserId).subscribe({
      next: (task) => {
        // Обновляем задачу в локальном массиве
        const taskIndex = this.realTasks.findIndex((t: unknown) => (t as {id: string}).id === taskId);
        if (taskIndex !== -1) {
          this.realTasks[taskIndex] = task;
        }
        console.log('✅ Задача отмечена как выполненная:', task);
      },
      error: (error) => {
        console.error('❌ Ошибка при отметке задачи:', error);
      }
    });
  }

  toggleCollapse(section: 'tasks' | 'questions' | 'homework'): void {
    if (section === 'tasks') this.collapsedTasks = !this.collapsedTasks;
    else if (section === 'questions') this.collapsedQuestions = !this.collapsedQuestions;
    else if (section === 'homework') this.collapsedHomework = !this.collapsedHomework;
  }

  // Helper методы для task properties
  getTaskIsCompleted(task: unknown): boolean {
    return (task as {isCompleted?: boolean})?.isCompleted || false;
  }

  getTaskTitle(task: unknown): string {
    return (task as {title?: string})?.title || '';
  }

  getTaskDescription(task: unknown): string {
    return (task as {description?: string})?.description || '';
  }

  getTaskCreatedByRole(task: unknown): string {
    return (task as {createdByRole?: string})?.createdByRole || '';
  }

  getTaskCreatedAt(task: unknown): Date | null {
    const date = (task as {createdAt?: string | Date})?.createdAt;
    return date ? new Date(date) : null;
  }

  getTaskId(task: unknown): string {
    return (task as {id?: string})?.id || '';
  }

  // Helper методы для question properties
  getQuestionIsAnswered(question: unknown): boolean {
    return (question as {isAnswered?: boolean})?.isAnswered || false;
  }

  getQuestionText(question: unknown): string {
    return (question as {question?: string})?.question || '';
  }

  getQuestionAnswer(question: unknown): string {
    return (question as {answer?: string})?.answer || '';
  }

  getQuestionCreatedByRole(question: unknown): string {
    return (question as {createdByRole?: string})?.createdByRole || '';
  }

  getQuestionCreatedAt(question: unknown): Date | null {
    const date = (question as {createdAt?: string | Date})?.createdAt;
    return date ? new Date(date) : null;
  }

  // Helper методы для string arrays в cdkDropList
  getLessonTasksStringArray(): string[] {
    const tasks = (this.lesson as {tasks?: unknown[]})?.tasks || [];
    return tasks.map(task => String(task));
  }

  getLessonQuestionsStringArray(): string[] {
    const questions = (this.lesson as {questions?: unknown[]})?.questions || [];
    return questions.map(q => String(q));
  }

  getTaskString(task: unknown): string {
    return String(task);
  }

  getQuestionString(question: unknown): string {
    return String(question);
  }
}
