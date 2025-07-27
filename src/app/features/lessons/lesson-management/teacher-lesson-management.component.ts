import { Component, OnInit, OnDestroy } from '@angular/core';
import { HomeworkService } from '../../../services/homework.service';
import { LessonService } from '../../../services/lesson.service';
import { AuthService } from '../../../services/auth.service';
import { MaterialService } from '../../../services/material.service';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoCallService } from '../../../services/video-call.service';
import { LessonNotesService, LessonNote, LessonNotesData } from '../../../services/lesson-notes.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../../services/lesson-tabs.service';

interface Task {
  id: string;
  lessonId: string;
  title: string;
  description: string | null;
  createdBy: string;
  createdByRole: 'student' | 'teacher';
  isCompleted: boolean;
  completedAt: Date | null;
  createdAt: Date;
}

interface Question {
  id: string;
  lessonId: string;
  question: string;
  answer: string | null;
  createdBy: string;
  createdByRole: 'student' | 'teacher';
  isAnswered: boolean;
  answeredAt: Date | null;
  createdAt: Date;
}

interface Material {
  id: string;
  title: string;
  type: 'text' | 'audio' | 'video' | 'pdf' | 'image';
  content: string;
  description?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  attachedLessons: string[];
  tags: string[];
}

interface Lesson {
  id: string;
  teacherId: string;
  studentId: string;
  scheduledAt: Date;
  status: string;
  studentName?: string;
  tasks: Task[];
  questions: Question[];
  materials: Material[];
}

@Component({
  selector: 'app-teacher-lesson-management',
  templateUrl: './teacher-lesson-management.component.html',
  styleUrls: ['./teacher-lesson-management.component.css']
})
export class TeacherLessonManagementComponent implements OnInit, OnDestroy {
  // État de l'UI
  filter: string = 'future';
  selectedStudent: string | null = null;
  highlightedLessonId: string | null = null;
  activePanel: 'cours' | 'settings' | 'stats' = 'cours';
  hideTabs = true;
  searchTerm = '';
  startDate?: string;
  endDate?: string;
  pageSize = 4;
  currentPage = 1;

  // Données
  lessons: Lesson[] = [];
  currentLesson: Lesson | null = null;
  
  // Formulaires d'ajout
  showAddTaskForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  
  // Devoirs et notes
  homeworkItems: any[] = [];
  lessonNotes: any = null;
  
  // Chargement
  loading = false;
  
  // Paramètres d'URL
  highlightedLessonIdFromUrl: string | null = null;
  
  // Gestion des panneaux déroulants
  expandedTasks: Set<string> = new Set();
  expandedQuestions: Set<string> = new Set();
  expandedMaterials: Set<string> = new Set();
  
  // Pour compatibilité avec l'ancien code
  resolvedItemsPerLesson: { [key: string]: string[] } = {};
  questionDropListIds: string[] = [];
  taskDropListIds: string[] = [];
  activeLesson: any = null;

  private subscriptions: Subscription[] = [];

