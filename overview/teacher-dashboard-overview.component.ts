import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { TeacherProfileService } from '../src/app/features/dashboard/teacher-dashboard/teacher-profile.service';
import { TeacherProfile } from '../src/app/features/dashboard/teacher-dashboard/teacher-profile.model';
import { Review } from '../src/app/features/dashboard/shared/models/review.model';
import { MOCK_REVIEWS } from '../src/app/features/dashboard/teacher-dashboard/mock-reviews';
import { AuthService } from '../src/app/services/auth.service';
import { ProfilesApiService } from '../src/app/services/profiles-api.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarEvent } from 'angular-calendar';
import { LessonService } from '../src/app/services/lesson.service';
import { NotificationService } from '../src/app/services/notifications.service';


@Component({
  selector: 'app-teacher-dashboard-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class TeacherDashboardOverviewComponent implements OnInit {
  @ViewChild('publicProfile') publicProfileTemplate!: TemplateRef<any>;
  @ViewChild('studentDetailDialog') studentDetailDialog!: TemplateRef<any>;

  constructor(private dialog: MatDialog, private profileService: TeacherProfileService, private authService: AuthService, private profilesApi: ProfilesApiService, private lessonService: LessonService, private notificationService: NotificationService) { }

  profile: TeacherProfile | null = null;
  reviews: Review[] = [];
  days = [
    { name: 'Lundi', hours: { start: '09:00', end: '17:00' } },
    { name: 'Mardi', hours: null },
    { name: 'Mercredi', hours: { start: '14:00', end: '18:00' } },
    { name: 'Jeudi', hours: null },
    { name: 'Vendredi', hours: { start: '10:00', end: '16:00' } },
    { name: 'Samedi', hours: null },
    { name: 'Dimanche', hours: null }
  ];
  selectedStudent: any = null;
  studentViewFilter: 'all' | 'students' | 'pending' = 'all';

  students = [
    {
      name: 'Alice Dupont',
      isStudent: true,
      nextLessonDate: '22/05/2025',
      photoUrl: 'https://randomuser.me/api/portraits/women/1.jpg',
      goals: ['Préparer le DALF C1', 'Améliorer la compréhension orale'],
      homework: [
        { title: 'Production écrite #1', status: 'à corriger' },
        { title: 'Exercice B2', status: 'corrigé' }
      ],
      history: [
        { date: '15/05/2025', topic: 'Subjonctif présent' },
        { date: '08/05/2025', topic: 'Compréhension audio' }
      ]
    },
    {
      name: 'Thomas Moreau',
      isStudent: false,
      requestDate: '18/05/2025',
      photoUrl: ''
    }
  ];

  stats = {
    newStudents: 2,
    upcomingLessons: 3
  };

  studentsPerPage = 5;
  currentPage = 1;
  itemsPerPage = 5;

  calendarEvents: CalendarEvent[] = [
    {
      start: new Date(), // пример — сегодня
      title: 'Cours avec Alice Dupont'
    },
    {
      start: new Date(new Date().setDate(new Date().getDate() + 2)), // через 2 дня
      title: 'Cours avec Thomas Moreau'
    }
  ];

  confirmedStudents: any[] = [];
  pendingRequests: any[] = [];
  selectedRequest: any = null;
  selectedReason = '';
  customReason = '';
  showRefuseDialog = false;
  treatedRequests: any[] = [];
  REJECTION_REASONS = [
    'Je ne suis pas disponible à cette date',
    'Ce créneau ne correspond pas à mon emploi du temps régulier',
    'Je préfère discuter avant d\'accepter une première leçon',
    'Je n\'enseigne pas actuellement à ce niveau',
    'Autre'
  ];

  ngOnInit(): void {
    const stored = localStorage.getItem('teacher_reviews');
    this.reviews = stored ? JSON.parse(stored) : MOCK_REVIEWS;

    const teacherId = this.authService.getCurrentUser()?.id;
    if (teacherId) {
      // Загружаем все подтверждённые занятия для календаря
      this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe(lessons => {
        this.calendarEvents = lessons.map(lesson => ({
          start: new Date(lesson.scheduledAt),
          title: `Занятие с ${lesson.studentName}`,
        }));
      });

      // Загружаем заявки (demandes) как в teacher-home.component
      this.notificationService.getNotificationsForUser(teacherId).subscribe({
        next: (all: any[]) => {
          this.pendingRequests = all.filter((n: any) => n.type === 'booking_request' && n.status === 'pending');
          this.treatedRequests = all.filter((n: any) => n.type === 'booking_request' && n.status !== 'pending');
          console.log('[OVERVIEW] pendingRequests:', this.pendingRequests);
        },
        error: (err: any) => {
          console.error('[OVERVIEW] Ошибка при получении заявок:', err);
        }
      });
    }
  }

  openPublicProfileModal(): void {
    this.dialog.open(this.publicProfileTemplate, {
      width: '90%',
      maxWidth: '1100px',
      panelClass: 'teacher-preview-modal'
    });
  }

  openStudentModal(student: any): void {
    this.selectedStudent = student;
    if (!this.studentDetailDialog) {
      console.error('studentDetailDialog is undefined');
      return;
    }

    this.dialog.open(this.studentDetailDialog, {
      width: '500px',
      maxHeight: '90vh',
      panelClass: 'teacher-preview-modal'
    });
  }


  addSpecialization(newSpec: string) {
    if (newSpec && !this.profile?.specializations.includes(newSpec)) {
      this.profile?.specializations.push(newSpec);
    }
  }

  removeSpecialization(spec: string) {
    this.profile!.specializations = this.profile!.specializations.filter(s => s !== spec);
  }

  addCertificate(newCert: string) {
    if (newCert && !this.profile?.certificates.includes(newCert)) {
      this.profile?.certificates.push(newCert);
    }
  }

  removeCertificate(cert: string) {
    this.profile!.certificates = this.profile!.certificates.filter(c => c !== cert);
  }

  updateProfileField(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!this.profile || !userId) return;

    this.profilesApi.updateProfile({ ...this.profile, user_id: userId }).subscribe({
      next: () => console.log('[overview] Profil mis à jour automatiquement'),
      error: (err) => console.error('[overview] Erreur de mise à jour', err)
    });
  }

  onEnterSpecialization(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    if (value) {
      this.addSpecialization(value);
      input.value = '';
    }
  }

  filteredStudents() {
    if (this.studentViewFilter === 'pending') return this.pendingRequests;
    const source = this.confirmedStudents.length > 0 ? this.confirmedStudents : this.students;
    if (this.studentViewFilter === 'students') return source.filter(s => s.isStudent);
    return source;
  }


  get totalPages(): number {
    return Math.ceil(this.filteredStudents().length / this.itemsPerPage);
  }

  totalPagesArray(): number[] {
    return Array(this.totalPages).fill(0);
  }

  get paginatedStudents() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredStudents().slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  refreshConfirmedStudents(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (teacherId) {
      console.log('[OVERVIEW] Обновляем подтверждённых студентов для teacherId:', teacherId);
      this.lessonService.getConfirmedStudentsForTeacher(teacherId).subscribe(students => {
        this.confirmedStudents = students;
        console.log('[OVERVIEW] confirmedStudents (refresh):', students);
      });
    }
  }

  respondToRequest(request: any, accepted: boolean): void {
    const metadata = (request as any).data;
    if (!metadata?.lessonId) {
      console.error('❌ Données de requête invalides (lessonId manquant)');
      return;
    }

    if (accepted) {
      this.lessonService.respondToBooking(metadata.lessonId, accepted).subscribe(() => {
        const processed = this.pendingRequests.find(r => r.id === request.id);
        if (processed) {
          this.treatedRequests.unshift({ ...processed, status: accepted ? 'accepted' : 'rejected' });
        }
        this.pendingRequests = this.pendingRequests.filter(r => r.id !== request.id);
        this.refreshConfirmedStudents();
      });
    } else {
      this.selectedRequest = request;
      this.selectedReason = '';
      this.customReason = '';
      this.showRefuseDialog = true;
    }
  }

  parseMetadata(content: string): { lessonId: string } | null {
    try {
      const parsed = JSON.parse(content);
      if (parsed.lessonId) return parsed;
    } catch {
      return null;
    }
    return null;
  }

  confirmRefusal(): void {
    const reason = this.selectedReason === 'Autre' ? this.customReason.trim() : this.selectedReason;
    if (!reason || !this.selectedRequest) return;

    const metadata = this.parseMetadata(this.selectedRequest.message);
    if (!metadata) return;

    this.lessonService.respondToBooking(metadata.lessonId, false, reason).subscribe(() => {
      console.log('📤 [OVERVIEW] Rejet envoyé avec raison:', reason);
      this.pendingRequests = this.pendingRequests.filter(r => r.id !== this.selectedRequest!.id);
      this.selectedRequest = null;
      this.showRefuseDialog = false;
      this.refreshConfirmedStudents();
    });
  }

}
