import { Component, OnInit } from '@angular/core';
import { MaterialService, Material } from '../../services/material.service';
import { HomeworkService, Homework } from '../../services/homework.service';
import { LessonService } from '../../services/lesson.service';
import { AuthService } from '../../services/auth.service';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';

interface HomeworkDisplay {
  id: string;
  sourceType: string;
  title: string;
  description: string;
  dueDate: Date;
  status: string;
  itemId: string;
  createdAt: Date;
  lessonId: string;
  createdInClass: boolean;
  sourceItemText?: string;
  grade?: number;
  teacherFeedback?: string;
  assignedByName: string;
  assignedBy: string;
  assignedTo: string;
  assignedToName: string;
  assignedAt: Date;
  materialIds: string[];
}

@Component({
  selector: 'app-student-training',
  templateUrl: './student-training.component.html',
  styleUrls: ['./student-training.component.css']
})
export class StudentTrainingComponent implements OnInit {
  // Gestion des onglets
  activeTab = 'materials';
  activeHomeworkTab = 'pending'; // 'pending' pour non terminés, 'completed' pour terminés
  
  // Matériaux
  materials: Material[] = [];
  filteredMaterials: Material[] = [];
  
  // Devoirs
  homeworks: HomeworkDisplay[] = [];
  filteredHomeworks: HomeworkDisplay[] = [];
  groupedHomeworks: { [lessonId: string]: HomeworkDisplay[] } = {};
  
  // Filtrage des devoirs par statut
  pendingHomeworks: HomeworkDisplay[] = [];
  completedHomeworks: HomeworkDisplay[] = [];
  overdueHomeworks: HomeworkDisplay[] = [];
  
  // Filtres
  selectedTeacher = '';
  selectedMaterialType = '';
  selectedHomeworkStatus = '';
  dateFilter = '';
  
  // Enseignants disponibles
  teachers: { id: string; name: string }[] = [];
  
  // Utilisateur actuel
  currentUser: any = null;
  
  // États de chargement
  loadingMaterials = false;
  loadingHomeworks = false;

  // Création de devoirs
  showCreateHomeworkForm = false;
  newHomework = {
    title: '',
    description: '',
    dueDate: new Date(),
    lessonId: '',
    materialIds: [] as string[]
  };
  
  // Leçons disponibles pour l'affectation des devoirs
  availableLessons: any[] = [];
  loadingLessons = false;

  // Modale de complétion de devoir
  showHomeworkModal = false;
  selectedHomework: HomeworkDisplay | null = null;
  homeworkResponse = '';
  isSubmittingHomework = false;

  constructor(
    private materialService: MaterialService,
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private dialog: MatDialog,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    console.log('Utilisateur actuel:', this.currentUser);
    console.log('Rôle de l\'utilisateur - isStudent():', this.isStudent(), 'isTeacher():', this.isTeacher());
    this.loadMaterials();
    this.loadHomeworks();
    this.loadAvailableLessons(); // Charge les leçons pour l'affichage des titres
    
    // Gestion des paramètres d'URL
    this.route.queryParams.subscribe(params => {
      console.log('Paramètres de requête reçus:', params);
      if (params['tab']) {
        this.activeTab = params['tab'];
        console.log('activeTab défini à:', this.activeTab);
      }
      if (params['homeworkId']) {
        // Si un ID de devoir est passé, aller à l'onglet devoirs
        this.activeTab = 'homework';
        console.log('activeTab défini à homework, homeworkId:', params['homeworkId']);
        setTimeout(() => {
          this.highlightHomework(params['homeworkId']);
        }, 1000); // Augmente le délai pour laisser le temps aux données de charger
      }
    });
  }

  // ==================== SECTION MATÉRIAUX ====================
  
  loadMaterials() {
    if (!this.currentUser?.id) return;
    
    this.loadingMaterials = true;
    this.materialService.getMaterialsForStudent(this.currentUser.id).subscribe({
      next: (materials) => {
        this.materials = materials;
        this.filteredMaterials = materials;
        this.extractTeachers();
        this.loadingMaterials = false;
      },
      error: (error: Error) => {
        console.error('Erreur lors du chargement des matériaux:', error);
        this.loadingMaterials = false;
      }
    });
  }

  // ==================== SECTION DEVOIRS ====================
  
