import { Component, OnDestroy, OnInit, ViewChild, AfterViewChecked, HostListener, Output, EventEmitter, Input } from '@angular/core';
import { BackgroundService } from '../../services/background.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Router, ActivatedRoute } from '@angular/router';
import { VideoCallService } from '../../services/video-call.service';
import { LoaderComponent } from '../../shared/components/loader/loader.component';
import { AuthService } from '../../services/auth.service';
import { HomeworkService } from '../../services/homework.service';
import { LessonService } from '../../services/lesson.service';
import { MaterialService } from '../../services/material.service';
import { LessonNotesService } from '../../services/lesson-notes.service';
import { MatDialog } from '@angular/material/dialog';
import { LessonNotesModalComponent } from './lesson-notes-modal/lesson-notes-modal.component';
import { HomeworkModalComponent } from './homework-modal/homework-modal.component';

// TODO : refactoriser ce composant qui est devenu très volumineux
@Component({
  selector: 'app-lesson-material',
  templateUrl: './lesson-material.component.html',
  styleUrls: ['./lesson-material.component.css'],
})
export class LessonMaterialComponent implements OnInit, OnDestroy {
  backgroundStyle: string = '';
  private backgroundSubscription: Subscription | undefined;
  private isVideoCallStarted = false;
  showBoard = false;
  currentLesson: any = null;
  userRole: 'student' | 'teacher' = 'student';
  newStudentTask = '';
  newStudentQuestion = '';
  newTeacherTask = '';
  newTeacherQuestion = '';
  hoveredQuestion: string | null = null;
  hoveredItem: string | null = null;
  hoveredPosition: 'above' | 'below' = 'below';
  
  // données réelles du cours
  lessonTasks: any[] = [];
  lessonQuestions: any[] = [];
  lessonMaterials: any[] = [];
  isLoadingData = false;
  
  // devoirs sauvegardés
  homeworkItems: any[] = [];
  coveredInClass = new Set<string>();

  @Output() itemResolved = new EventEmitter<{ item: string, type: 'task' | 'question' }>();
  @Input() addHomeworkExternal?: (item: string) => void;

  // logique améliorée pour les boutons d'action
  private hideTimeout: any = null;
  private isHoveringActions = false;

  lessonStarted = false;
  countdown = 3000; // 3000 secondes
  private countdownInterval: any = null;

  constructor(
    private backgroundService: BackgroundService, 
    public lessonTabsService: LessonTabsService, 
    private router: Router, 
    private route: ActivatedRoute, 
    public videoService: VideoCallService,
    private authService: AuthService, 
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private materialService: MaterialService,
    private lessonNotesService: LessonNotesService,
    private dialog: MatDialog
  ) { }

  trackByIndex(index: number, item: string): number {
    return index;
  }

  ngOnInit(): void {
    console.log('[LessonMaterial] Composant chargé');
    this.authService.currentRole$.subscribe(role => {
      if (role === 'student' || role === 'teacher') {
        this.userRole = role;
        console.log('[LessonMaterial] Rôle utilisateur:', role);
      }
    });

    this.backgroundSubscription = this.backgroundService.background$.subscribe(
      (newBackground) => {
        this.backgroundStyle = newBackground;
      }
    );

    this.lessonTabsService.contentView$.subscribe((value) => {
      console.log('[LessonMaterial] ContentView observé:', value);
    });

    // INITIALISATION VIDEO TEMPORAIREMENT COMMENTÉE
    /*
    // on restaure la vidéo normale au retour en classe
    if (this.videoService.getRegularVideoActive()) {
      console.log('[LessonMaterial] Restauration vidéo normale après retour en classe');
      this.videoService.startVideoCall(); // on lance la vidéo normale
    }

    // on éteint la Floating Video au retour en classe
    this.videoService.setFloatingVideoActive(false);
    this.videoService.toggleFloatingVideo(false);

    this.route.queryParams.subscribe(params => {
      console.log('[LessonMaterial] QueryParams reçus:', params);

      if (params['startCall'] === 'true') {
        console.log('[LessonMaterial] Démarrage appel vidéo par paramètre URL');
        this.videoService.startVideoCall();
      }
    });

    this.videoService.resetVideoSize();
    */

    console.log('[LessonMaterial] ActivatedRoute snapshot:', this.route.snapshot.paramMap.keys);
    console.log('[LessonMaterial] ActivatedRoute param id:', this.route.snapshot.paramMap.get('id'));

    this.route.paramMap.subscribe(async params => {
      console.log('[LessonMaterial] paramMap contient:', params.keys);
      const lessonId = params.get('id');
      if (lessonId) {
        console.log(`[LessonMaterial] Mise à jour lessonId: ${lessonId}`);
        this.lessonTabsService.setCurrentLessonId(lessonId);
        this.loadLessonData(lessonId);
        await this.lessonNotesService.initNotesForLesson(lessonId);
      }
    });

    //this.videoService.resetVideoSize(); // TODO APPELS VIDEO TEMPORAIREMENT COMMENTÉS

    // on s'abonne aux données du cours (vraies données chargées dans loadLessonData)
    this.lessonTabsService.currentLessonData$.subscribe((lesson) => {
      if (lesson) {
        this.currentLesson = lesson;
        console.log('[LessonMaterial] Données cours reçues:', lesson);
      }
    });
  }

