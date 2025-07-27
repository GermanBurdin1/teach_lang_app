import { CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HomeworkService } from '../../../services/homework.service';
import { VideoCallService } from '../../../services/video-call.service';
import { AuthService } from '../../../services/auth.service';
import { LessonService } from '../../../services/lesson.service';

@Component({
  selector: 'app-lesson-card',
  templateUrl: './lesson-card.component.html',
  styleUrls: ['./lesson-card.component.css']
})
export class LessonCardComponent implements OnInit {
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
  collapsedTasks = false;
  collapsedQuestions = false;
  collapsedHomework = false;

  // Nouveaux champs pour gérer les vraies données
  realTasks: any[] = [];
  realQuestions: any[] = [];
  currentUserId: string = '';
  currentUserRole: 'student' | 'teacher' = 'student';

  // État du modal d'annulation
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
    // On récupère l'utilisateur courant
    const currentUser = this.authService.getCurrentUser();
    this.currentUserId = currentUser?.id || '';
    this.currentUserRole = (currentUser?.currentRole as 'student' | 'teacher') || 'student';
    
    // On charge les tâches et questions du cours
    this.loadLessonData();
    
    // Par exemple, lesson.materials contient toutes les tâches/questions
    const items = this.lesson?.materials || ['Grammaire: Subjonctif', 'Phonétique: Liaison'];
    this.unresolved = [...items];
    this.homeworkService.getHomeworkStream().subscribe(items => {
      this.newHomeworkFromClass = items;
    });
  }

  loadLessonData(): void {
    if (!this.lesson?.id) return;

    // Charger les tâches du cours
    this.homeworkService.getTasksForLesson(this.lesson.id).subscribe({
      next: (tasks) => {
        this.realTasks = tasks;
        console.log('Tâches chargées:', tasks);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des tâches:', error);
      }
    });

    // Charger les questions du cours
    this.homeworkService.getQuestionsForLesson(this.lesson.id).subscribe({
      next: (questions) => {
        this.realQuestions = questions;
        console.log('Questions chargées:', questions);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des questions:', error);
      }
    });
  }

  enterVirtualClass(): void {
    const lessonId = this.lesson?.id;
    if (lessonId) {
      // On définit les données du cours dans VideoCallService
      this.videoCallService.setLessonData(lessonId, this.currentUserId);
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
      if (this.lesson.status !== 'future') return;

      const list = event.container.data;
      const [moved] = list.splice(event.previousIndex, 1);
      list.splice(event.currentIndex, 0, moved);
      return;
    }

    // ✅ On émet uniquement et le parent ajoutera
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

  showCancelButton(): boolean {
    const now = new Date();
    const lessonTime = new Date(this.lesson.date);
    const diffInMs = lessonTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (60 * 60 * 1000);

    return this.lesson.status === 'future' && this.currentUserRole === 'student' && diffInHours > -2;
  }

  canCancelWithRefund(): boolean {
    const now = new Date();
    const lessonTime = new Date(this.lesson.date);
    const diffInMs = lessonTime.getTime() - now.getTime();
    const diffInHours = diffInMs / (60 * 60 * 1000);

    return diffInHours >= 2;
  }

  onPastItemClick(item: string, type: 'task' | 'question') {
    if (!this.isPast()) return;
    this.moveToFuture.emit({ item, type });
  }

  private extractLessonIdFromDropListId(dropListId: string): number {
    // dropListId au format 'tasks-1' ou 'questions-6'
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
      this.lesson.id,
      title,
      null,
      this.currentUserId,
      this.currentUserRole
    ).subscribe({
      next: (task) => {
        this.realTasks.push(task);
        this.newTask = '';
        console.log('Tâche ajoutée:', task);
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout de la tâche:', error);
      }
    });
  }

  addQuestionToLesson(question: string): void {
    if (!this.lesson?.id) return;

    this.homeworkService.addQuestionToLesson(
      this.lesson.id,
      question,
      this.currentUserId,
      this.currentUserRole
    ).subscribe({
      next: (questionData) => {
        this.realQuestions.push(questionData);
        this.newQuestion = '';
        console.log('Question ajoutée:', questionData);
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout de la question:', error);
      }
    });
  }

  removeItem(type: 'task' | 'question', index: number) {
    this.lesson[type === 'task' ? 'tasks' : 'questions'].splice(index, 1);
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

    this.lessonService.cancelLesson(this.lesson.id, this.cancellationReason).subscribe({
      next: (response) => {
        console.log('Cours annulé:', response);
        this.lesson.status = response.status;
        this.closeCancelModal();
        // On affiche un message à l'utilisateur
        alert(response.message);
      },
      error: (error) => {
        console.error('Erreur lors de l\'annulation du cours:', error);
        alert('Erreur lors de l\'annulation du cours. Veuillez réessayer.');
      }
    });
  }

  completeTask(taskId: string): void {
    this.homeworkService.completeTask(taskId, this.currentUserId).subscribe({
      next: (task) => {
        // On met à jour la tâche dans le tableau local
        const taskIndex = this.realTasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          this.realTasks[taskIndex] = task;
        }
        console.log('Tâche marquée comme terminée:', task);
      },
      error: (error) => {
        console.error('Erreur lors de la validation de la tâche:', error);
      }
    });
  }

  toggleCollapse(section: 'tasks' | 'questions' | 'homework'): void {
    if (section === 'tasks') this.collapsedTasks = !this.collapsedTasks;
    else if (section === 'questions') this.collapsedQuestions = !this.collapsedQuestions;
    else if (section === 'homework') this.collapsedHomework = !this.collapsedHomework;
  }
}