  loadHomeworks() {
    console.log('loadHomeworks() appelé');
    if (!this.currentUser?.id) {
      console.log('Aucun utilisateur actuel, passage au chargement des devoirs');
      return;
    }
    
    this.loadingHomeworks = true;
    console.log('Démarrage du chargement des devoirs pour l\'utilisateur:', this.currentUser);
    console.log('Vérification du rôle de l\'utilisateur - isTeacher():', this.isTeacher(), 'isStudent():', this.isStudent());
    
    // Détermine le rôle de l'utilisateur pour charger les devoirs correctement
    if (this.isTeacher()) {
      console.log('Chargement des devoirs pour l\'enseignant');
      // Pour l'enseignant, charge les devoirs qu'il a créés
      this.homeworkService.getHomeworkForTeacher(this.currentUser.id).subscribe({
        next: (homeworkFromDB) => {
          console.log('Devoirs de l\'enseignant chargés:', homeworkFromDB);
          this.processHomeworkItems(homeworkFromDB);
        },
        error: (error: Error) => {
          console.error('Erreur lors du chargement des devoirs de l\'enseignant:', error);
          this.homeworks = [];
          this.filteredHomeworks = [];
          this.groupedHomeworks = {};
          this.loadingHomeworks = false;
        }
      });
    } else {
      console.log('Chargement des devoirs pour l\'étudiant');
      // Pour l'étudiant, charge les devoirs qui lui sont assignés
      this.homeworkService.getHomeworkForStudent(this.currentUser.id).subscribe({
        next: (homeworkFromDB) => {
          console.log('Devoirs de l\'étudiant chargés:', homeworkFromDB);
          this.processHomeworkItems(homeworkFromDB);
        },
        error: (error: Error) => {
          console.error('Erreur lors du chargement des devoirs de l\'étudiant:', error);
          this.homeworks = [];
          this.filteredHomeworks = [];
          this.groupedHomeworks = {};
          this.loadingHomeworks = false;
        }
      });
    }
  }

  // Traitement des devoirs reçus
  private processHomeworkItems(homeworkFromDB: Homework[]) {
    console.log('processHomeworkItems() appelé avec:', homeworkFromDB.length, 'éléments');
    // Transforme en format d'affichage
    const homeworkItems = homeworkFromDB.map(homework => ({
      id: homework.id,
      sourceType: homework.sourceType || '',
      title: homework.title,
      description: homework.description,
      dueDate: homework.dueDate,
      status: homework.status === 'assigned' ? 'unfinished' : homework.status,
      itemId: homework.sourceItemId || '',
      createdAt: new Date(homework.assignedAt),
      lessonId: homework.lessonId || '',
      createdInClass: homework.createdInClass,
      sourceItemText: homework.sourceItemText,
      grade: homework.grade,
      teacherFeedback: homework.teacherFeedback,
      assignedByName: homework.assignedByName,
      assignedBy: homework.assignedBy,
      assignedTo: homework.assignedTo,
      assignedToName: homework.assignedToName,
      assignedAt: homework.assignedAt,
      materialIds: homework.materialIds || []
    }));

    this.homeworks = homeworkItems;
    this.filteredHomeworks = this.homeworks;
    console.log('Array final des devoirs:', this.homeworks);
    this.filterHomeworksByStatus();
    this.groupHomeworksByLesson();
    this.extractTeachers();
    this.loadingHomeworks = false;
    console.log('Chargement des devoirs terminé');
  }

  // Filtrage des devoirs par statut
  private filterHomeworksByStatus(): void {
    console.log('Filtrage des devoirs par statut');
    const now = new Date();
    
    this.pendingHomeworks = this.homeworks.filter(hw => 
      hw.status === 'assigned' || hw.status === 'unfinished'
    );
    
    this.completedHomeworks = this.homeworks.filter(hw => 
      hw.status === 'completed' || hw.status === 'submitted'
    );
    
    this.overdueHomeworks = this.homeworks.filter(hw => {
      const dueDate = new Date(hw.dueDate);
      return now > dueDate && (hw.status === 'assigned' || hw.status === 'unfinished');
    });
    
    console.log('Devoirs filtrés par statut:');
    console.log('Non terminés:', this.pendingHomeworks);
    console.log('Terminés:', this.completedHomeworks);
    console.log('En retard:', this.overdueHomeworks);
  }

