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
import { TeacherService } from '../src/app/services/teacher.service';
import { MatSnackBar } from '@angular/material/snack-bar';

// TODO : diviser ce composant en plus petits composants pour améliorer la maintenabilité
@Component({
  selector: 'app-teacher-dashboard-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class TeacherDashboardOverviewComponent implements OnInit {
  @ViewChild('publicProfile') publicProfileTemplate!: TemplateRef<any>;
  @ViewChild('studentDetailDialog') studentDetailDialog!: TemplateRef<any>;

  constructor(private dialog: MatDialog, private profileService: TeacherProfileService, private authService: AuthService, private profilesApi: ProfilesApiService, private lessonService: LessonService, private notificationService: NotificationService, private teacherService: TeacherService, private snackBar: MatSnackBar) { }

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
      start: new Date(), // exemple — aujourd'hui
      title: 'Cours avec Alice Dupont'
    },
    {
      start: new Date(new Date().setDate(new Date().getDate() + 2)), // dans 2 jours
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

  teacher: any = null;
  teacherReviews: any[] = [];
  showPublicProfilePreview = false;

  ngOnInit(): void {
    const stored = localStorage.getItem('teacher_reviews');
    this.reviews = stored ? JSON.parse(stored) : MOCK_REVIEWS;

    const teacherId = this.authService.getCurrentUser()?.id;
    if (teacherId) {
      // on charge tous les cours confirmés pour le calendrier avec indication colorée
      this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe(lessons => {
        this.calendarEvents = lessons.map(lesson => ({
          start: new Date(lesson.scheduledAt),
          title: `${this.getStatusIcon(lesson.status)} ${lesson.studentName}`,
          color: this.getCalendarColor(lesson.status),
          meta: {
            lessonId: lesson.id,
            status: lesson.status,
            studentId: lesson.studentId,
            studentName: lesson.studentName
          }
        }));
      });

      // on charge les demandes comme dans teacher-home.component
      this.notificationService.getNotificationsForUser(teacherId).subscribe({
        next: (all: any[]) => {
          this.pendingRequests = all.filter((n: any) => n.type === 'booking_request' && n.status === 'pending');
          this.treatedRequests = all.filter((n: any) => n.type === 'booking_request' && n.status !== 'pending');
          console.log('[TeacherOverview] Demandes en attente:', this.pendingRequests);
        },
        error: (err: any) => {
          console.error('[TeacherOverview] Erreur lors de la récupération des demandes:', err);
        }
      });

      this.teacherService.getTeacherById(teacherId).subscribe(data => {
        this.teacher = data || null;
      });
      this.teacherService.getReviewsByTeacher(teacherId).subscribe(reviews => {
        this.teacherReviews = reviews;
      });
    }

    this.refreshStudents();
  }

  openPublicProfileModal(): void {
    this.showPublicProfilePreview = true;
    const userId = this.authService.getCurrentUser()?.id;
    console.log('[TeacherOverview] Ouverture du profil public pour userId:', userId);
    if (userId) {
      this.teacherService.getTeacherById(userId).subscribe({
        next: data => {
          console.log('[TeacherOverview] Réponse teacherService.getTeacherById:', data);
          this.teacher = data || null;
        },
        error: err => {
          console.error('[TeacherOverview] Erreur lors du chargement du teacher:', err);
        }
      });
      this.teacherService.getReviewsByTeacher(userId).subscribe({
        next: reviews => {
          console.log('[TeacherOverview] Réponse teacherService.getReviewsByTeacher:', reviews);
          this.teacherReviews = reviews;
        },
        error: err => {
          console.error('[TeacherOverview] Erreur lors du chargement des avis:', err);
        }
      });
    }
    this.dialog.open(this.publicProfileTemplate, {
      width: '90%',
      maxWidth: '1100px',
      panelClass: 'teacher-preview-modal'
    }).afterClosed().subscribe(() => {
      this.showPublicProfilePreview = false;
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
    if (this.studentViewFilter === 'students') return this.confirmedStudents;
    return this.confirmedStudents;
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
      console.log('[TeacherOverview] Mise à jour des étudiants confirmés pour teacherId:', teacherId);
      this.lessonService.getConfirmedStudentsForTeacher(teacherId).subscribe(students => {
        this.confirmedStudents = students;
        console.log('[TeacherOverview] confirmedStudents (refresh):', students);
      });
    }
  }

  private refreshStudents(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe(lessons => {
      const now = new Date();
      console.log('[TeacherOverview] Cours chargés pour l\'enseignant:', lessons);
      // on groupe les cours par studentId
      const studentsMap: { [studentId: string]: any } = {};
      lessons.forEach((lesson: any) => {
        if (!studentsMap[lesson.studentId]) {
          studentsMap[lesson.studentId] = {
            studentId: lesson.studentId,
            name: lesson.studentName,
            photoUrl: lesson.studentPhotoUrl, // si disponible
            lessons: []
          };
        }
        studentsMap[lesson.studentId].lessons.push(lesson);
      });
      console.log('[TeacherOverview] Cours groupés par étudiant:', studentsMap);
      // pour chaque étudiant on cherche le prochain cours futur
      this.confirmedStudents = Object.values(studentsMap).map((student: any) => {
        const futureLessons = student.lessons
          .map((l: any) => new Date(l.scheduledAt))
          .filter((date: Date) => date > now)
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        console.log(`[TeacherOverview] Étudiant ${student.name} (${student.studentId}): futureLessons =`, futureLessons);
        return {
          ...student,
          nextLessonDate: futureLessons.length > 0 ? futureLessons[0] : null
        };
      });
      console.log('[TeacherOverview] Liste confirmedStudents mise à jour:', this.confirmedStudents);
    });
  }

  respondToRequest(request: any, accepted: boolean): void {
    const metadata = (request as any).data;
    if (!metadata?.lessonId) {
      console.error('[TeacherOverview] Données de requête invalides (lessonId manquant)');
      return;
    }

    if (accepted) {
      this.lessonService.respondToBooking(metadata.lessonId, accepted).subscribe(() => {
        this.refreshConfirmedStudents();
        this.refreshStudents();
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
      console.log('[TeacherOverview] Rejet envoyé avec raison:', reason);
      this.pendingRequests = this.pendingRequests.filter(r => r.id !== this.selectedRequest!.id);
      this.selectedRequest = null;
      this.showRefuseDialog = false;
      this.refreshConfirmedStudents();
      this.refreshStudents();
      this.snackBar.open('Notification de refus envoyée à l\'étudiant', 'OK', { duration: 3000 });
    });
  }

  private getCalendarColor(status: string): { primary: string, secondary: string } {
    switch (status) {
      case 'confirmed': 
        return { primary: '#4caf50', secondary: '#e8f5e9' }; // vert
      case 'rejected': 
        return { primary: '#f44336', secondary: '#ffebee' }; // rouge
      case 'pending': 
        return { primary: '#ff9800', secondary: '#fff3e0' }; // jaune/orange
      case 'cancelled_by_student':
      case 'cancelled_by_student_no_refund':
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // gris pour annulés
      case 'in_progress':
        return { primary: '#2196f3', secondary: '#e3f2fd' }; // bleu
      case 'completed':
        return { primary: '#9c27b0', secondary: '#f3e5f5' }; // violet
      default: 
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // gris
    }
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'confirmed': return '✅';
      case 'rejected': return '❌';
      case 'pending': return '⏳';
      case 'cancelled_by_student': return '🚫';
      case 'cancelled_by_student_no_refund': return '⛔';
      case 'in_progress': return '🔄';
      case 'completed': return '✅';
      default: return '❓';
    }
  }

}
