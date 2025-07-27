import { Component, OnInit, OnDestroy } from '@angular/core';
import { HomeworkService } from '../../../services/homework.service';
import { LessonService } from '../../../services/lesson.service';
import { AuthService } from '../../../services/auth.service';
import { MaterialService } from '../../../services/material.service';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute, Router } from '@angular/router';
import { VideoCallService } from '../../../services/video-call.service';
import { Subscription } from 'rxjs';
import { LessonTabsService } from '../../../services/lesson-tabs.service';
import { LessonNotesService, LessonNote, LessonNotesData } from '../../../services/lesson-notes.service';

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
  teacherName?: string;
  tasks: Task[];
  questions: Question[];
  materials: Material[];
}

@Component({
  selector: 'app-lesson-management',
  templateUrl: './lesson-management.component.html',
  styleUrls: ['./lesson-management.component.css']
})
export class LessonManagementComponent implements OnInit, OnDestroy {
  // état de l'UI
  filter: string = 'future';
  selectedTeacher: string | null = null;
  highlightedLessonId: string | null = null;
  activePanel: 'cours' | 'settings' | 'stats' = 'cours';
  hideTabs = true;
  searchTerm = '';
  startDate?: string;
  endDate?: string;
  pageSize = 4;
  currentPage = 1;
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 10;

  // Données
  lessons: Lesson[] = [];
  currentLesson: Lesson | null = null;
  
  // Devoirs et notes de cours
  homeworkItems: any[] = [];
  lessonNotes: any = null;
  
  // Formulaires d'ajout
  showAddTaskForm = false;
  showAddQuestionForm = false;
  newTaskTitle = '';
  newTaskDescription = '';
  newQuestionText = '';
  
  // Chargement
  loading = false;
  
  // Paramètres d'URL
  highlightedLessonIdFromUrl: string | null = null;

  // Gestion des panneaux déroulants
  expandedTasks: Set<string> = new Set();
  expandedQuestions: Set<string> = new Set();
  expandedMaterials: Set<string> = new Set();

  private subscriptions: Subscription[] = [];