  // Met en surbrillance un devoir spécifique
  private highlightHomework(homeworkId: string): void {
    console.log('Mise en surbrillance du devoir:', homeworkId);
    console.log('Devoirs disponibles:', this.homeworks.map(h => h.id));
    
    const homework = this.homeworks.find(hw => hw.id === homeworkId);
    if (homework) {
      console.log('Devoir trouvé:', homework);
      
      // Détermine sur quel sous-onglet aller
      if (homework.status === 'completed' || homework.status === 'submitted') {
        this.activeHomeworkTab = 'completed';
      } else if (this.isOverdue(homework.dueDate)) {
        this.activeHomeworkTab = 'overdue';
      } else {
        this.activeHomeworkTab = 'pending';
      }
      
      console.log('activeHomeworkTab défini à:', this.activeHomeworkTab);
      
      // Ouvre automatiquement la modale pour faire le devoir
      if (homework.status !== 'completed' && homework.status !== 'submitted') {
        this.openHomeworkModal(homework);
        console.log('Modale de devoir ouverte');
      }
      
      // Fait défiler jusqu'à l'élément
      setTimeout(() => {
        const element = document.getElementById(`homework-${homeworkId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted');
          setTimeout(() => element.classList.remove('highlighted'), 3000);
        }
      }, 100);
    } else {
      console.warn('Devoir non trouvé:', homeworkId);
    }
  }

  // ==================== MÉTHODES DE FILTRAGE ====================
  
  extractTeachers() {
    const teacherSet = new Set<string>();
    
    // Extraire depuis les matériaux
    this.materials.forEach(material => {
      if (material.createdByName) {
        teacherSet.add(material.createdByName);
      }
    });
    
    // Extraire depuis les devoirs
    this.homeworks.forEach(homework => {
      if (homework.assignedByName) {
        teacherSet.add(homework.assignedByName);
      }
    });
    
    this.teachers = Array.from(teacherSet).map(name => ({
      id: name,
      name: name
    }));
  }

  filterMaterials() {
    this.filteredMaterials = this.materials.filter(material => {
      let matches = true;
      
      if (this.selectedTeacher && material.createdByName !== this.selectedTeacher) {
        matches = false;
      }
      
      if (this.selectedMaterialType && material.type !== this.selectedMaterialType) {
        matches = false;
      }
      
      return matches;
    });
  }

  filterHomeworks() {
    this.filteredHomeworks = this.homeworks.filter(homework => {
      let matches = true;
      
      if (this.selectedTeacher && homework.assignedByName !== this.selectedTeacher) {
        matches = false;
      }
      
      if (this.selectedHomeworkStatus && homework.status !== this.selectedHomeworkStatus) {
        matches = false;
      }
      
      if (this.dateFilter) {
        const filterDate = new Date(this.dateFilter);
        const homeworkDate = new Date(homework.assignedAt);
        if (homeworkDate.toDateString() !== filterDate.toDateString()) {
          matches = false;
        }
      }
      
      return matches;
    });
    
    this.groupHomeworksByLesson();
  }

  // Regroupe les devoirs par leçon
  groupHomeworksByLesson() {
    this.groupedHomeworks = {};
    
    this.filteredHomeworks.forEach(homework => {
      const lessonId = homework.lessonId;
      if (!this.groupedHomeworks[lessonId]) {
        this.groupedHomeworks[lessonId] = [];
      }
      this.groupedHomeworks[lessonId].push(homework);
    });
  }

  // Obtient les titres des leçons pour le regroupement
  getGroupedHomeworksArray(): { lessonId: string; lessonTitle: string; homeworks: HomeworkDisplay[] }[] {
    const result = Object.keys(this.groupedHomeworks).map(lessonId => ({
      lessonId,
      lessonTitle: this.getLessonTitle(lessonId),
      homeworks: this.groupedHomeworks[lessonId]
    }));
    
    // Trie par date du premier devoir du groupe
    return result.sort((a, b) => {
      const aDate = new Date(a.homeworks[0]?.assignedAt || 0);
      const bDate = new Date(b.homeworks[0]?.assignedAt || 0);
      return bDate.getTime() - aDate.getTime(); // D'abord les plus récents
    });
  }

  onTeacherFilterChange() {
    this.filterMaterials();
    this.filterHomeworks();
  }

  onMaterialTypeFilterChange() {
    this.filterMaterials();
  }

  onHomeworkStatusFilterChange() {
    this.filterHomeworks();
  }

  onDateFilterChange() {
    this.filterHomeworks();
  }

  clearFilters() {
    this.selectedTeacher = '';
    this.selectedMaterialType = '';
    this.selectedHomeworkStatus = '';
    this.dateFilter = '';
    this.filteredMaterials = [...this.materials];
    this.filteredHomeworks = [...this.homeworks];
  }

  // ==================== ACTIONS SUR LES DEVOIRS ====================
  
  submitHomework(homeworkId: string) {
    this.homeworkService.updateHomeworkStatus(homeworkId, 'submitted').subscribe({
      next: (response) => {
        console.log('Devoir soumis:', response);
        this.loadHomeworks(); // Recharge la liste
      },
      error: (error: Error) => {
        console.error('Erreur lors de la soumission du devoir:', error);
      }
    });
  }

  // Ouvre la modale pour faire le devoir
  openHomeworkModal(homework: HomeworkDisplay): void {
    this.selectedHomework = homework;
    this.homeworkResponse = '';
    this.showHomeworkModal = true;
  }

  // Ferme la modale
  closeHomeworkModal(): void {
    this.showHomeworkModal = false;
    this.selectedHomework = null;
    this.homeworkResponse = '';
    this.isSubmittingHomework = false;
  }

  // Termine le devoir
  completeHomework(): void {
    if (!this.selectedHomework || !this.homeworkResponse.trim()) {
      return;
    }

    this.isSubmittingHomework = true;

    // Met à jour le statut du devoir à "completed"
    this.homeworkService.updateHomeworkStatus(this.selectedHomework.id, 'completed').subscribe({
      next: (response) => {
        console.log('Devoir terminé:', response);
        this.closeHomeworkModal();
        this.loadHomeworks(); // Recharge la liste pour mettre à jour le statut
        
        // Notifie la mise à jour du devoir
        this.homeworkService.notifyHomeworkUpdated();
        
        // Affiche une notification de succès
        // this.notificationService.success('Devoir terminé avec succès !');
      },
      error: (error: Error) => {
        console.error('Erreur lors de la soumission du devoir:', error);
        this.isSubmittingHomework = false;
        // this.notificationService.error('Erreur lors de la soumission du devoir');
      }
    });
  }

  // ==================== CRÉATION DE DEVOIRS ====================
  
  loadAvailableLessons() {
    if (!this.currentUser?.id) return;
    
    this.loadingLessons = true;
    
    // Détermine le rôle de l'utilisateur et charge les leçons correspondantes
    const userRole = this.currentUser.role || 'student';
    
    if (userRole === 'teacher') {
      // Pour l'enseignant, charge toutes les leçons confirmées
      this.lessonService.getAllConfirmedLessonsForTeacher(this.currentUser.id).subscribe({
        next: (lessons) => {
          console.log('Leçons de l\'enseignant chargées:', lessons);
          this.availableLessons = lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title || `Cours avec ${lesson.studentName}`,
            date: new Date(lesson.scheduledAt),
            teacherId: lesson.teacherId,
            studentId: lesson.studentId,
            studentName: lesson.studentName,
            status: lesson.status
          }));
          this.loadingLessons = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des leçons de l\'enseignant:', error);
          this.availableLessons = [];
          this.loadingLessons = false;
        }
      });
    } else {
      // Pour l'étudiant, charge les leçons confirmées
      this.lessonService.getConfirmedLessons(this.currentUser.id).subscribe({
        next: (lessons) => {
          console.log('Leçons de l\'étudiant chargées:', lessons);
          this.availableLessons = lessons.map(lesson => ({
            id: lesson.id,
            title: lesson.title || `Cours avec ${lesson.teacherName}`,
            date: new Date(lesson.scheduledAt),
            teacherId: lesson.teacherId,
            studentId: lesson.studentId,
            teacherName: lesson.teacherName,
            status: lesson.status
          }));
          this.loadingLessons = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des leçons de l\'étudiant:', error);
          this.availableLessons = [];
          this.loadingLessons = false;
        }
      });
    }
  }

  openCreateHomeworkForm() {
    this.showCreateHomeworkForm = true;
    this.loadAvailableLessons();
    
    // Définit la date d'échéance par défaut à demain
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.newHomework.dueDate = tomorrow;
  }

  // Ajoute un matériau au devoir
  addToHomework(material: Material) {
    if (!this.newHomework.materialIds.includes(material.id)) {
      this.newHomework.materialIds.push(material.id);
    }
  }

  // Crée un nouveau devoir
  createHomework() {
    if (!this.currentUser?.id || !this.newHomework.lessonId) {
      console.error('Manque de données pour créer le devoir');
      return;
    }

    const homework: Partial<Homework> = {
      title: this.newHomework.title,
      description: this.newHomework.description,
      dueDate: this.newHomework.dueDate,
      assignedBy: this.currentUser.id,
      assignedTo: '', // Rempli sur le backend
      status: 'assigned',
      materialIds: this.newHomework.materialIds,
      createdInClass: false
    };

    this.homeworkService.createHomework(this.newHomework.lessonId, homework).subscribe({
      next: (response) => {
        console.log('Devoir créé:', response);
        this.clearHomeworkForm();
        this.loadHomeworks();
      },
      error: (error: Error) => {
        console.error('Erreur lors de la création du devoir:', error);
      }
    });
  }

  clearHomeworkForm() {
    this.showCreateHomeworkForm = false;
    this.newHomework = {
      title: '',
      description: '',
      dueDate: new Date(),
      lessonId: '',
      materialIds: []
    };
  }

  toggleMaterialForHomework(materialId: string, event: any) {
    if (event.target.checked) {
      this.newHomework.materialIds.push(materialId);
    } else {
      const index = this.newHomework.materialIds.indexOf(materialId);
      if (index > -1) {
        this.newHomework.materialIds.splice(index, 1);
      }
    }
  }

  // Obtient le titre du matériau
  getMaterialTitle(materialId: string): string {
    const material = this.materials.find(m => m.id === materialId);
    return material ? material.title : 'Matériau inconnu';
  }

  // Obtient le titre de la leçon
  getLessonTitle(lessonId: string): string {
    if (lessonId === 'no-lesson') {
      return 'Devoirs personnels';
    }
    
    const lesson = this.availableLessons.find(l => l.id === lessonId);
    if (!lesson) {
      console.log(`Leçon avec ID ${lessonId} non trouvée dans la liste des leçons disponibles`);
      console.log('Leçons disponibles:', this.availableLessons.map(l => ({ id: l.id, title: l.title })));
      return 'Cours inconnu';
    }
    
    return lesson.title || `Cours du ${new Date(lesson.date).toLocaleDateString('fr-FR')}`;
  }

  // Détermine le rôle de l'utilisateur pour l'affichage
  isTeacher(): boolean {
    return this.currentUser?.role === 'teacher';
  }

  isStudent(): boolean {
    return this.currentUser?.role === 'student' || !this.currentUser?.role;
  }

  // ==================== MÉTHODES UTILITAIRES ====================
  
  getHomeworkStatusText(status: string): string {
    const statusTexts = {
      'assigned': 'Assigné',
      'submitted': 'Soumis',
      'completed': 'Terminé',
      'overdue': 'En retard'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  getHomeworkStatusClass(status: string): string {
    return `status-${status}`;
  }

  getMaterialTypeIcon(type: string): string {
    const icons = {
      'text': 'fas fa-file-text',
      'audio': 'fas fa-volume-up', 
      'video': 'fas fa-video',
      'pdf': 'fas fa-file-pdf',
      'image': 'fas fa-image'
    };
    return icons[type as keyof typeof icons] || 'fas fa-file';
  }

  getDaysUntilDue(dueDate: Date): number {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysOverdue(dueDate: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(dueDate: Date): boolean {
    return new Date(dueDate) < new Date();
  }

  openMaterial(material: Material) {
    // Implémentation pour ouvrir le contenu du matériau
    if (material.type === 'text') {
      // Ouvrir en modal ou nouvelle page
      alert(`Contenu du matériau:\n\n${material.content}`);
    } else {
      // Gérer les autres types de fichiers
      window.open(material.content, '_blank');
    }
  }

  // Méthode de debug pour les templates
  debugLog(message: string) {
    console.log(message);
  }

  // Méthode pour définir l'onglet devoirs
  setHomeworkTab() {
    console.log('Onglet devoirs cliqué - méthode appelée!');
    this.activeTab = 'homework';
    console.log('activeTab défini à:', this.activeTab);
  }

  // Méthode pour définir l'onglet matériaux
  setMaterialsTab() {
    console.log('Onglet matériaux cliqué - méthode appelée!');
    this.activeTab = 'materials';
    console.log('activeTab défini à:', this.activeTab);
  }
} 