  constructor(
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private materialService: MaterialService,
    private route: ActivatedRoute,
    private router: Router,
    private videoCallService: VideoCallService,
    private lessonNotesService: LessonNotesService,
    private lessonTabsService: LessonTabsService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.highlightedLessonIdFromUrl = params['lessonId'] || null;
      console.log('[TeacherLessonManagement] highlightedLessonIdFromUrl from params:', this.highlightedLessonIdFromUrl);
    });

    this.route.queryParams.subscribe(params => {
      if (params['lessonId']) {
        this.highlightedLessonIdFromUrl = params['lessonId'];
        console.log('[TeacherLessonManagement] highlightedLessonIdFromUrl from query:', this.highlightedLessonIdFromUrl);
      }
    });
    
    this.loadTeacherLessons();

    // Si un cours est sélectionné dans l'URL, on le charge
    if (this.highlightedLessonIdFromUrl) {
      setTimeout(() => {
        this.loadLesson(this.highlightedLessonIdFromUrl!);
      }, 500);
    }
    
    // Abonnement aux notifications de matériaux attachés
    const materialAttachedSubscription = this.materialService.onMaterialAttached().subscribe(({ materialId, lessonId }) => {
      console.log('🔗 [Teacher] Notification de matériau attaché reçue:', { materialId, lessonId });
      
      // Si le matériau est attaché au cours actuel, on recharge les matériaux
      if (this.currentLesson && this.currentLesson.id === lessonId) {
        console.log('🔄 [Teacher] On recharge les matériaux pour le cours actuel');
        this.reloadMaterialsForCurrentLesson();
      }
      
      // On met également à jour les matériaux dans la liste des cours
      const lessonInList = this.lessons.find(l => l.id === lessonId);
      if (lessonInList) {
        console.log('🔄 [Teacher] On recharge les matériaux pour le cours dans la liste');
        this.getMaterialsForLesson(lessonId).then(materials => {
          lessonInList.materials = materials;
        });
      }
    });

    this.subscriptions.push(materialAttachedSubscription);
    
    // Abonnement aux mises à jour des devoirs
    const homeworkUpdatedSubscription = this.homeworkService.onHomeworkUpdated().subscribe(() => {
      console.log('📋 [Teacher] Notification de mise à jour des devoirs reçue');
      if (this.currentLesson) {
        this.loadHomeworkItems(this.currentLesson.id);
      }
    });
    
    this.subscriptions.push(homeworkUpdatedSubscription);
    

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  // Chargement des cours de l'enseignant
  loadTeacherLessons(): void {
    const currentUser = this.authService.getCurrentUser();
    const teacherId = currentUser?.id;
    
    console.log('[TeacherLessonManagement] loadTeacherLessons appelé avec:', { currentUser, teacherId });
    
    if (!teacherId) {
      console.error('[TeacherLessonManagement] Aucun teacherId disponible');
      return;
    }

    this.loading = true;
    this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe({
      next: async (lessons) => {
        this.lessons = lessons.map(lesson => ({
          ...lesson,
          tasks: lesson.tasks || [],
          questions: lesson.questions || [],
          materials: lesson.materials || []
        }));
        
        // On charge les tâches, questions et matériaux pour chaque cours
        for (const lesson of this.lessons) {
          try {
            const [tasks, questions, materials] = await Promise.all([
              this.lessonService.getTasksForLesson(lesson.id).toPromise(),
              this.lessonService.getQuestionsForLesson(lesson.id).toPromise(),
              this.getMaterialsForLesson(lesson.id)
            ]);
            
            lesson.tasks = tasks || [];
            lesson.questions = questions || [];
            lesson.materials = materials || [];
            
            console.log(`📊 Cours ${lesson.id}: ${lesson.tasks.length} tâches, ${lesson.questions.length} questions, ${lesson.materials.length} matériaux`);
          } catch (error) {
            console.error(`Erreur de chargement des données pour le cours ${lesson.id}:`, error);
          }
        }
        
        this.updateLessonStatuses();
        this.loading = false;
        
        console.log('✅ Tous les cours chargés avec les détails:', this.lessons);
      },
      error: (error) => {
        console.error('Erreur de chargement des cours:', error);
        this.loading = false;
      }
    });
  }

  // Chargement d'un cours spécifique avec tâches et questions
  loadLesson(lessonId: string): void {
    this.loading = true;
    
    // On essaie d'abord de trouver le cours dans la liste déjà chargée
    const lessonInList = this.lessons.find(l => l.id === lessonId);
    
    if (lessonInList) {
      // Si le cours est trouvé dans la liste, on l'utilise (il a déjà studentName)
      this.currentLesson = { ...lessonInList };
      this.highlightedLessonId = lessonId;
      
      // On charge les tâches, questions et matériaux
      this.loadTasksAndQuestions(lessonId);
      
      setTimeout(() => {
        this.highlightedLessonId = null;
      }, 5000);
    } else {
      // Si le cours n'est pas dans la liste, on le charge via l'API
      this.lessonService.getLessonDetails(lessonId).subscribe({
        next: (lesson) => {
          this.currentLesson = lesson;
          this.highlightedLessonId = lessonId;
          
                // On charge les tâches, questions, devoirs et notes
      this.loadTasksAndQuestions(lessonId);
          
          setTimeout(() => {
            this.highlightedLessonId = null;
          }, 5000);
        },
        error: (error) => {
          console.error('Erreur de chargement du cours:', error);
          this.loading = false;
        }
      });
    }
  }

  // Chargement des tâches, questions, matériaux, devoirs et notes pour un cours
  loadTasksAndQuestions(lessonId: string): void {
    Promise.all([
      this.lessonService.getTasksForLesson(lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(lessonId).toPromise(),
      this.getMaterialsForLesson(lessonId),
      this.loadHomeworkItems(lessonId),
      this.loadLessonNotes(lessonId)
    ]).then(([tasks, questions, materials, homeworkItems, lessonNotes]) => {
      if (this.currentLesson) {
        this.currentLesson.tasks = tasks || [];
        this.currentLesson.questions = questions || [];
        this.currentLesson.materials = materials || [];
      }
      this.loading = false;
    }).catch(error => {
      console.error('Erreur de chargement des tâches, questions et matériaux:', error);
      this.loading = false;
    });
  }

  // Récupération des matériaux pour un cours
  private async getMaterialsForLesson(lessonId: string): Promise<Material[]> {
    try {
      const allMaterials = await this.materialService.getMaterials().toPromise();
      return allMaterials?.filter(material => 
        material.attachedLessons && material.attachedLessons.includes(lessonId)
      ) || [];
    } catch (error) {
      console.error('Erreur de chargement des matériaux pour le cours:', error);
      return [];
    }
  }

  // Rafraîchissement des matériaux pour le cours courant
  async reloadMaterialsForCurrentLesson(): Promise<void> {
    if (!this.currentLesson) return;
    
    try {
      const materials = await this.getMaterialsForLesson(this.currentLesson.id);
      this.currentLesson.materials = materials;
      
      // On met à jour les matériaux et dans la liste des cours
      const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
      if (lessonInList) {
        lessonInList.materials = materials;
      }
      
      console.log('✅ Matériaux du cours rechargés:', materials);
    } catch (error) {
      console.error('❌ Erreur de rechargement des matériaux:', error);
    }
  }

  // Mise à jour des statuts des cours
  updateLessonStatuses(): void {
    const now = new Date();
    this.lessons.forEach(lesson => {
      const lessonDate = new Date(lesson.scheduledAt);
      
      // Si le statut est déjà défini par le service et inclut pending/cancelled/etc, on le conserve
      if (['pending', 'confirmed', 'rejected', 'cancelled_by_student', 'cancelled_by_student_no_refund', 'in_progress', 'completed'].includes(lesson.status)) {
        // On conserve l'état d'origine pour le filtre "Tous"
        return;
      }
      
      // Pour les statuts simples, on définit future/past
      lesson.status = lessonDate > now ? 'future' : 'past';
    });
  }

  // Ajout d'une tâche pour l'étudiant
  addTaskForStudent(): void {
    if (!this.newTaskTitle.trim() || !this.currentLesson) return;

    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;

    const taskData = {
      lessonId: this.currentLesson.id,
      title: this.newTaskTitle,
      description: this.newTaskDescription || null,
      createdBy: teacherId,
      createdByRole: 'teacher' as const
    };

    this.lessonService.addTaskToLesson(taskData).subscribe({
      next: (newTask) => {
        if (this.currentLesson) {
          this.currentLesson.tasks.push(newTask);
        }
        
        // ✅ IMPORTANT: On met à jour les tâches et dans la liste des cours pour les compteurs
        const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
        if (lessonInList) {
          lessonInList.tasks.push(newTask);
          console.log(`✅ Tâche ajoutée à la liste des cours. Nouveau compteur: ${lessonInList.tasks.length}`);
        }
        
        this.clearTaskForm();
        console.log('✅ Tâche ajoutée à l\'étudiant:', newTask);
      },
      error: (error) => {
        console.error('❌ Erreur d\'ajout de tâche:', error);
      }
    });
  }

  // Nettoyage du formulaire de tâche
  clearTaskForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.showAddTaskForm = false;
  }

  // Récupération des tâches de l'étudiant
  get studentTasks(): Task[] {
    return this.currentLesson?.tasks.filter(task => task.createdByRole === 'student') || [];
  }

  // Récupération des tâches de l'enseignant
  get teacherTasks(): Task[] {
    return this.currentLesson?.tasks.filter(task => task.createdByRole === 'teacher') || [];
  }

  // Getters pour compatibilité avec le template
  get filteredLessons() {
    if (this.currentLesson) {
      // Lorsqu'un cours est sélectionné via le calendrier, on l'affiche en premier, puis les autres
      const otherLessons = this.lessons.filter(lesson => 
        lesson.id !== this.currentLesson!.id && this.matchesCurrentFilter(lesson)
      );
      return [this.currentLesson, ...otherLessons];
    }
    
    // Lorsqu'on accède directement à l'onglet, on applique la pagination
    const allFiltered = this.fullFilteredLessons;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return allFiltered.slice(startIndex, endIndex);
  }

  get fullFilteredLessons() {
    console.log(`📊 Teacher: On applique le filtre "${this.filter}" à ${this.lessons.length} cours`);
    
    const result = this.lessons.filter(lesson => this.matchesCurrentFilter(lesson));
    
    console.log(`📊 Teacher: Après filtrage: ${result.length} cours`, result.map(l => ({
      id: l.id, 
      date: l.scheduledAt, 
      status: l.status,
      studentName: l.studentName
    })));

    // Si un cours est sélectionné (via le calendrier), on le place en premier
    if (this.highlightedLessonIdFromUrl) {
      const highlightedLesson = result.find(l => l.id === this.highlightedLessonIdFromUrl);
      const otherLessons = result.filter(l => l.id !== this.highlightedLessonIdFromUrl);
      
      if (highlightedLesson) {
        return [highlightedLesson, ...otherLessons];
      }
    }

    // On trie par date: les prochains en premier, les passés en dernier
    const sorted = result.sort((a, b) => {
      const dateA = new Date(a.scheduledAt);
      const dateB = new Date(b.scheduledAt);
      const now = new Date();
      
      const aIsFuture = dateA > now;
      const bIsFuture = dateB > now;
      
      if (aIsFuture && bIsFuture) {
        return dateA.getTime() - dateB.getTime(); // Les prochains: les plus proches en premier
      } else if (!aIsFuture && !bIsFuture) {
        return dateB.getTime() - dateA.getTime(); // Les passés: les derniers en premier
      } else {
        return aIsFuture ? -1 : 1; // Les prochains avant les passés
      }
    });
    
    console.log(`📊 Teacher: Après tri: ${sorted.length} cours`);
    return sorted;
  }

  private matchesCurrentFilter(lesson: Lesson): boolean {
    const now = new Date();
    const lessonDate = new Date(lesson.scheduledAt);
    
    // Filtre par temps
    if (this.filter === 'future') {
      // À venir: SEULEMENT les cours à venir par temps
      const isFutureTime = lessonDate > now;
      
      // console.log(`🔍 Teacher Filtre Future pour le cours ${lesson.id}:`, {
      //   lessonDate: lessonDate.toISOString(),
      //   now: now.toISOString(), 
      //   status: lesson.status,
      //   isFutureTime,
      //   studentName: lesson.studentName
      // });
      
      if (!isFutureTime) return false;
    } else if (this.filter === 'past') {
      // Passés: SEULEMENT les cours passés par temps
      const isPastTime = lessonDate <= now;
      
      console.log(`🕐 Teacher Filtre Past pour le cours ${lesson.id}:`, {
        lessonDate: lessonDate.toISOString(),
        now: now.toISOString(),
        status: lesson.status,
        isPastTime,
        studentName: lesson.studentName
      });
      
      if (!isPastTime) return false;
    }
    // 'all' - on affiche tous (prochains, passés, annulés, en attente de confirmation)

    // Filtre par étudiant
    if (this.selectedStudent && lesson.studentName !== this.selectedStudent) {
      return false;
    }

    // Filtre par date de début
    if (this.startDate) {
      const filterDate = new Date(this.startDate);
      if (lessonDate < filterDate) return false;
    }

    // Filtre par date de fin
    if (this.endDate) {
      const filterDate = new Date(this.endDate);
      filterDate.setHours(23, 59, 59, 999); // Fin de la journée
      if (lessonDate > filterDate) return false;
    }

    // Filtre par recherche
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      const hasMatchInTasks = lesson.tasks.some(task => 
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
      );
      const hasMatchInQuestions = lesson.questions.some(question =>
        question.question.toLowerCase().includes(searchLower)
      );
      
      if (!hasMatchInTasks && !hasMatchInQuestions) return false;
    }

    return true;
  }

  get uniqueStudents(): string[] {
    const students = this.lessons
      .map(lesson => lesson.studentName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index);
    return students as string[];
  }

  get allHomework(): string[] {
    return [];
  }

  get pastLessonsCount(): number {
    const now = new Date();
    return this.lessons.filter(l => {
      const lessonDate = new Date(l.scheduledAt);
      return lessonDate <= now || ['completed', 'past'].includes(l.status);
    }).length;
  }

  get futureLessonsCount(): number {
    const now = new Date();
    return this.lessons.filter(l => {
      const lessonDate = new Date(l.scheduledAt);
      return lessonDate > now || ['confirmed', 'pending', 'in_progress'].includes(l.status);
    }).length;
  }

  // Méthodes pour l'affichage du statut
  getStatusText(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'En attente',
      'confirmed': 'Confirmé',
      'rejected': 'Rejeté',
      'cancelled_by_student': 'Annulé par l\'étudiant',
      'cancelled_by_student_no_refund': 'Annulé (pas de remboursement)',
      'in_progress': 'En cours',
      'completed': 'Terminé',
      'future': 'À venir',
      'past': 'Passé'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'pending': 'status-pending',
      'confirmed': 'status-confirmed',
      'rejected': 'status-rejected',
      'cancelled_by_student': 'status-cancelled',
      'cancelled_by_student_no_refund': 'status-cancelled',
      'in_progress': 'status-in-progress',
      'completed': 'status-completed',
      'future': 'status-future',
      'past': 'status-past'
    };
    return classMap[status] || 'status-default';
  }

  // Méthodes-fake pour compatibilité
  recalculateStatus() {
    this.updateLessonStatuses();
    this.currentPage = 1; // Réinitialisation à la première page lors du changement de filtre
  }

  updateUniqueStudents() {
    // Implémenter si nécessaire
  }

  openGabarit(lesson: any) {
    this.activeLesson = lesson;
  }

  closeGabarit() {
    this.activeLesson = null;
  }

  get taskDropIds(): string[] {
    return [];
  }

  onItemDropped(event: any) {
    // Implémenter si nécessaire
  }

  addToHomework(item: any) {
    // Implémenter si nécessaire
  }

  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }

  // Vérification si on peut entrer dans la classe (seulement pour les cours confirmed le même jour)
  canEnterClass(lesson: Lesson): boolean {
    // On vérifie le statut - on peut entrer que dans les cours confirmed (approuvés par l'enseignant)
    if (lesson.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const lessonTime = new Date(lesson.scheduledAt);
    
    // On vérifie que le cours est le même jour
    const isSameDay = now.getFullYear() === lessonTime.getFullYear() &&
                      now.getMonth() === lessonTime.getMonth() &&
                      now.getDate() === lessonTime.getDate();
    
    return isSameDay;
  }

  // Entrée dans la classe virtuelle
  async enterVirtualClass(lesson: Lesson): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) return;

    // On charge les données actuelles
    const [tasks, questions, materials] = await Promise.all([
      this.lessonService.getTasksForLesson(lesson.id).toPromise(),
      this.lessonService.getQuestionsForLesson(lesson.id).toPromise(),
      this.getMaterialsForLesson(lesson.id)
    ]);

    const studentTasks = (tasks || []).filter((t: any) => t.createdByRole === 'student').map((t: any) => ({ id: t.id, title: t.title }));
    const teacherTasks = (tasks || []).filter((t: any) => t.createdByRole === 'teacher').map((t: any) => ({ id: t.id, title: t.title }));
    const studentQuestions = (questions || []).filter((q: any) => q.createdByRole === 'student').map((q: any) => ({ id: q.id, question: q.question }));
    const teacherQuestions = (questions || []).filter((q: any) => q.createdByRole === 'teacher').map((q: any) => ({ id: q.id, question: q.question }));

    this.lessonTabsService.setCurrentLessonData({
      id: lesson.id,
      date: lesson.scheduledAt,
      teacherTasks: teacherTasks,
      studentTasks: studentTasks,
      studentQuestions: studentQuestions,
      teacherQuestions: teacherQuestions,
      materials: materials,
      texts: materials.filter((m: any) => m.type === 'text'),
      audios: materials.filter((m: any) => m.type === 'audio'),
      videos: materials.filter((m: any) => m.type === 'video'),
      homework: []
    });

    this.videoCallService.setLessonData(lesson.id, currentUserId);

    this.router.navigate([`/classroom/${lesson.id}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  // Retour à la liste des cours
  backToLessonList(): void {
    this.currentLesson = null;
    this.highlightedLessonId = null;
    this.highlightedLessonIdFromUrl = null;
    
    // On met à jour l'URL, on retire les paramètres du cours
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
    
    // On charge la liste des cours si elle est vide
    if (this.lessons.length === 0) {
      this.loadTeacherLessons();
    }
  }

  // ==================== MÉTHODES POUR L'AFFICHAGE DE L'AUTORITÉ ====================
  
  getTaskAuthorDisplay(task: Task): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (task.createdBy === currentUserId) {
      return 'Mes tâches';
    } else {
      // Si la tâche est créée par un étudiant, on affiche le nom de l'étudiant
      return this.currentLesson?.studentName || 'Étudiant';
    }
  }

  getMaterialAuthorDisplay(material: Material): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (material.createdBy === currentUserId) {
      return 'Mes matériaux';
    } else {
      // Si le matériau est créé par un étudiant, on affiche le nom de l'étudiant
      return this.currentLesson?.studentName || 'Étudiant';
    }
  }

  getQuestionAuthorDisplay(question: Question): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (question.createdBy === currentUserId) {
      return 'Mes questions';
    } else {
      // Si la question est créée par un étudiant, on affiche le nom de l'étudiant
      return this.currentLesson?.studentName || 'Étudiant';
    }
  }

  isOwnContent(createdBy: string): boolean {
    const currentUserId = this.authService.getCurrentUser()?.id;
    return createdBy === currentUserId;
  }

  // ==================== MÉTHODES POUR LES DEVOIRS ====================
  
  loadHomeworkItems(lessonId: string): Promise<any[]> {
    console.log('📋 On commence le chargement des devoirs pour le cours:', lessonId);
    
    return this.homeworkService.getHomeworkForLesson(lessonId).toPromise().then(
      (homeworkFromDB) => {
        console.log('📋 Devoirs chargés depuis la base de données:', homeworkFromDB);
        
        if (!homeworkFromDB) {
          this.homeworkItems = [];
          return [];
        }
        
        // On transforme en format pour l'affichage
        const homeworkItems = homeworkFromDB.map(homework => ({
          id: homework.id,
          sourceType: homework.sourceType || 'task',
          title: homework.title,
          description: homework.description,
          dueDate: homework.dueDate,
          status: homework.status === 'assigned' ? 'unfinished' : homework.status,
          itemId: homework.sourceItemId,
          createdAt: homework.assignedAt,
          lessonId: homework.lessonId,
          createdInClass: homework.createdInClass,
          sourceItemText: homework.sourceItemText,
          grade: homework.grade,
          teacherFeedback: homework.teacherFeedback
        }));
        
        this.homeworkItems = homeworkItems;
        console.log('📋 Devoirs définis:', this.homeworkItems);
        return homeworkItems;
      }
    ).catch(error => {
      console.warn('⚠️ Erreur de chargement des devoirs depuis la base de données:', error);
      this.homeworkItems = [];
      return [];
    });
  }

  // ==================== MÉTHODES POUR LES NOTES ====================
  
  async loadLessonNotes(lessonId: string): Promise<any> {
    console.log('📝 On commence le chargement des notes pour le cours:', lessonId);
    
    try {
      // On initialise les notes depuis la base de données
      await this.lessonNotesService.initNotesForLesson(lessonId);
      
      // On s'abonne aux notes
      this.lessonNotesService.notes$.subscribe(notesData => {
        if (notesData && notesData.lessonId === lessonId) {
          console.log('📝 Notes du cours chargées depuis la base de données:', lessonId, notesData);
          
          // On transforme les données du LessonNotesService en format attendu pour HTML
          this.lessonNotes = {
            tasksNotes: this.extractStructuredNotes(notesData.tasks || []),
            questionsNotes: this.extractStructuredNotes(notesData.questions || []),
            materialsNotes: this.extractStructuredNotes(notesData.materials || []),
            // On conserve le format antérieur pour la compatibilité
            tasksContent: this.extractNotesContent(notesData.tasks || []),
            questionsContent: this.extractNotesContent(notesData.questions || []),
            materialsContent: this.extractNotesContent(notesData.materials || [])
          };
          
          console.log('📝 Notes converties pour l\'affichage:', this.lessonNotes);
        }
      });
      
      return this.lessonNotes;
    } catch (error) {
      console.error('❌ Erreur de chargement des notes depuis la base de données:', error);
      this.lessonNotes = null;
      console.log('📝 Notes non trouvées pour le cours:', lessonId);
      return null;
    }
  }

  // Extraction du contenu des notes et fusion
  private extractNotesContent(notes: LessonNote[]): string {
    if (!notes || notes.length === 0) {
      return '';
    }
    
    return notes.map(note => {
      if (note.content && note.content.trim()) {
        return `${note.itemText}:\n${note.content}`;
      }
      return '';
    }).filter(content => content.length > 0).join('\n\n');
  }

  // Nouvelle méthode pour notes structurées
  private extractStructuredNotes(notes: LessonNote[]): any[] {
    if (!notes || notes.length === 0) {
      return [];
    }
    
    return notes.filter(note => note.content && note.content.trim()).map(note => ({
      itemText: note.itemText,
      content: note.content.trim(),
      createdAt: note.createdAt,
      updatedAt: note.updatedAt
    }));
  }

  hasNotesForSection(section: 'tasks' | 'questions' | 'materials'): boolean {
    if (!this.lessonNotes) return false;
    
    const sectionNotes = this.lessonNotes[`${section}Notes`];
    return sectionNotes && sectionNotes.length > 0;
  }

  // Méthodes supplémentaires pour vérifier les notes
  hasLessonNotes(lessonId: string): boolean {
    // On vérifie les notes actuelles du service
    const currentNotes = this.lessonNotesService.exportNotes();
    if (currentNotes && currentNotes.lessonId === lessonId) {
      // On vérifie s'il y a au moins une note avec du contenu
      const hasTasks = currentNotes.tasks && currentNotes.tasks.some(note => note.content && note.content.trim());
      const hasQuestions = currentNotes.questions && currentNotes.questions.some(note => note.content && note.content.trim());
      const hasMaterials = currentNotes.materials && currentNotes.materials.some(note => note.content && note.content.trim());
      
      return hasTasks || hasQuestions || hasMaterials;
    }
    
    // Fallback à localStorage pour la compatibilité
    const savedNotes = localStorage.getItem(`lesson_notes_${lessonId}`);
    if (!savedNotes) return false;
    
    try {
      const notesData: LessonNotesData = JSON.parse(savedNotes);
      
      // On vérifie s'il y a au moins une note avec du contenu
      const hasTasks = notesData.tasks && notesData.tasks.some(note => note.content && note.content.trim());
      const hasQuestions = notesData.questions && notesData.questions.some(note => note.content && note.content.trim());
      const hasMaterials = notesData.materials && notesData.materials.some(note => note.content && note.content.trim());
      
      return hasTasks || hasQuestions || hasMaterials;
    } catch (error) {
      console.error('Erreur lors de la vérification des notes:', error);
      return false;
    }
  }

  // ==================== MÉTHODES POUR LE STATUT DE TRAITEMENT ====================
  
  // Vérification si l'élément est traité (a des notes)
  isItemProcessed(section: 'tasks' | 'questions' | 'materials', itemIdentifier: string): boolean {
    // Pour les tâches et les questions, on utilise le contenu comme identifiant (compatibilité avec lesson-material)
    // Pour les matériaux, on utilise l'ID
    let itemId: string;
    if (section === 'tasks') {
      // On cherche la tâche par contenu (titre)
      const task = this.currentLesson?.tasks.find(t => t.title === itemIdentifier);
      itemId = task ? task.title : itemIdentifier; // On utilise le titre comme itemId pour la compatibilité
    } else if (section === 'questions') {
      // On cherche la question par contenu
      const question = this.currentLesson?.questions.find(q => q.question === itemIdentifier);
      itemId = question ? question.question : itemIdentifier; // On utilise la question comme itemId pour la compatibilité
    } else {
      itemId = itemIdentifier; // Pour les matériaux, on utilise l'ID
    }
    
    const note = this.lessonNotesService.getNoteForItem(section, itemId);
    return note !== undefined && note.content.trim().length > 0;
  }

  // Récupération de la note pour un élément
  getNoteForItem(section: 'tasks' | 'questions' | 'materials', itemIdentifier: string): any {
    // Identique à isItemProcessed
    let itemId: string;
    if (section === 'tasks') {
      const task = this.currentLesson?.tasks.find(t => t.title === itemIdentifier);
      itemId = task ? task.title : itemIdentifier;
    } else if (section === 'questions') {
      const question = this.currentLesson?.questions.find(q => q.question === itemIdentifier);
      itemId = question ? question.question : itemIdentifier;
    } else {
      itemId = itemIdentifier;
    }
    
    return this.lessonNotesService.getNoteForItem(section, itemId);
  }

  // Récupération du texte du statut de traitement
  getProcessingStatusText(section: 'tasks' | 'questions' | 'materials', itemId: string): string {
    return this.isItemProcessed(section, itemId) ? 'Travaillé' : 'Non travaillé';
  }

  // Récupération de la classe CSS du statut de traitement
  getProcessingStatusClass(section: 'tasks' | 'questions' | 'materials', itemId: string): string {
    return this.isItemProcessed(section, itemId) ? 'status-processed' : 'status-unprocessed';
  }

  // ==================== Gestion des panneaux déroulants ====================
  
  // Toggle état du panneau des tâches
  toggleTaskExpansion(taskId: string): void {
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
  }

  // Toggle état du panneau des questions
  toggleQuestionExpansion(questionId: string): void {
    if (this.expandedQuestions.has(questionId)) {
      this.expandedQuestions.delete(questionId);
    } else {
      this.expandedQuestions.add(questionId);
    }
  }

  // Toggle état du panneau des matériaux
  toggleMaterialExpansion(materialId: string): void {
    if (this.expandedMaterials.has(materialId)) {
      this.expandedMaterials.delete(materialId);
    } else {
      this.expandedMaterials.add(materialId);
    }
  }

  // Vérifie si le panneau des tâches est ouvert
  isTaskExpanded(taskId: string): boolean {
    return this.expandedTasks.has(taskId);
  }

  // Vérifie si le panneau des questions est ouvert
  isQuestionExpanded(questionId: string): boolean {
    return this.expandedQuestions.has(questionId);
  }

  // Vérifie si le panneau des matériaux est ouvert
  isMaterialExpanded(materialId: string): boolean {
    return this.expandedMaterials.has(materialId);
  }
}
