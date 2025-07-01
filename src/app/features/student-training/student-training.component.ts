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
  // Tab management
  activeTab = 'materials';
  activeHomeworkTab = 'pending'; // 'pending' для невыполненных, 'completed' для выполненных
  
  // Materials
  materials: Material[] = [];
  filteredMaterials: Material[] = [];
  
  // Homework
  homeworks: HomeworkDisplay[] = [];
  filteredHomeworks: HomeworkDisplay[] = [];
  groupedHomeworks: { [lessonId: string]: HomeworkDisplay[] } = {};
  
  // Homework filtering by status
  pendingHomeworks: HomeworkDisplay[] = [];
  completedHomeworks: HomeworkDisplay[] = [];
  overdueHomeworks: HomeworkDisplay[] = [];
  
  // Filters
  selectedTeacher = '';
  selectedMaterialType = '';
  selectedHomeworkStatus = '';
  dateFilter = '';
  
  // Available teachers
  teachers: { id: string; name: string }[] = [];
  
  // Current user
  currentUser: any = null;
  
  // Loading states
  loadingMaterials = false;
  loadingHomeworks = false;

  // Homework creation
  showCreateHomeworkForm = false;
  newHomework = {
    title: '',
    description: '',
    dueDate: new Date(),
    lessonId: '',
    materialIds: [] as string[]
  };
  
  // Available lessons for homework assignment
  availableLessons: any[] = [];
  loadingLessons = false;

  // Homework completion modal
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
    console.log('👤 Current user:', this.currentUser);
    console.log('🎭 User role - isStudent():', this.isStudent(), 'isTeacher():', this.isTeacher());
    this.loadMaterials();
    this.loadHomeworks();
    this.loadAvailableLessons(); // Загружаем уроки для отображения названий
    
    // Обработка параметров URL
    this.route.queryParams.subscribe(params => {
      console.log('🔄 Query params received:', params);
      if (params['tab']) {
        this.activeTab = params['tab'];
        console.log('📌 Set activeTab to:', this.activeTab);
      }
      if (params['homeworkId']) {
        // Если передан ID домашнего задания, переходим на вкладку домашних заданий
        this.activeTab = 'homework';
        console.log('📌 Set activeTab to homework, homeworkId:', params['homeworkId']);
        setTimeout(() => {
          this.highlightHomework(params['homeworkId']);
        }, 1000); // Увеличиваем задержку чтобы данные успели загрузиться
      }
    });
  }

  // ==================== MATERIALS SECTION ====================
  
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
        console.error('❌ Erreur lors du chargement des matériaux:', error);
        this.loadingMaterials = false;
      }
    });
  }

  // ==================== HOMEWORK SECTION ====================
  
  loadHomeworks() {
    console.log('🚀 loadHomeworks() called');
    if (!this.currentUser?.id) {
      console.log('❌ Нет текущего пользователя, пропускаем загрузку домашних заданий');
      return;
    }
    
    this.loadingHomeworks = true;
    console.log('🔄 Начинаем загрузку домашних заданий для пользователя:', this.currentUser);
    console.log('👤 User role check - isTeacher():', this.isTeacher(), 'isStudent():', this.isStudent());
    
    // Определяем роль пользователя для корректной загрузки домашних заданий
    if (this.isTeacher()) {
      console.log('👨‍🏫 Loading homework for teacher');
      // Для преподавателя загружаем домашние задания, которые он создал
      this.homeworkService.getHomeworkForTeacher(this.currentUser.id).subscribe({
        next: (homeworkFromDB) => {
          console.log('👨‍🏫 Загружены домашние задания преподавателя:', homeworkFromDB);
          this.processHomeworkItems(homeworkFromDB);
        },
        error: (error: Error) => {
          console.error('❌ Ошибка загрузки домашних заданий преподавателя:', error);
          this.homeworks = [];
          this.filteredHomeworks = [];
          this.groupedHomeworks = {};
          this.loadingHomeworks = false;
        }
      });
    } else {
      console.log('👨‍🎓 Loading homework for student');
      // Для студента загружаем домашние задания, назначенные ему
      this.homeworkService.getHomeworkForStudent(this.currentUser.id).subscribe({
        next: (homeworkFromDB) => {
          console.log('👨‍🎓 Загружены домашние задания студента:', homeworkFromDB);
          this.processHomeworkItems(homeworkFromDB);
        },
        error: (error: Error) => {
          console.error('❌ Ошибка загрузки домашних заданий студента:', error);
          this.homeworks = [];
          this.filteredHomeworks = [];
          this.groupedHomeworks = {};
          this.loadingHomeworks = false;
        }
      });
    }
  }

  // Обработка полученных домашних заданий
  private processHomeworkItems(homeworkFromDB: Homework[]) {
    console.log('🔧 processHomeworkItems() called with:', homeworkFromDB.length, 'items');
    // Преобразуем в формат для отображения
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
    console.log('📋 Final homeworks array:', this.homeworks);
    this.filterHomeworksByStatus();
    this.groupHomeworksByLesson();
    this.extractTeachers();
    this.loadingHomeworks = false;
    console.log('✅ Homework loading completed');
  }

  // Фильтрация домашних заданий по статусу
  private filterHomeworksByStatus(): void {
    console.log('🔄 Filtering homeworks by status');
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
    
    console.log('📊 Homework filtered by status:');
    console.log('📝 Pending:', this.pendingHomeworks);
    console.log('✅ Completed:', this.completedHomeworks);
    console.log('⏰ Overdue:', this.overdueHomeworks);
  }

  // Подсветка конкретного домашнего задания
  private highlightHomework(homeworkId: string): void {
    console.log('🎯 Highlighting homework:', homeworkId);
    console.log('📝 Available homeworks:', this.homeworks.map(h => h.id));
    
    const homework = this.homeworks.find(hw => hw.id === homeworkId);
    if (homework) {
      console.log('✅ Found homework:', homework);
      
      // Определяем, на какую подвкладку перейти
      if (homework.status === 'completed' || homework.status === 'submitted') {
        this.activeHomeworkTab = 'completed';
      } else if (this.isOverdue(homework.dueDate)) {
        this.activeHomeworkTab = 'overdue';
      } else {
        this.activeHomeworkTab = 'pending';
      }
      
      console.log('📌 Set activeHomeworkTab to:', this.activeHomeworkTab);
      
      // Автоматически открываем модалку для выполнения домашнего задания
      if (homework.status !== 'completed' && homework.status !== 'submitted') {
        this.openHomeworkModal(homework);
        console.log('🚀 Opened homework modal');
      }
      
      // Прокручиваем к элементу
      setTimeout(() => {
        const element = document.getElementById(`homework-${homeworkId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted');
          setTimeout(() => element.classList.remove('highlighted'), 3000);
        }
      }, 100);
    } else {
      console.warn('⚠️ Homework not found:', homeworkId);
    }
  }

  // ==================== FILTER METHODS ====================
  
  extractTeachers() {
    const teacherSet = new Set<string>();
    
    // Extract from materials
    this.materials.forEach(material => {
      if (material.createdByName) {
        teacherSet.add(material.createdByName);
      }
    });
    
    // Extract from homework
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

  // Группировка домашних заданий по урокам
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

  // Получение заголовков уроков для группировки
  getGroupedHomeworksArray(): { lessonId: string; lessonTitle: string; homeworks: HomeworkDisplay[] }[] {
    const result = Object.keys(this.groupedHomeworks).map(lessonId => ({
      lessonId,
      lessonTitle: this.getLessonTitle(lessonId),
      homeworks: this.groupedHomeworks[lessonId]
    }));
    
    // Сортируем по дате первого домашнего задания в группе
    return result.sort((a, b) => {
      const aDate = new Date(a.homeworks[0]?.assignedAt || 0);
      const bDate = new Date(b.homeworks[0]?.assignedAt || 0);
      return bDate.getTime() - aDate.getTime(); // Сначала новые
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

  // ==================== HOMEWORK ACTIONS ====================
  
  submitHomework(homeworkId: string) {
    this.homeworkService.updateHomeworkStatus(homeworkId, 'submitted').subscribe({
      next: (response) => {
        console.log('✅ Домашнее задание отправлено:', response);
        this.loadHomeworks(); // Перезагружаем список
      },
      error: (error: Error) => {
        console.error('❌ Ошибка при отправке домашнего задания:', error);
      }
    });
  }

  // Открытие модали для выполнения домашнего задания
  openHomeworkModal(homework: HomeworkDisplay): void {
    this.selectedHomework = homework;
    this.homeworkResponse = '';
    this.showHomeworkModal = true;
  }

  // Закрытие модали
  closeHomeworkModal(): void {
    this.showHomeworkModal = false;
    this.selectedHomework = null;
    this.homeworkResponse = '';
    this.isSubmittingHomework = false;
  }

  // Завершение домашнего задания
  completeHomework(): void {
    if (!this.selectedHomework || !this.homeworkResponse.trim()) {
      return;
    }

    this.isSubmittingHomework = true;

    // Обновляем статус домашнего задания на "completed"
    this.homeworkService.updateHomeworkStatus(this.selectedHomework.id, 'completed').subscribe({
      next: (response) => {
        console.log('✅ Домашнее задание завершено:', response);
        this.closeHomeworkModal();
        this.loadHomeworks(); // Перезагружаем список для обновления статуса
        
        // Уведомляем об обновлении домашнего задания
        this.homeworkService.notifyHomeworkUpdated();
        
        // Показываем уведомление об успехе
        // this.notificationService.success('Devoir terminé avec succès !');
      },
      error: (error: Error) => {
        console.error('❌ Ошибка при завершении домашнего задания:', error);
        this.isSubmittingHomework = false;
        // this.notificationService.error('Erreur lors de la soumission du devoir');
      }
    });
  }

  // ==================== HOMEWORK CREATION ====================
  
  loadAvailableLessons() {
    if (!this.currentUser?.id) return;
    
    this.loadingLessons = true;
    
    // Определяем роль пользователя и загружаем соответствующие уроки
    const userRole = this.currentUser.role || 'student';
    
    if (userRole === 'teacher') {
      // Для преподавателя загружаем все подтвержденные уроки
      this.lessonService.getAllConfirmedLessonsForTeacher(this.currentUser.id).subscribe({
        next: (lessons) => {
          console.log('👨‍🏫 Загружены уроки преподавателя:', lessons);
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
          console.error('❌ Ошибка загрузки уроков преподавателя:', error);
          this.availableLessons = [];
          this.loadingLessons = false;
        }
      });
    } else {
      // Для студента загружаем подтвержденные уроки
      this.lessonService.getConfirmedLessons(this.currentUser.id).subscribe({
        next: (lessons) => {
          console.log('👨‍🎓 Загружены уроки студента:', lessons);
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
          console.error('❌ Ошибка загрузки уроков студента:', error);
          this.availableLessons = [];
          this.loadingLessons = false;
        }
      });
    }
  }

  openCreateHomeworkForm() {
    this.showCreateHomeworkForm = true;
    this.loadAvailableLessons();
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.newHomework.dueDate = tomorrow;
  }

  // Добавление материала в домашнее задание
  addToHomework(material: Material) {
    if (!this.newHomework.materialIds.includes(material.id)) {
      this.newHomework.materialIds.push(material.id);
    }
  }

  // Создание нового домашнего задания
  createHomework() {
    if (!this.currentUser?.id || !this.newHomework.lessonId) {
      console.error('❌ Не хватает данных для создания домашнего задания');
      return;
    }

    const homework: Partial<Homework> = {
      title: this.newHomework.title,
      description: this.newHomework.description,
      dueDate: this.newHomework.dueDate,
      assignedBy: this.currentUser.id,
      assignedTo: '', // Будет заполнено на бэкенде
      status: 'assigned',
      materialIds: this.newHomework.materialIds,
      createdInClass: false
    };

    this.homeworkService.createHomework(this.newHomework.lessonId, homework).subscribe({
      next: (response) => {
        console.log('✅ Домашнее задание создано:', response);
        this.clearHomeworkForm();
        this.loadHomeworks();
      },
      error: (error: Error) => {
        console.error('❌ Ошибка при создании домашнего задания:', error);
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

  getMaterialTitle(materialId: string): string {
    const material = this.materials.find(m => m.id === materialId);
    return material ? material.title : 'Matériau inconnu';
  }

  getLessonTitle(lessonId: string): string {
    if (lessonId === 'no-lesson') {
      return 'Devoirs personnels';
    }
    
    const lesson = this.availableLessons.find(l => l.id === lessonId);
    if (!lesson) {
      console.log(`⚠️ Урок с ID ${lessonId} не найден в списке доступных уроков`);
      console.log('📋 Доступные уроки:', this.availableLessons.map(l => ({ id: l.id, title: l.title })));
      return 'Cours inconnu';
    }
    
    return lesson.title || `Cours du ${new Date(lesson.date).toLocaleDateString('fr-FR')}`;
  }

  // Определение роли пользователя для корректного отображения
  isTeacher(): boolean {
    return this.currentUser?.role === 'teacher';
  }

  isStudent(): boolean {
    return this.currentUser?.role === 'student' || !this.currentUser?.role;
  }

  // ==================== UTILITY METHODS ====================
  
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
    // Implementation for opening material content
    if (material.type === 'text') {
      // Open in modal or new page
      alert(`Contenu du matériau:\n\n${material.content}`);
    } else {
      // Handle other file types
      window.open(material.content, '_blank');
    }
  }

  // Debug method for templates
  debugLog(message: string) {
    console.log(message);
  }

  // Method to set homework tab
  setHomeworkTab() {
    console.log('🖱️ Clicked homework tab - method called!');
    this.activeTab = 'homework';
    console.log('📌 activeTab set to:', this.activeTab);
  }

  // Method to set materials tab
  setMaterialsTab() {
    console.log('🖱️ Clicked materials tab - method called!');
    this.activeTab = 'materials';
    console.log('📌 activeTab set to:', this.activeTab);
  }
} 