  async loadLessonData(lessonId: string) {
    this.isLoadingData = true;
    console.log('[LessonMaterial] Utilisation des données pour cours:', lessonId);
    
    // ON UTILISE LES DONNÉES TRANSMISES DEPUIS LESSON-MANAGEMENT VIA LessonTabsService
    console.log('[LessonMaterial] Données cours déjà transmises via LessonTabsService depuis lesson-management');
    
    // on charge les devoirs sauvegardés
    this.loadHomeworkItems(lessonId);
    
    this.isLoadingData = false;
  }

  // chargement des devoirs sauvegardés depuis localStorage
  private loadHomeworkItems(lessonId: string) {
    const savedHomework = localStorage.getItem(`homework_${lessonId}`);
    const savedCovered = localStorage.getItem(`covered_${lessonId}`);
    
    if (savedHomework) {
      this.homeworkItems = JSON.parse(savedHomework);
      console.log('[LessonMaterial] Devoirs sauvegardés chargés:', this.homeworkItems);
    }
    
    if (savedCovered) {
      this.coveredInClass = new Set(JSON.parse(savedCovered));
      console.log('[LessonMaterial] Tâches vues en classe chargées:', Array.from(this.coveredInClass));
    }
  }

  // sauvegarde des devoirs dans localStorage
  private saveHomeworkItems() {
    const lessonId = this.lessonTabsService.getCurrentLessonId();
    if (lessonId) {
      localStorage.setItem(`homework_${lessonId}`, JSON.stringify(this.homeworkItems));
      localStorage.setItem(`covered_${lessonId}`, JSON.stringify(Array.from(this.coveredInClass)));
      console.log('[LessonMaterial] Devoirs sauvegardés dans localStorage');
    }
  }

  ngOnDestroy(): void {
    if (this.backgroundSubscription) {
      console.log('[LessonMaterial] Désabonnement de backgroundSubscription');
      this.backgroundSubscription.unsubscribe();
    }

    // on nettoie le timer s'il existe
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // on ne reset pas la vidéo pour qu'elle ne disparaisse pas
    console.log(`[LessonMaterial] Avant suppression composant showVideoCall$ = ${this.videoService.showVideoCallSubject.getValue()}`);
  }

  // стилизация
  highlight: string | null = null;

  highlightCard(card: string) {
    this.highlight = card;
  }

  resetCard(card: string) {
    if (this.highlight === card) {
      this.highlight = null;
    }
  }

  //
  showLanguageModal: boolean = false; // affichage de la modale
  selectedLanguage: string = ''; // langue sélectionnée

  // ouverture du tableau interactif
  openInteractiveBoard(): void {
    console.log('[LessonMaterial] Navigation vers', `${this.lessonTabsService.getCurrentLessonId()}/board`);
    this.showBoard = true;

    // APPELS VIDEO TEMPORAIREMENT COMMENTÉS
    /*
    this.videoService.setRegularVideoActive(false);
    this.videoService.setFloatingVideoActive(true);
    this.videoService.setFloatingVideoSize(320, 180);
    */
  }

