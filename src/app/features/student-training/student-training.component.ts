import { Component, OnInit } from '@angular/core';
import { MaterialService, Material } from '../../services/material.service';
import { HomeworkService, Homework } from '../../services/homework.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-student-training',
  templateUrl: './student-training.component.html',
  styleUrls: ['./student-training.component.css']
})
export class StudentTrainingComponent implements OnInit {
  // Tab management
  activeTab = 'materials';
  
  // Materials
  materials: Material[] = [];
  filteredMaterials: Material[] = [];
  
  // Homework
  homeworks: Homework[] = [];
  filteredHomeworks: Homework[] = [];
  
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

  constructor(
    private materialService: MaterialService,
    private homeworkService: HomeworkService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getCurrentUser();
    this.loadMaterials();
    this.loadHomeworks();
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
      error: (error) => {
        console.error('❌ Erreur lors du chargement des matériaux:', error);
        this.loadingMaterials = false;
      }
    });
  }

  // ==================== HOMEWORK SECTION ====================
  
  loadHomeworks() {
    if (!this.currentUser?.id) return;
    
    this.loadingHomeworks = true;
    this.homeworkService.getHomeworkForStudent(this.currentUser.id).subscribe({
      next: (homeworks) => {
        this.homeworks = homeworks;
        this.filteredHomeworks = homeworks;
        this.extractTeachers();
        this.loadingHomeworks = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des devoirs:', error);
        this.loadingHomeworks = false;
      }
    });
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
    // Implementation for homework submission
    const submission = prompt('Entrez votre réponse pour ce devoir:');
    if (submission && submission.trim()) {
      this.homeworkService.submitHomework(homeworkId, submission).subscribe({
        next: () => {
          console.log('✅ Devoir soumis avec succès');
          this.loadHomeworks(); // Refresh homework list
        },
        error: (error) => {
          console.error('❌ Erreur lors de la soumission:', error);
        }
      });
    }
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
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
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
} 