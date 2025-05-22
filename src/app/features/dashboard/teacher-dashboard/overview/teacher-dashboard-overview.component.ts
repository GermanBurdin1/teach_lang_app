import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { TeacherProfileService } from '../teacher-profile.service';
import { TeacherProfile } from '../teacher-profile.model';
import { Review } from '../../shared/models/review.model';
import { MOCK_REVIEWS } from '../mock-reviews';
import { AuthService } from '../../../../services/auth.service';
import { ProfilesApiService } from '../../../../services/profiles-api.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarEvent } from 'angular-calendar';


@Component({
  selector: 'app-teacher-dashboard-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class TeacherDashboardOverviewComponent implements OnInit {
  @ViewChild('publicProfile') publicProfileTemplate!: TemplateRef<any>;
  @ViewChild('studentDetailDialog') studentDetailDialog!: TemplateRef<any>;

  constructor(private dialog: MatDialog, private profileService: TeacherProfileService, private authService: AuthService, private profilesApi: ProfilesApiService,) { }

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

  ngOnInit(): void {
    this.profileService.getTeacherProfile().subscribe((data) => {
      this.profile = data;
    });

    const stored = localStorage.getItem('teacher_reviews');
    this.reviews = stored ? JSON.parse(stored) : MOCK_REVIEWS;
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
    if (this.studentViewFilter === 'students') return this.students.filter(s => s.isStudent);
    if (this.studentViewFilter === 'pending') return this.students.filter(s => !s.isStudent);
    return this.students;
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


}