  constructor(
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private materialService: MaterialService,
    private route: ActivatedRoute,
    private router: Router,
    private videoCallService: VideoCallService,
    private lessonTabsService: LessonTabsService,
    private lessonNotesService: LessonNotesService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.highlightedLessonIdFromUrl = params['lessonId'] || null;
      console.log('📋 LessonManagement: Получен lessonId из URL:', this.highlightedLessonIdFromUrl);
    });

    this.route.queryParams.subscribe(params => {
      // Si il y a un lessonId dans les query params, on l'utilise
      if (params['lessonId']) {
        this.highlightedLessonIdFromUrl = params['lessonId'];
        console.log('📋 LessonManagement: Получен lessonId из query params:', this.highlightedLessonIdFromUrl);
      }
    });

    this.loadStudentLessons();

    // Si une leçon est sélectionnée (via le calendrier), on la charge
    if (this.highlightedLessonIdFromUrl) {
      setTimeout(() => {
        this.loadLesson(this.highlightedLessonIdFromUrl!);
      }, 500);
    }
    
    // Souscription aux notifications de matériaux attachés
    const materialAttachedSubscription = this.materialService.onMaterialAttached().subscribe(({ materialId, lessonId }) => {
      console.log('🔗 Получено уведомление о прикреплении материала:', { materialId, lessonId });
      
      // Si le matériau est attaché à la leçon actuelle, on recharge les matériaux
      if (this.currentLesson && this.currentLesson.id === lessonId) {
        console.log('🔄 On recharge les matériaux pour la leçon actuelle');
        this.reloadMaterialsForCurrentLesson();
      }
      
      // On met aussi à jour les matériaux dans la liste des leçons
      const lessonInList = this.lessons.find(l => l.id === lessonId);
      if (lessonInList) {
        console.log('🔄 On recharge les matériaux pour la leçon dans la liste');
        this.getMaterialsForLesson(lessonId).then(materials => {
          lessonInList.materials = materials;
        });
      }
    });

    this.subscriptions.push(materialAttachedSubscription);
    
    // Souscription aux mises à jour des devoirs
    const homeworkUpdatedSubscription = this.homeworkService.onHomeworkUpdated().subscribe(() => {
      console.log('📋 Получено уведомление об обновлении домашних заданий');
      if (this.currentLesson) {
        this.loadHomeworkItems(this.currentLesson.id);
      }
    });
    
    this.subscriptions.push(homeworkUpdatedSubscription);
    

  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
  }

  // Chargement des leçons de l'étudiant
  loadStudentLessons(): void {
    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    this.loading = true;
    this.lessonService.getStudentSentRequests(studentId).subscribe({
      next: (requests) => {
        console.log('📚 Les demandes de l\'étudiant ont été chargées:', requests);
        
        // On transforme les demandes en format leçon
        this.lessons = requests.map(request => ({
          id: request.lessonId || request.id,
          teacherId: request.teacherId,
          studentId: studentId,
          scheduledAt: new Date(request.scheduledAt),
          status: request.status,
          teacherName: request.teacherName,
          tasks: [],
          questions: [],
          materials: []
        }));
        
        this.updateLessonStatuses();
        
        // On charge les tâches et questions pour toutes les leçons
        this.loadTasksAndQuestionsForAllLessons();
        
        console.log('📚 Les leçons ont été traitées:', this.lessons);
      },
      error: (error) => {
        console.error('Ошибка chargement des leçons:', error);
        this.loading = false;
      }
    });
  }

  // Chargement des devoirs pour la leçon
  loadHomeworkItems(lessonId: string): void {
    console.log('📋 On commence le chargement des devoirs pour la leçon:', lessonId);
    
    // On charge les devoirs depuis la BDD via HomeworkService
    this.homeworkService.getHomeworkForLesson(lessonId).subscribe({
      next: (homeworkFromDB) => {
        console.log('📋 Les devoirs ont été chargés depuis la BDD:', homeworkFromDB);
        
        // On transforme pour l'affichage
        const homeworkItems = homeworkFromDB.map(homework => ({
          id: homework.id,
          type: homework.sourceType,
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
        
        // On charge aussi depuis le localStorage pour compatibilité
        const savedHomework = localStorage.getItem(`homework_${lessonId}`);
        let localHomework: any[] = [];
        if (savedHomework) {
          localHomework = JSON.parse(savedHomework);
          console.log('📋 Les devoirs ont été chargés depuis le localStorage:', localHomework);
        }
        
        // On fusionne les données de la BDD et du localStorage, sans doublons
        const combinedHomework = [...homeworkItems];
        
        // On ajoute les devoirs du localStorage qui ne sont pas dans la BDD
        localHomework.forEach(localItem => {
          const existsInDB = homeworkItems.some(dbItem => 
            dbItem.itemId === localItem.itemId && 
            dbItem.title === localItem.title
          );
          
          if (!existsInDB) {
            // On ajoute le champ createdInClass pour compatibilité
            localItem.createdInClass = localItem.createdInClass !== undefined ? localItem.createdInClass : true;
            combinedHomework.push(localItem);
          }
        });
        
        this.homeworkItems = combinedHomework;
        console.log('📋 Les devoirs finaux pour la leçon:', lessonId, this.homeworkItems);
      },
      error: (error) => {
        console.warn('⚠️ Ошибка chargement des devoirs depuis la BDD, on utilise le localStorage:', error);
        
        // Fallback : on charge seulement depuis le localStorage
        const savedHomework = localStorage.getItem(`homework_${lessonId}`);
        if (savedHomework) {
          this.homeworkItems = JSON.parse(savedHomework);
          // On ajoute le champ createdInClass pour compatibilité
          this.homeworkItems.forEach(item => {
            if (item.createdInClass === undefined) {
              item.createdInClass = true; // par défaut on considère que c'est créé en classe
            }
          });
          console.log('📋 Les devoirs ont été chargés depuis le localStorage (fallback):', this.homeworkItems);
        } else {
          this.homeworkItems = [];
        }
      }
    });
  }

  // Chargement des notes de cours
  async loadLessonNotes(lessonId: string): Promise<void> {
    try {
      console.log('📝 On charge les notes de cours pour la leçon depuis la base de données:', lessonId);
      
      // On initialise les notes depuis la BDD
      await this.lessonNotesService.initNotesForLesson(lessonId);
      
      // On s'abonne aux notes
      this.lessonNotesService.notes$.subscribe(notesData => {
        if (notesData && notesData.lessonId === lessonId) {
          console.log('📝 Les notes de cours ont été chargées depuis la base de données pour la leçon:', lessonId, notesData);
          
          // On transforme les données du service en format attendu par le HTML
          this.lessonNotes = {
            tasksNotes: this.extractStructuredNotes(notesData.tasks || []),
            questionsNotes: this.extractStructuredNotes(notesData.questions || []),
            materialsNotes: this.extractStructuredNotes(notesData.materials || []),
            // On garde l'ancien format pour compatibilité
            tasksContent: this.extractNotesContent(notesData.tasks || []),
            questionsContent: this.extractNotesContent(notesData.questions || []),
            materialsContent: this.extractNotesContent(notesData.materials || [])
          };
          
          console.log('📝 Les notes ont été transformées pour l\'affichage:', this.lessonNotes);
        }
      });
      
    } catch (error) {
      console.error('❌ Ошибка chargement des notes depuis la base de données:', error);
      this.lessonNotes = null;
      console.log('📝 Les notes n\'ont pas été trouvées pour la leçon:', lessonId);
    }
  }

  // Извлекает содержимое заметок и объединяет их
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

  // Nouveau méthode pour les notes structurées
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

  // Vérifie s'il y a des devoirs pour la leçon
  hasHomeworkItems(lessonId: string): boolean {
    const savedHomework = localStorage.getItem(`homework_${lessonId}`);
    return !!(savedHomework && JSON.parse(savedHomework).length > 0);
  }

  // Vérifie s'il y a des notes pour la leçon
  hasLessonNotes(lessonId: string): boolean {
    // On vérifie dans les notes actuelles du service
    const currentNotes = this.lessonNotesService.exportNotes();
    if (currentNotes && currentNotes.lessonId === lessonId) {
      // On vérifie s'il y a au moins une note avec du contenu
      const hasTasks = currentNotes.tasks && currentNotes.tasks.some(note => note.content && note.content.trim());
      const hasQuestions = currentNotes.questions && currentNotes.questions.some(note => note.content && note.content.trim());
      const hasMaterials = currentNotes.materials && currentNotes.materials.some(note => note.content && note.content.trim());
      
      return hasTasks || hasQuestions || hasMaterials;
    }
    
    // Fallback au localStorage pour compatibilité
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
      console.error('Ошибка lors de la vérification des notes:', error);
      return false;
    }
  }

  // Vérifie s'il y a des notes pour une section donnée
  hasNotesForSection(section: 'tasks' | 'questions' | 'materials'): boolean {
    if (!this.lessonNotes) return false;
    
    const sectionNotes = this.lessonNotes[`${section}Notes`];
    return sectionNotes && sectionNotes.length > 0;
  }

  // Chargement d'une leçon spécifique avec tâches et questions
  loadLesson(lessonId: string): void {
    this.loading = true;
    
    // On charge la leçon
    this.lessonService.getLessonDetails(lessonId).subscribe({
      next: (lesson) => {
        this.currentLesson = lesson;
        this.highlightedLessonId = lessonId;
        
        // On charge les tâches et questions
        this.loadTasksAndQuestions(lessonId);
        
        // On charge les devoirs et notes de cours
        this.loadHomeworkItems(lessonId);
        this.loadLessonNotes(lessonId);
        
        setTimeout(() => {
          this.highlightedLessonId = null;
        }, 5000);
      },
      error: (error) => {
        console.error('Ошибка chargement de la leçon:', error);
        this.loading = false;
      }
    });
  }

  // Chargement des tâches, questions et matériaux pour la leçon
  loadTasksAndQuestions(lessonId: string): void {
    Promise.all([
      this.lessonService.getTasksForLesson(lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(lessonId).toPromise(),
      this.getMaterialsForLesson(lessonId)
    ]).then(([tasks, questions, materials]) => {
      if (this.currentLesson) {
        this.currentLesson.tasks = tasks || [];
        this.currentLesson.questions = questions || [];
        this.currentLesson.materials = materials || [];
      }
      this.loading = false;
    }).catch(error => {
      console.error('Ошибка chargement des tâches, questions et matériaux:', error);
      this.loading = false;
    });
  }

  // Récupération des matériaux pour la leçon
  private async getMaterialsForLesson(lessonId: string): Promise<Material[]> {
    try {
      console.log('🔍 On charge les matériaux pour la leçon:', lessonId);
      const allMaterials = await this.materialService.getMaterials().toPromise();
      console.log('📦 Tous les matériaux ont été obtenus:', allMaterials);
      
      if (!allMaterials || allMaterials.length === 0) {
        console.warn('⚠️ Les matériaux n\'ont pas été trouvés ou la liste est vide. File-service peut ne pas être démarré?');
        return [];
      }
      
      const filteredMaterials = allMaterials.filter(material => {
        const isAttached = material.attachedLessons && material.attachedLessons.includes(lessonId);
        //console.log(`📎 Le matériel "${material.title}" est attaché aux leçons:`, material.attachedLessons, 'inclut la leçon', lessonId, '?', isAttached);
        return isAttached;
      });
      
      console.log('✅ Les matériaux filtrés pour la leçon:', filteredMaterials);
      return filteredMaterials;
    } catch (error) {
      console.error('❌ Ошибка chargement des matériaux pour la leçon:', error);
      console.error('❌ Les raisons possibles sont:');
      console.error('   1. File-service n\'est pas démarré sur le port 3008');
      console.error('   2. Problèmes de connexion à l\'API');
      console.error('   3. Erreur dans la structure des données des matériaux');
      return [];
    }
  }

  // Перезагрузка материалов для текущего урока
  async reloadMaterialsForCurrentLesson(): Promise<void> {
    if (!this.currentLesson) return;
    
    try {
      const materials = await this.getMaterialsForLesson(this.currentLesson.id);
      this.currentLesson.materials = materials;
      
      // On met à jour les matériaux dans la leçon courante
      const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
      if (lessonInList) {
        lessonInList.materials = materials;
      }
      
      console.log('✅ Les matériaux de la leçon ont été rechargés:', materials);
    } catch (error) {
      console.error('❌ Ошибка rechargement des matériaux:', error);
    }
  }

  // Chargement des tâches, questions et matériaux pour toutes les leçons
  loadTasksAndQuestionsForAllLessons(): void {
    if (this.lessons.length === 0) {
      this.loading = false;
      return;
    }

    const loadPromises = this.lessons.map(lesson => 
      Promise.all([
        this.lessonService.getTasksForLesson(lesson.id).toPromise().catch(() => []),
        this.lessonService.getQuestionsForLesson(lesson.id).toPromise().catch(() => []),
        this.getMaterialsForLesson(lesson.id).catch(() => [])
      ]).then(([tasks, questions, materials]) => {
        lesson.tasks = tasks || [];
        lesson.questions = questions || [];
        lesson.materials = materials || [];
      })
    );

    Promise.all(loadPromises).then(() => {
      this.loading = false;
      console.log('📚 Les tâches, questions et matériaux ont été chargés pour toutes les leçons');
    }).catch(error => {
      console.error('Ошибка chargement des tâches, questions et matériaux pour les leçons:', error);
      this.loading = false;
    });
  }

  // Mise à jour des statuts des leçons (passées/à venir)
  updateLessonStatuses(): void {
    // On garde les statuts originaux de l'API, on ne les modifie pas
    // La filtration sera basée sur la date et le statut dans la méthode matchesCurrentFilter
    console.log('📊 Les statuts des leçons ont été sauvegardés:', this.lessons.map(l => ({id: l.id, status: l.status, date: l.scheduledAt})));
  }

  // Ajout d'une nouvelle tâche
  addTask(): void {
    if (!this.newTaskTitle.trim() || !this.currentLesson) return;

    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    const taskData = {
      lessonId: this.currentLesson.id,
      title: this.newTaskTitle,
      description: this.newTaskDescription || null,
      createdBy: studentId,
      createdByRole: 'student' as const
    };

    this.lessonService.addTaskToLesson(taskData).subscribe({
      next: (newTask) => {
        if (this.currentLesson) {
          this.currentLesson.tasks.push(newTask);
          
          // On met à jour les tâches dans la liste des leçons
          const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
          if (lessonInList) {
            lessonInList.tasks.push(newTask);
          }
        }
        this.clearTaskForm();
        console.log('La tâche a été ajoutée:', newTask);
      },
      error: (error) => {
        console.error('Ошибка ajout de la tâche:', error);
      }
    });
  }

  // Ajout d'une nouvelle question
  addQuestion(): void {
    if (!this.newQuestionText.trim() || !this.currentLesson) return;

    const studentId = this.authService.getCurrentUser()?.id;
    if (!studentId) return;

    const questionData = {
      lessonId: this.currentLesson.id,
      question: this.newQuestionText,
      createdBy: studentId,
      createdByRole: 'student' as const
    };

    this.lessonService.addQuestionToLesson(questionData).subscribe({
      next: (newQuestion) => {
        if (this.currentLesson) {
          this.currentLesson.questions.push(newQuestion);
          
          // On met à jour les questions dans la liste des leçons
          const lessonInList = this.lessons.find(l => l.id === this.currentLesson!.id);
          if (lessonInList) {
            lessonInList.questions.push(newQuestion);
          }
        }
        this.clearQuestionForm();
        console.log('La question a été ajoutée:', newQuestion);
      },
      error: (error) => {
        console.error('Ошибка ajout de la question:', error);
      }
    });
  }

  // Nettoyage du formulaire de tâche
  clearTaskForm(): void {
    this.newTaskTitle = '';
    this.newTaskDescription = '';
    this.showAddTaskForm = false;
  }

  // Nettoyage du formulaire de question
  clearQuestionForm(): void {
    this.newQuestionText = '';
    this.showAddQuestionForm = false;
  }



  // Getters pour compatibilité avec le template
  get filteredLessons() {
    if (this.currentLesson) {
      // Quand une leçon spécifique est sélectionnée via le calendrier, on l'affiche en premier
      const otherLessons = this.lessons.filter(lesson => 
        lesson.id !== this.currentLesson!.id && this.matchesCurrentFilter(lesson)
      );
      return [this.currentLesson, ...otherLessons];
    }
    
    // Quand on accède à l'onglet directement, on applique la pagination
    const allFiltered = this.fullFilteredLessons;
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return allFiltered.slice(startIndex, endIndex);
  }

  get fullFilteredLessons() {
    //console.log(`📊 On applique le filtre "${this.filter}" à ${this.lessons.length} leçons`);
    
    const result = this.lessons.filter(lesson => this.matchesCurrentFilter(lesson));
    
    // console.log(`📊 Après filtrage: ${result.length} leçons`, result.map(l => ({
    //   id: l.id, 
    //   date: l.scheduledAt, 
    //   status: l.status,
    //   teacherName: l.teacherName
    // })));

    // Si une leçon est sélectionnée (via le calendrier), on la met en premier
    if (this.highlightedLessonIdFromUrl) {
      const highlightedLesson = result.find(l => l.id === this.highlightedLessonIdFromUrl);
      const otherLessons = result.filter(l => l.id !== this.highlightedLessonIdFromUrl);
      
      if (highlightedLesson) {
        return [highlightedLesson, ...otherLessons];
      }
    }

    // On trie par date : à venir en premier, passées en dernier
    const sorted = result.sort((a, b) => {
      const dateA = new Date(a.scheduledAt);
      const dateB = new Date(b.scheduledAt);
      const now = new Date();
      
      const aIsFuture = dateA > now;
      const bIsFuture = dateB > now;
      
      if (aIsFuture && bIsFuture) {
        return dateA.getTime() - dateB.getTime(); // À venir : les plus proches en premier
      } else if (!aIsFuture && !bIsFuture) {
        return dateB.getTime() - dateA.getTime(); // Passées : les dernières en premier
      } else {
        return aIsFuture ? -1 : 1; // À venir avant les passées
      }
    });
    
    // console.log(`📊 Après tri: ${sorted.length} leçons`);
    return sorted;
  }

  private matchesCurrentFilter(lesson: Lesson): boolean {
    const now = new Date();
    const lessonDate = new Date(lesson.scheduledAt);
    
    // Filtrage par temps
    if (this.filter === 'future') {
      // À venir : SEULEMENT les leçons à venir par temps
      const isFutureTime = lessonDate > now;
      
      // console.log(`🔍 Filtre Future pour la leçon ${lesson.id}:`, {
      //   lessonDate: lessonDate.toISOString(),
      //   now: now.toISOString(), 
      //   status: lesson.status,
      //   isFutureTime,
      //   teacherName: lesson.teacherName
      // });
      
      if (!isFutureTime) return false;
    } else if (this.filter === 'past') {
      // Passés : SEULEMENT les leçons passées par temps
      const isPastTime = lessonDate <= now;
      
      // console.log(`🕐 Filtre Past pour la leçon ${lesson.id}:`, {
      //   lessonDate: lessonDate.toISOString(),
      //   now: now.toISOString(),
      //   status: lesson.status,
      //   isPastTime,
      //   teacherName: lesson.teacherName
      // });
      
      if (!isPastTime) return false;
    }
    // 'all' - on affiche tout (à venir, passé, annulé, en attente de confirmation)

    // Filtrage par enseignant
    if (this.selectedTeacher && lesson.teacherName !== this.selectedTeacher) {
      return false;
    }

    // Filtrage par date de début
    if (this.startDate) {
      const filterDate = new Date(this.startDate);
      if (lessonDate < filterDate) return false;
    }

    // Filtrage par date de fin
    if (this.endDate) {
      const filterDate = new Date(this.endDate);
      filterDate.setHours(23, 59, 59, 999); // Fin de la journée
      if (lessonDate > filterDate) return false;
    }

    // Filtrage par terme de recherche
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

  get uniqueTeachers(): string[] {
    const teachers = this.lessons
      .map(lesson => lesson.teacherName)
      .filter((name, index, arr) => name && arr.indexOf(name) === index);
    return teachers as string[];
  }

  get allHomework(): string[] {
    return [];
  }

  get stats() {
    const now = new Date();
    return {
      pastCount: this.lessons.filter(l => {
        const lessonDate = new Date(l.scheduledAt);
        return lessonDate <= now || ['completed', 'past'].includes(l.status);
      }).length,
      futureCount: this.lessons.filter(l => {
        const lessonDate = new Date(l.scheduledAt);
        return lessonDate > now || ['confirmed', 'pending', 'in_progress'].includes(l.status);
      }).length,
      totalTasks: this.lessons.reduce((acc, l) => acc + l.tasks.length, 0),
      totalQuestions: this.lessons.reduce((acc, l) => acc + l.questions.length, 0),
    };
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

  // Retour à la liste des leçons
  backToLessonList(): void {
    this.currentLesson = null;
    this.highlightedLessonId = null;
    this.highlightedLessonIdFromUrl = null;
    
    // On met à jour l'URL, on retire les paramètres de la leçon
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {},
      replaceUrl: true
    });
    
    // On charge la liste des leçons si elle est vide
    if (this.lessons.length === 0) {
      this.loadStudentLessons();
    }
  }

  // Méthodes stub pour compatibilité
  onPageChange(event: PageEvent) {
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex + 1;
  }

  addToHomework(item: any) {
    // Implémenter si nécessaire
  }

  // Vérifie si on peut entrer en classe (seulement pour les leçons confirmées le même jour)
  canEnterClass(lesson: Lesson): boolean {
    // On vérifie le statut - on ne peut entrer que dans les leçons confirmées
    if (lesson.status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const lessonTime = new Date(lesson.scheduledAt);
    
    // On vérifie que la leçon est le même jour
    const isSameDay = now.getFullYear() === lessonTime.getFullYear() &&
                      now.getMonth() === lessonTime.getMonth() &&
                      now.getDate() === lessonTime.getDate();
    
    return isSameDay;
  }

  // Entrée en classe virtuelle
  async enterVirtualClass(lesson: Lesson): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId) return;

    // On définit les données de la leçon dans VideoCallService
    this.videoCallService.setLessonData(lesson.id, currentUserId);
    
    // On RECHARGE TOUJOURS LES MATÉRIAUX AVANT D'ENTRER EN CLASSE
    console.log('🔄 On recharge les matériaux avant d\'entrer en classe');
    const freshMaterials = await this.getMaterialsForLesson(lesson.id);
    
    // On met à jour les matériaux dans la leçon
    lesson.materials = freshMaterials;
    
    // On met aussi à jour les matériaux dans la liste des leçons
    const lessonInList = this.lessons.find(l => l.id === lesson.id);
    if (lessonInList) {
      lessonInList.materials = freshMaterials;
    }
    
    // On transmet les vraies données de la leçon au composant lesson-material
    const studentTasks = lesson.tasks.filter(t => t.createdByRole === 'student').map(t => ({ id: t.id, title: t.title }));
    const teacherTasks = lesson.tasks.filter(t => t.createdByRole === 'teacher').map(t => ({ id: t.id, title: t.title }));
    const studentQuestions = lesson.questions.filter(q => q.createdByRole === 'student').map(q => ({ id: q.id, question: q.question }));
    const teacherQuestions = lesson.questions.filter(q => q.createdByRole === 'teacher').map(q => ({ id: q.id, question: q.question }));
    
    this.lessonTabsService.setCurrentLessonData({
      id: lesson.id,
      date: lesson.scheduledAt,
      teacherTasks: teacherTasks,
      studentTasks: studentTasks,
      studentQuestions: studentQuestions,
      teacherQuestions: teacherQuestions,
      materials: freshMaterials,
      texts: freshMaterials.filter(m => m.type === 'text'),
      audios: freshMaterials.filter(m => m.type === 'audio'),
      videos: freshMaterials.filter(m => m.type === 'video'),
      homework: []
    });
    
    console.log('✅ Les vraies données de la leçon ont été transmises à classroom:', {
      studentTasks,
      teacherTasks,
      studentQuestions,
      teacherQuestions,
      materials: freshMaterials.length
    });
    
    this.router.navigate([`/classroom/${lesson.id}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  recalculateStatus() {
    this.updateLessonStatuses();
    this.currentPage = 1; // On réinitialise sur la première page lors du changement de filtre
  }

  // ==================== MÉTHODES POUR AFFICHER L'AUTEUR ====================
  
  getTaskAuthorDisplay(task: Task): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (task.createdBy === currentUserId) {
      return 'Mes tâches';
    } else {
      // Si la tâche a été créée par le prof, on affiche son nom
      return this.currentLesson?.teacherName || 'Professeur';
    }
  }

  getQuestionAuthorDisplay(question: Question): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (question.createdBy === currentUserId) {
      return 'Mes questions';
    } else {
      // Si la question a été créée par le prof, on affiche son nom
      return this.currentLesson?.teacherName || 'Professeur';
    }
  }

  getMaterialAuthorDisplay(material: Material): string {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (material.createdBy === currentUserId) {
      return 'Mes matériaux';
    } else {
      // Si le matériel a été créé par le prof, on affiche son nom
      return material.createdByName || 'Professeur';
    }
  }

  isOwnContent(createdBy: string): boolean {
    const currentUserId = this.authService.getCurrentUser()?.id;
    return createdBy === currentUserId;
  }

  // ==================== MÉTHODES POUR LE STATUT DE TRAITEMENT ====================
  
  // Pour les tâches et questions, on utilise le contenu comme identifiant (compatibilité avec lesson-material)
  // Pour les matériaux, on utilise l'ID
  isItemProcessed(section: 'tasks' | 'questions' | 'materials', itemIdentifier: string): boolean {
    let itemId: string;
    if (section === 'tasks') {
      // On cherche la tâche par contenu (title)
      const task = this.currentLesson?.tasks.find(t => t.title === itemIdentifier);
      itemId = task ? task.title : itemIdentifier; // On utilise le title comme itemId pour la compatibilité
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
    // Même logique que isItemProcessed
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

  // Récupération du statut de traitement en texte
  getProcessingStatusText(section: 'tasks' | 'questions' | 'materials', itemId: string): string {
    return this.isItemProcessed(section, itemId) ? 'Travaillé' : 'Non travaillé';
  }

  // Récupération de la classe CSS pour le statut de traitement
  getProcessingStatusClass(section: 'tasks' | 'questions' | 'materials', itemId: string): string {
    return this.isItemProcessed(section, itemId) ? 'status-processed' : 'status-unprocessed';
  }

  // ==================== GESTION DES PANNEAUX DÉROULANTS ====================
  
  // Toggle l'état du panneau des tâches
  toggleTaskExpansion(taskId: string): void {
    if (this.expandedTasks.has(taskId)) {
      this.expandedTasks.delete(taskId);
    } else {
      this.expandedTasks.add(taskId);
    }
  }

  // Toggle l'état du panneau des questions
  toggleQuestionExpansion(questionId: string): void {
    if (this.expandedQuestions.has(questionId)) {
      this.expandedQuestions.delete(questionId);
    } else {
      this.expandedQuestions.add(questionId);
    }
  }

  // Toggle l'état du panneau des matériaux
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