  startVideoCall(): void {
    // TEMPORAIREMENT COMMENTÉ - ON SE CONCENTRE SUR LES DONNÉES DU COURS
    /*
    if (this.videoService.showVideoCallSubject.getValue()) {
      console.log('[LessonMaterial] Vidéo déjà lancée, pas de duplication');
      return;
    }

    console.log('[LessonMaterial] Lancement appel vidéo');
    this.videoService.startVideoCall();
    */
    console.log('[LessonMaterial] Appel vidéo temporairement désactivé');
  }

  set showVideoCall(value: boolean) {
    console.log('[LessonMaterial] showVideoCall modifié:', value);
    this._showVideoCall = value;
  }

  get showVideoCall(): boolean {
    return this._showVideoCall;
  }

  private _showVideoCall = false;

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    // APPELS VIDEO TEMPORAIREMENT COMMENTÉS
    // this.videoService.onResize(event);
  }

  startDrag(event: MouseEvent): void {
    // APPELS VIDEO TEMPORAIREMENT COMMENTÉS
    // this.videoService.startResize(event);
  }

  showGabarit = false;

  toggleGabarit(): void {
    this.showGabarit = !this.showGabarit;
    if (this.showGabarit) {
      this.showBoard = false;
    }
  }

  selectView(view: 'board' | 'materials') {
    if (view === 'board') {
      this.showBoard = true;
      this.showGabarit = false;
    } else {
      this.showBoard = false;
      this.showGabarit = true;
    }
  }

  tasksCollapsed = false;

  toggleTasksCollapsed() {
    this.tasksCollapsed = !this.tasksCollapsed;
  }

  toggleBoard(): void {
    this.showBoard = !this.showBoard;
    if (this.showBoard) {
      this.showGabarit = false;
    }
  }

  resolvedItems = new Set<string>();

  toggleResolved(item: string, type: 'task' | 'question') {
    if (this.resolvedItems.has(item)) {
      this.resolvedItems.delete(item);
    } else {
      this.resolvedItems.add(item);
    }

    this.itemResolved.emit({ item, type });
  }

  isResolved(item: string): boolean {
    return this.resolvedItems.has(item);
  }

  // vérification si la tâche est ajoutée aux devoirs
  isAddedToHomework(itemId: string): boolean {
    return this.homeworkItems.some(item => item.itemId === itemId);
  }

  // vérification si la tâche a été vue en classe
  isCoveredInClass(itemId: string): boolean {
    return this.coveredInClass.has(itemId);
  }

  addStudentTask() {
    if (this.newStudentTask.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const taskData = {
        lessonId: this.currentLesson.id,
        title: this.newStudentTask.trim(),
        description: null,
        createdBy: currentUser.id,
        createdByRole: 'student' as const
      };

      this.lessonService.addTaskToLesson(taskData).subscribe({
        next: (newTask) => {
          if (!this.currentLesson.studentTasks) {
            this.currentLesson.studentTasks = [];
          }
          this.currentLesson.studentTasks.push(newTask);
          console.log('[LessonMaterial] Tâche étudiant ajoutée en BDD:', newTask);
          console.log('[LessonMaterial] studentTasks après ajout:', this.currentLesson.studentTasks);
          this.newStudentTask = '';
        },
        error: (error) => {
          console.error('[LessonMaterial] Erreur ajout tâche étudiant:', error);
        }
      });
    }
  }

  addStudentQuestion() {
    if (this.newStudentQuestion.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const questionData = {
        lessonId: this.currentLesson.id,
        question: this.newStudentQuestion.trim(),
        createdBy: currentUser.id,
        createdByRole: 'student' as const
      };

      this.lessonService.addQuestionToLesson(questionData).subscribe({
        next: (newQuestion) => {
          if (this.currentLesson) {
            // on ajoute la question au tableau local
            if (!this.currentLesson.studentQuestions) {
              this.currentLesson.studentQuestions = [];
            }
            this.currentLesson.studentQuestions.push(newQuestion);
          }
          this.newStudentQuestion = '';
          console.log('[LessonMaterial] Question étudiant ajoutée en BDD:', newQuestion);
        },
        error: (error) => {
          console.error('[LessonMaterial] Erreur ajout question étudiant:', error);
        }
      });
    }
  }

  addTeacherTask() {
    if (this.newTeacherTask.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const taskData = {
        lessonId: this.currentLesson.id,
        title: this.newTeacherTask.trim(),
        description: null,
        createdBy: currentUser.id,
        createdByRole: 'teacher' as const
      };

      this.lessonService.addTaskToLesson(taskData).subscribe({
        next: (newTask) => {
          if (this.currentLesson) {
            if (!this.currentLesson.teacherTasks) {
              this.currentLesson.teacherTasks = [];
            }
            this.currentLesson.teacherTasks.push(newTask);
          }
          this.newTeacherTask = '';
          console.log('[LessonMaterial] Tâche prof ajoutée en BDD:', newTask);
        },
        error: (error) => {
          console.error('[LessonMaterial] Erreur ajout tâche prof:', error);
        }
      });
    }
  }

  addTeacherQuestion() {
    if (this.newTeacherQuestion.trim() && this.currentLesson) {
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) return;

      const questionData = {
        lessonId: this.currentLesson.id,
        question: this.newTeacherQuestion.trim(),
        createdBy: currentUser.id,
        createdByRole: 'teacher' as const
      };

      this.lessonService.addQuestionToLesson(questionData).subscribe({
        next: (newQuestion) => {
          if (this.currentLesson) {
            if (!this.currentLesson.teacherQuestions) {
              this.currentLesson.teacherQuestions = [];
            }
            this.currentLesson.teacherQuestions.push(newQuestion);
          }
          this.newTeacherQuestion = '';
          console.log('[LessonMaterial] Question prof ajoutée en BDD:', newQuestion);
        },
        error: (error) => {
          console.error('[LessonMaterial] Erreur ajout question prof:', error);
        }
      });
    }
  }

  // nouvelles méthodes pour travailler avec les notes
  openNotes(section: 'tasks' | 'questions' | 'materials', itemId: string, itemText: string) {
    const dialogRef = this.dialog.open(LessonNotesModalComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        lessonId: this.lessonTabsService.getCurrentLessonId(),
        section,
        itemId,
        itemText,
        lessonData: {
          studentTasks: this.currentLesson?.studentTasks || [],
          teacherTasks: this.currentLesson?.teacherTasks || [],
          studentQuestions: this.currentLesson?.studentQuestions || [],
          teacherQuestions: this.currentLesson?.teacherQuestions || [],
          materials: this.currentLesson?.materials || []
        }
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('[LessonMaterial] Notes sauvegardées:', result);
      }
    });
  }

  // gestionnaires d'événements depuis gabarit-page
  onGabaritOpenNotes(event: {section: 'materials', itemId: string, itemText: string}) {
    this.openNotes(event.section, event.itemId, event.itemText);
  }

  onGabaritAddToHomework(event: {type: string, materialTitle: string, materialId: string}) {
    this.addToHomework('material', event.materialTitle, event.materialId);
  }

  // méthode pour ajouter aux devoirs
  addToHomework(type: 'task' | 'question' | 'material', title: string, itemId: string) {
    const dialogRef = this.dialog.open(HomeworkModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: {
        type,
        title,
        itemId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('[LessonMaterial] Devoir créé:', result);
        
        const currentUser = this.authService.getCurrentUser();
        const lessonId = this.lessonTabsService.getCurrentLessonId();
        
        if (!currentUser || !lessonId) {
          console.error('[LessonMaterial] Pas de données utilisateur ou cours');
          return;
        }

        // on crée le devoir via le service mis à jour
        const homeworkData = {
          lessonId: lessonId,
          title: result.title || title,
          description: result.description || '',
          dueDate: result.dueDate ? new Date(result.dueDate) : new Date(),
          assignedBy: currentUser.id,
          assignedTo: this.currentLesson?.studentId || currentUser.id,
          sourceType: type,
          sourceItemId: itemId,
          sourceItemText: title,
          materialIds: type === 'material' ? [itemId] : []
        };

        this.homeworkService.createHomeworkFromLesson(homeworkData).subscribe({
          next: (homework) => {
            console.log('[LessonMaterial] Devoir sauvegardé en BDD:', homework);
            
            // on ajoute au tableau local pour affichage immédiat
            const homeworkItem = {
              id: homework.id || Date.now().toString(),
              type,
              title: homework.title || title,
              description: homework.description || '',
              dueDate: homework.dueDate || new Date().toISOString(),
              status: homework.status || 'unfinished',
              itemId,
              createdAt: homework.assignedAt ? homework.assignedAt.toString() : new Date().toISOString(),
              lessonId: homework.lessonId || lessonId,
              createdInClass: homework.createdInClass !== undefined ? homework.createdInClass : true
            };
            
            this.homeworkItems.push(homeworkItem);
            
            // on marque comme vu en classe si c'est une tâche/question
            if (type === 'task' || type === 'question') {
              this.coveredInClass.add(itemId);
            }
            
            // on sauvegarde dans localStorage pour compatibilité
            this.saveHomeworkItems();
            
            console.log('[LessonMaterial] Devoir ajouté localement:', homeworkItem);
          },
          error: (error) => {
            console.error('[LessonMaterial] Erreur création devoir:', error);
            
            // Fallback: on sauvegarde localement si serveur indisponible
            const homeworkItem = {
              id: Date.now().toString(),
              type,
              title: result.title || title,
              description: result.description || '',
              dueDate: result.dueDate || new Date().toISOString(),
              status: 'unfinished',
              itemId,
              createdAt: new Date().toISOString(),
              lessonId: lessonId,
              createdInClass: true
            };
            
            this.homeworkItems.push(homeworkItem);
            this.coveredInClass.add(itemId);
            this.saveHomeworkItems();
          }
        });
      }
    });
  }

  // méthodes commentées pour implémentation future
  postponeQuestion(question: string): void {
    console.log('[LessonMaterial] Report question au cours suivant:', question);
    // TODO: implémenter le report de question au cours suivant
  }

  goToMindmap(item: string) {
    console.log('[LessonMaterial] Navigation vers mindmap pour:', item);
    // TODO: implémenter navigation vers mindmap
    // this.router.navigate(['/mindmap'], { queryParams: { item: item } });
  }

  goToDictionary(item: string) {
    console.log('[LessonMaterial] Navigation vers dictionnaire pour:', item);
    // TODO: implémenter navigation vers dictionnaire
    // this.router.navigate(['/vocabulary'], { queryParams: { search: item } });
  }

  postpone(item: string): void {
    console.log('[LessonMaterial] Report au cours suivant:', item);
    // TODO: implémenter report de tâche au cours suivant
  }

  onHover(item: string, event: MouseEvent) {
    // on annule tout timer de masquage existant
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
    
    this.hoveredItem = item;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    const windowHeight = window.innerHeight;
    this.hoveredPosition = rect.bottom + 200 > windowHeight ? 'above' : 'below';
  }

  onLeaveItem() {
    // délai avant masquage des boutons
    this.hideTimeout = setTimeout(() => {
      if (!this.isHoveringActions) {
        this.hoveredItem = null;
      }
    }, 300); // délai de 300ms
  }

  onEnterActions() {
    // on annule le masquage au survol des boutons
    this.isHoveringActions = true;
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  onLeaveActions() {
    // on masque les boutons en sortant
    this.isHoveringActions = false;
    this.hideTimeout = setTimeout(() => {
      this.hoveredItem = null;
    }, 100); // délai plus court en sortant des boutons
  }

  getMaterialIcon(materialType: string): string {
    switch (materialType) {
      case 'text': return '📄';
      case 'audio': return '🎧';
      case 'video': return '🎬';
      case 'pdf': return '📔';
      case 'image': return '🖼️';
      default: return '📎';
    }
  }

  getStudentMaterials(): any[] {
    if (!this.currentLesson?.materials) return [];
    return this.currentLesson.materials.filter((m: any) => m.createdBy === this.currentLesson?.studentId);
  }

  getTeacherMaterials(): any[] {
    if (!this.currentLesson?.materials) return [];
    return this.currentLesson.materials.filter((m: any) => m.createdBy === this.currentLesson?.teacherId);
  }

  newHomeworkEntry = '';

  submitHomework(): void {
    if (this.newHomeworkEntry.trim()) {
      this.currentLesson.homework.push(this.newHomeworkEntry.trim());
      this.newHomeworkEntry = '';
    }
  }

  // Обработчики событий от gabarit-page


  // Отметка домашнего задания как выполненного
  markHomeworkAsCompleted(homeworkId: string) {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('[LessonMaterial] Utilisateur non autorisé');
      return;
    }

    this.homeworkService.completeHomeworkItem(homeworkId, currentUser.id).subscribe({
      next: (completedHomework) => {
        console.log('[LessonMaterial] Devoir marqué comme terminé:', completedHomework);
        
        // on met à jour le statut local
        const homeworkIndex = this.homeworkItems.findIndex(item => item.id === homeworkId);
        if (homeworkIndex >= 0) {
          this.homeworkItems[homeworkIndex].status = 'finished';
          this.homeworkItems[homeworkIndex].isCompleted = true;
          this.homeworkItems[homeworkIndex].completedAt = new Date().toISOString();
          this.saveHomeworkItems();
        }
      },
      error: (error) => {
        console.error('[LessonMaterial] Erreur lors du marquage du devoir comme terminé:', error);
      }
    });
  }

  // Отметка задачи как выполненной
  markTaskAsCompleted(taskId: string) {
    console.log('[LessonMaterial] markTaskAsCompleted appelé avec:', taskId);
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('[LessonMaterial] Utilisateur non autorisé');
      return;
    }
    this.homeworkService.completeTask(taskId, currentUser.id).subscribe({
      next: (completedTask) => {
        console.log('✅ Задача отмечена как выполненная:', completedTask);
        
        // Обновляем локальное состояние
        this.resolvedItems.add(taskId);
        
        // Если это задача из домашнего задания, обновляем и её
        const relatedHomework = this.homeworkItems.find(item => 
          item.itemId === taskId && item.type === 'task'
        );
        if (relatedHomework) {
          relatedHomework.status = 'finished';
          relatedHomework.isCompleted = true;
          relatedHomework.completedAt = new Date().toISOString();
          this.saveHomeworkItems();
        }
      },
      error: (error) => {
        console.error('❌ Ошибка при отметке задачи как выполненной:', error);
      }
    });
  }

  // Отметка вопроса как выполненного
  markQuestionAsCompleted(questionId: string) {
    console.log('[LessonMaterial] markQuestionAsCompleted appelé avec:', questionId);
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('[LessonMaterial] Utilisateur non autorisé');
      return;
    }
    this.homeworkService.completeQuestion(questionId, currentUser.id).subscribe({
      next: (completedQuestion) => {
        console.log('✅ Вопрос отмечен как выполненный:', completedQuestion);
        this.resolvedItems.add(questionId);
      },
      error: (error) => {
        console.error('❌ Ошибка при отметке вопроса как выполненного:', error);
      }
    });
  }

  // Force recompilation - angular cache fix

  async startLesson() {
    const lessonId = this.lessonTabsService.getCurrentLessonId();
    const currentUser = this.authService.getCurrentUser();
    if (!lessonId || !currentUser) {
      console.error('Нет данных для старта урока');
      return;
    }
    try {
      await this.lessonService.startLesson(lessonId, currentUser.id).toPromise();
      // Получаем и показываем статус после старта
      const startedLesson = await this.lessonService.getLessonById(lessonId).toPromise();
      alert('Статус урока после старта: ' + (startedLesson?.status || 'неизвестно'));
      this.lessonStarted = true;
      this.countdown = 30;
      this.countdownInterval = setInterval(async () => {
        if (this.countdown > 0) {
          this.countdown--;
        } else {
          clearInterval(this.countdownInterval);
          // Завершаем урок
          try {
            await this.lessonService.endLesson(lessonId, currentUser.id).toPromise();
            // Получаем и показываем статус после завершения
            const endedLesson = await this.lessonService.getLessonById(lessonId).toPromise();
            alert('Статус урока после завершения: ' + (endedLesson?.status || 'неизвестно'));
            console.log('✅ Урок завершён (статус completed в БД)');
          } catch (err) {
            console.error('❌ Ошибка при завершении урока:', err);
          }
        }
      }, 1000);
      console.log('✅ Урок успешно начат (статус обновлен в БД)');
    } catch (error) {
      console.error('❌ Ошибка при старте урока:', error);
      alert('Ошибка при старте урока. Попробуйте еще раз.');
    }
  }
}
