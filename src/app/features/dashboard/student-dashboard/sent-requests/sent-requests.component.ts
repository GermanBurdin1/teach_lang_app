import { Component, OnInit } from '@angular/core';
import { LessonService } from '../../../../services/lesson.service';
import { AuthService } from '../../../../services/auth.service';

interface SentRequest {
  lessonId: string;
  teacherId: string;
  teacherName: string;
  scheduledAt: Date;
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled_by_student' | 'cancelled_by_student_no_refund';
  createdAt: Date;
  proposedTime?: Date;
  studentConfirmed?: boolean;
  studentRefused?: boolean;
  proposedByTeacherAt?: Date;
}

@Component({
  selector: 'app-sent-requests',
  templateUrl: './sent-requests.component.html',
  styleUrls: ['./sent-requests.component.css']
})
export class SentRequestsComponent implements OnInit {
  sentRequests: SentRequest[] = [];
  loading = true;
  currentUserId: string = '';
  legendCollapsed = false; // Переменная для сворачивания легенды

  constructor(
    private lessonService: LessonService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Проверяем авторизацию
    const currentUser = this.authService.getCurrentUser();
    console.log('[SentRequests] ngOnInit called, currentUser:', currentUser);
    
    if (!currentUser) {
      console.warn('[SentRequests] User not authenticated, waiting...');
      // Пробуем через секунду
      setTimeout(() => {
        const retryUser = this.authService.getCurrentUser();
        if (retryUser) {
          console.log('[SentRequests] User loaded on retry:', retryUser);
          this.initializeComponent(retryUser);
        } else {
          console.error('[SentRequests] Still no user after retry');
          this.loading = false;
        }
      }, 1000);
      return;
    }

    this.initializeComponent(currentUser);
  }

  private initializeComponent(currentUser: any): void {
    this.currentUserId = currentUser.id;
    console.log('[SentRequests] Initializing with userId:', this.currentUserId);
    
    if (this.currentUserId) {
      this.loadSentRequests();
    } else {
      console.error('[SentRequests] No valid userId found');
      this.loading = false;
    }
  }

  loadSentRequests(): void {
    console.log('[SentRequests] loadSentRequests called with userId:', this.currentUserId);
    
    if (!this.currentUserId) {
      console.error('[SentRequests] Cannot load requests without userId');
      this.loading = false;
      return;
    }

    this.loading = true;
    this.lessonService.getStudentSentRequests(this.currentUserId).subscribe({
      next: (requests) => {
        this.sentRequests = requests.map(req => ({
          ...req,
          scheduledAt: new Date(req.scheduledAt),
          createdAt: new Date(req.createdAt),
          proposedTime: req.proposedTime ? new Date(req.proposedTime) : undefined,
          proposedByTeacherAt: req.proposedByTeacherAt ? new Date(req.proposedByTeacherAt) : undefined
        }));
        this.loading = false;
        console.log('📋 Отправленные заявки загружены:', this.sentRequests);
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки отправленных заявок:', error);
        this.loading = false;
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'confirmed': return '#4caf50'; // Зеленый
      case 'rejected': return '#f44336';  // Красный
      case 'pending': return '#ff9800';   // Желтый/оранжевый
      case 'cancelled_by_student':
      case 'cancelled_by_student_no_refund':
        return '#9e9e9e';                 // Серый для отмененных
      default: return '#9e9e9e';          // Серый
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'cancelled_by_student': return '🚫';
      case 'cancelled_by_student_no_refund': return '⛔';
      default: return '❓';
    }
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'confirmed': return 'Confirmé';
      case 'rejected': return 'Refusé';
      case 'pending': return 'En attente';
      case 'cancelled_by_student': return 'Annulé (avec remboursement)';
      case 'cancelled_by_student_no_refund': return 'Annulé (sans remboursement)';
      default: return 'Inconnu';
    }
  }

  hasProposalFromTeacher(request: SentRequest): boolean {
    return !!(request.proposedTime && request.proposedByTeacherAt);
  }

  formatDateTime(date: Date): string {
    return date.toLocaleString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
} 