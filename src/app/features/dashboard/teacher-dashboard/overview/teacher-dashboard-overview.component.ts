import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { TeacherProfile } from '../teacher-profile.model';
import { Review } from '../../shared/models/review.model';
import { MOCK_REVIEWS } from '../mock-reviews';
import { AuthService } from '../../../../services/auth.service';
import { ProfilesApiService } from '../../../../services/profiles-api.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarEvent } from 'angular-calendar';
import { LessonService } from '../../../../services/lesson.service';
import { WebSocketService } from '../../../../services/web-socket.service';
import { NotificationService } from '../../../../services/notifications.service';
import { TeacherService } from '../../../../services/teacher.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../../../environment.prod';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

// Интерфейсы для типизации
interface Student {
  id: string;  // Make required to match BookingRequest
  name?: string;
  email?: string;
  studentId?: string;
  isStudent?: boolean;
  nextLessonDate?: string | Date | null;
  photoUrl?: string;
  title?: string;
  goals?: string[];
  homework?: Array<{
    title: string;
    status: string;
  }>;
  history?: Array<{
    date: string;
    topic: string;
  }>;
  metadata?: {
    studentName?: string;
    invitationStatus?: 'sent' | 'accepted' | 'declined';
    invitationClassId?: string;
  };
  lessons?: unknown[];
  requestDate?: string;
  [key: string]: unknown;
}

interface BookingRequest {
  id: string;
  type?: string;
  status?: string;
  message?: string;
  data?: {
    lessonId?: string;
  };
  metadata?: {
    studentName?: string;
    lessonId?: string;
  };
  // Добавляем поля для совместимости со Student
  name?: string;
  title?: string;
  photoUrl?: string;
  nextLessonDate?: string | Date | null;
  isStudent?: boolean;
  studentId?: string;
  requestDate?: string;
  [key: string]: unknown;
}

interface Lesson {
  id: string;
  scheduledAt: string;
  status: string;
  studentName: string;
  studentId: string;
  teacherName?: string;
  teacherId?: string;
  [key: string]: unknown;
}

interface TeacherClass {
  id: string;
  name: string;
  level: string;
  status: string;
  students?: Student[];
  scheduledAt?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-teacher-dashboard-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.css']
})
export class TeacherDashboardOverviewComponent implements OnInit {
  @ViewChild('publicProfile') publicProfileTemplate!: TemplateRef<unknown>;
  @ViewChild('studentDetailDialog') studentDetailDialog!: TemplateRef<unknown>;

  constructor(
    private dialog: MatDialog,
    private authService: AuthService, 
    private profilesApi: ProfilesApiService,
    private lessonService: LessonService,
    private wsService: WebSocketService,
    private notificationService: NotificationService,
    private teacherService: TeacherService,
    private snackBar: MatSnackBar,
    private formBuilder: FormBuilder
  ) { }

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
  selectedStudent: Student | null = null;
  studentViewFilter: 'all' | 'students' | 'pending' = 'all';

  students: Student[] = [
    {
      id: 'alice-dupont-1',
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
      id: 'thomas-moreau-1',
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

  confirmedStudents: Student[] = [];
  pendingRequests: BookingRequest[] = [];
  selectedRequest: BookingRequest | null = null;
  
  // Отправленные приглашения
  sentInvitations: { [key: string]: { studentId: string, classId: string, status: 'sent' | 'accepted' | 'declined' } } = {};
  selectedReason = '';
  customReason = '';
  showRefuseDialog = false;
  treatedRequests: BookingRequest[] = [];

  // Форма добавления студента по email
  addStudentForm!: FormGroup;
  isAddingStudent = false;
  REJECTION_REASONS = [
    'Je ne suis pas disponible à cette date',
    'Ce créneau ne correspond pas à mon emploi du temps régulier',
    'Je préfère discuter avant d\'accepter une première leçon',
    'Je n\'enseigne pas actuellement à ce niveau',
    'Autre'
  ];

  teacher: unknown = null;
  teacherReviews: unknown[] = [];
  showPublicProfilePreview = false;

  // Управление классом и приглашениями
  hasActiveClass = true; // Временно установим true для демонстрации
  teacherClasses: TeacherClass[] = []; // Список всех классов преподавателя
  inviteForm = {
    email: '',
    level: '',
    message: '',
    examGoal: ''
  };

  ngOnInit(): void {
    const stored = localStorage.getItem('teacher_reviews');
    this.reviews = stored ? JSON.parse(stored) : MOCK_REVIEWS;

    // Инициализируем форму добавления студента
    this.addStudentForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]]
    });
    console.log('🔥🔥🔥 Form initialized:', this.addStudentForm);

    const teacherId = this.authService.getCurrentUser()?.id;
    
    // Загружаем отправленные приглашения
    if (teacherId) {
      const storedInvitations = localStorage.getItem(`sent_invitations_${teacherId}`);
      if (storedInvitations) {
        this.sentInvitations = JSON.parse(storedInvitations);
      }
    }
    if (teacherId) {
      // Загружаем все подтверждённые занятия для календаря с цветовой индикацией
      this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe((lessons: unknown[]) => {
        this.calendarEvents = lessons.map((lesson: unknown) => {
          const lessonData = lesson as Lesson;
          return {
            start: new Date(lessonData.scheduledAt),
            title: `${this.getStatusIcon(lessonData.status)} ${lessonData.studentName}`,
            color: this.getCalendarColor(lessonData.status),
            meta: {
              lessonId: lessonData.id,
              status: lessonData.status,
              studentId: lessonData.studentId,
              studentName: lessonData.studentName
            }
          };
        });
      });

      // Загружаем заявки (demandes) как в teacher-home.component
      this.notificationService.getNotificationsForUser(teacherId).subscribe({
        next: (all: unknown[]) => {
          this.pendingRequests = all.filter((n: unknown) => (n as BookingRequest).type === 'booking_request' && (n as BookingRequest).status === 'pending') as BookingRequest[];
          this.treatedRequests = all.filter((n: unknown) => (n as BookingRequest).type === 'booking_request' && (n as BookingRequest).status !== 'pending') as BookingRequest[];
          if (!environment.production) {
            console.log('[OVERVIEW] pendingRequests:', this.pendingRequests);
          }
        },
        error: (err: Error) => {
          if (!environment.production) {
            console.error('[OVERVIEW] Ошибка при получении заявок:', err);
          }
        }
      });

      this.teacherService.getTeacherById(teacherId).subscribe(data => {
        this.teacher = data || null;
      });
      this.teacherService.getReviewsByTeacher(teacherId).subscribe(reviews => {
        this.teacherReviews = reviews;
      });
    }

    this.devLog('[OVERVIEW] ngOnInit - starting initialization');
    
    this.devLog('[OVERVIEW] ngOnInit - calling loadStudentsFromStorage()');
    this.loadStudentsFromStorage(); // Загружаем студентов из localStorage
    
    this.devLog('[OVERVIEW] ngOnInit - calling refreshStudents()');
    this.refreshStudents();
    
    this.devLog('[OVERVIEW] ngOnInit - before refreshConfirmedStudents, confirmedStudents:', this.confirmedStudents);
    this.devLog('[OVERVIEW] ngOnInit - before refreshConfirmedStudents, confirmedStudents count:', this.confirmedStudents.length);
    
    this.devLog('[OVERVIEW] ngOnInit - calling refreshConfirmedStudents()');
    this.refreshConfirmedStudents(); // Добавляем загрузку подтвержденных студентов
    
    this.devLog('[OVERVIEW] ngOnInit - calling loadTeacherClasses()');
    this.loadTeacherClasses();
    
    this.devLog('[OVERVIEW] ngOnInit - initialization complete');
  }

  loadTeacherClasses(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    
    const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
    if (savedClasses) {
      this.teacherClasses = JSON.parse(savedClasses);
      if(!environment.production) console.log('[Overview] Загружены классы преподавателя:', this.teacherClasses);
    } else {
      // Если нет сохраненных классов, создаем демонстрационный класс
      if(!environment.production) console.log('[Overview] Нет сохраненных классов, создаем демо-класс');
      this.teacherClasses = [
        {
          id: 'demo-class-1',
          name: 'DELF B1 - Groupe 1',
          level: 'B1',
          description: 'Classe de démonstration pour DELF B1',
          maxStudents: 10,
          students: [],
          teacherId: teacherId,
          createdAt: new Date().toISOString(),
          scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // Dans 3 jours
          status: 'active'
        },
        {
          id: 'demo-class-2', 
          name: 'DALF C1 - Groupe Avancé',
          level: 'C1',
          description: 'Classe de démonstration pour DALF C1',
          maxStudents: 8,
          students: [],
          teacherId: teacherId,
          createdAt: new Date().toISOString(),
          scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Dans 7 jours
          status: 'active'
        }
      ];
      
      // Сохраняем демо-классы
      localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(this.teacherClasses));
    }
  }

  openPublicProfileModal(): void {
    this.showPublicProfilePreview = true;
    const userId = this.authService.getCurrentUser()?.id;
    if(!environment.production) console.log('[Overview] Открытие публичного профиля для userId:', userId);
    if (userId) {
      this.teacherService.getTeacherById(userId).subscribe({
        next: data => {
          if(!environment.production) console.log('[Overview] teacherService.getTeacherById ответ:', data);
          this.teacher = data || null;
        },
        error: err => {
          console.error('[Overview] Ошибка при загрузке teacher:', err);
        }
      });
      this.teacherService.getReviewsByTeacher(userId).subscribe({
        next: reviews => {
          if(!environment.production) console.log('[Overview] teacherService.getReviewsByTeacher ответ:', reviews);
          this.teacherReviews = reviews;
        },
        error: err => {
          console.error('[Overview] Ошибка при загрузке отзывов:', err);
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

  openStudentModal(student: Student): void {
    this.selectedStudent = student as Student;
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

  filteredStudents(): Student[] {
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

  get paginatedStudents(): Student[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredStudents().slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number) {
    this.currentPage = page;
  }

  refreshConfirmedStudents(): void {
    console.log('🔥 refreshConfirmedStudents called!');
    const teacherId = this.authService.getCurrentUser()?.id;
    console.log('🔥 teacherId:', teacherId);
    
    this.devLog('[OVERVIEW] refreshConfirmedStudents - current confirmedStudents before API call:', this.confirmedStudents);
    this.devLog('[OVERVIEW] refreshConfirmedStudents - current confirmedStudents count:', this.confirmedStudents.length);
    
    if (teacherId) {
      console.log('🔥 Calling API...');
      this.devLog('[OVERVIEW] Обновляем подтверждённых студентов для teacherId:', teacherId);
      this.lessonService.getConfirmedStudentsForTeacher(teacherId).subscribe((students: unknown[]) => {
        this.devLog('[OVERVIEW] Получены студенты от API:', students);
        this.devLog('[OVERVIEW] API students count:', students.length);
        
        // Получаем студентов из API
        const apiStudents = students.map(s => {
          const student = s as {id?: string, [key: string]: unknown};
          return {...student, id: student.id || ''} as Student;
        });
        
        this.devLog('[OVERVIEW] Mapped API students:', apiStudents);
        
        // Объединяем студентов из localStorage и API (избегаем дубликатов)
        const existingIds = new Set(this.confirmedStudents.map(s => s.id));
        this.devLog('[OVERVIEW] Existing student IDs from localStorage:', Array.from(existingIds));
        this.devLog('[OVERVIEW] All localStorage students with their IDs:', this.confirmedStudents.map(s => ({ id: s.id, name: s.name })));
        
        const newStudents = apiStudents.filter(s => !existingIds.has(s.id));
        this.devLog('[OVERVIEW] New students from API (not in localStorage):', newStudents);
        
        // Вместо объединения, заменяем localStorage студентов на API студентов
        // но сохраняем студентов, которых нет в API (добавленных вручную)
        const apiStudentIds = new Set(apiStudents.map(s => s.id));
        const localStorageOnlyStudents = this.confirmedStudents.filter(s => !apiStudentIds.has(s.id));
        
        this.devLog('[OVERVIEW] Students only in localStorage (not in API):', localStorageOnlyStudents);
        
        this.confirmedStudents = [...apiStudents, ...localStorageOnlyStudents];
        this.devLog('[OVERVIEW] Final confirmedStudents after merge:', this.confirmedStudents);
        
        // Сохраняем обновленный список
        this.saveStudentsToStorage();
        
        this.devLog('[OVERVIEW] confirmedStudents (refresh):', this.confirmedStudents);
        this.devLog('[OVERVIEW] Количество студентов:', this.confirmedStudents.length);
      });
    }
  }

  private refreshStudents(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    
    this.devLog('[OVERVIEW] refreshStudents - current confirmedStudents before API call:', this.confirmedStudents);
    this.devLog('[OVERVIEW] refreshStudents - current confirmedStudents count:', this.confirmedStudents.length);
    
    this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe((lessons: unknown[]) => {
      const now = new Date();
      if(!environment.production) console.log('[DEBUG] Загруженные уроки для учителя:', lessons);
      
      // Группируем занятия по studentId
      const studentsMap: { [studentId: string]: Student } = {};
      lessons.forEach((lesson: unknown) => {
        const lessonData = lesson as { studentId: string; studentName: string; studentPhotoUrl?: string; scheduledAt: string };
        if (!studentsMap[lessonData.studentId]) {
          studentsMap[lessonData.studentId] = {
            id: lessonData.studentId,  // Add required id field
            studentId: lessonData.studentId,
            name: lessonData.studentName,
            photoUrl: lessonData.studentPhotoUrl, // если есть
            lessons: []
          };
        }
        studentsMap[lessonData.studentId].lessons?.push(lesson);
      });
      if(!environment.production) console.log('[DEBUG] Сгруппированные по студентам уроки:', studentsMap);
      
      // Для каждого студента ищем ближайшее будущее занятие
      const apiStudents = Object.values(studentsMap).map((student: Student) => {
        const futureLessons = student.lessons
          ?.map((l: unknown) => new Date((l as { scheduledAt: string }).scheduledAt))
          .filter((date: Date) => date > now)
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        if(!environment.production) console.log(`[DEBUG] Студент ${student.name} (${student.studentId}): futureLessons =`, futureLessons);
        return {
          ...student,
          nextLessonDate: futureLessons && futureLessons.length > 0 ? futureLessons[0] : null
        };
      });
      
      this.devLog('[OVERVIEW] refreshStudents - API students:', apiStudents);
      
      // Объединяем студентов из API с существующими (из localStorage)
      const existingIds = new Set(this.confirmedStudents.map(s => s.id));
      const newApiStudents = apiStudents.filter(s => !existingIds.has(s.id));
      
      this.devLog('[OVERVIEW] refreshStudents - new API students (not in localStorage):', newApiStudents);
      
      // Добавляем только новых студентов из API, не перезаписывая существующих
      this.confirmedStudents = [...this.confirmedStudents, ...newApiStudents];
      
      this.devLog('[OVERVIEW] refreshStudents - final confirmedStudents:', this.confirmedStudents);
      this.devLog('[OVERVIEW] refreshStudents - final confirmedStudents count:', this.confirmedStudents.length);
      
      if(!environment.production) console.log('[Overview] Обновлён список confirmedStudents:', this.confirmedStudents);
    });
  }

  respondToRequest(request: BookingRequest, accepted: boolean): void {
    const metadata = request.data;
    if (!metadata?.lessonId) {
      console.error('❌ Données de requête invalides (lessonId manquant)');
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

    const metadata = this.parseMetadata(this.selectedRequest.message || '');
    if (!metadata) return;

    this.lessonService.respondToBooking(metadata.lessonId, false, reason).subscribe(() => {
      if(!environment.production) console.log('📤 [OVERVIEW] Rejet envoyé avec raison:', reason);
      this.pendingRequests = this.pendingRequests.filter(r => r.id !== this.selectedRequest!.id);
      this.selectedRequest = null;
      this.showRefuseDialog = false;
      this.refreshConfirmedStudents();
      this.refreshStudents();
      this.snackBar.open('Студенту отправлено уведомление об отказе', 'OK', { duration: 3000 });
    });
  }

  private getCalendarColor(status: string): { primary: string, secondary: string } {
    switch (status) {
      case 'confirmed': 
        return { primary: '#4caf50', secondary: '#e8f5e9' }; // Зеленый
      case 'rejected': 
        return { primary: '#f44336', secondary: '#ffebee' }; // Красный
      case 'pending': 
        return { primary: '#ff9800', secondary: '#fff3e0' }; // Желтый/оранжевый
      case 'cancelled_by_student':
      case 'cancelled_by_student_no_refund':
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // Серый для отмененных
      case 'in_progress':
        return { primary: '#2196f3', secondary: '#e3f2fd' }; // Синий
      case 'completed':
        return { primary: '#9c27b0', secondary: '#f3e5f5' }; // Фиолетовый
      default: 
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // Серый
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

  // Методы для управления классом и приглашениями
  openInviteStudentDialog(): void {
    if(!environment.production) console.log('📧 Открытие диалога приглашения студента через платформу');
    
    // Реализация приглашения через платформу вместо email
    const inviteCode = this.generateInviteCode();
    const platformInviteLink = `${window.location.origin}/join-teacher/${this.authService.getCurrentUser()?.id}?code=${inviteCode}`;
    
    // Показываем ссылку пользователю для копирования
    const message = `Поделитесь этой ссылкой со студентами для присоединения к вашим урокам:\n\n${platformInviteLink}\n\nИли они могут ввести код приглашения: ${inviteCode}`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(platformInviteLink).then(() => {
        this.snackBar.open('✅ Ссылка приглашения скопирована в буфер обмена!', 'OK', { duration: 3000 });
        alert(message);
      }).catch(() => {
        alert(message);
      });
    } else {
      alert(message);
    }
  }

  addStudentToClass(student: Student): void {
    if(!environment.production) console.log('👥 Добавление студента в активный класс:', student);
    
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    
    // Загружаем классы преподавателя
    const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
    if (!savedClasses) {
      this.snackBar.open('Сначала создайте класс во вкладке "Classes"', 'OK', { duration: 3000 });
      return;
    }
    
    const classes = JSON.parse(savedClasses);
    const activeClass = classes.find((cls: TeacherClass) => cls.status === 'active');
    
    if (!activeClass) {
      this.snackBar.open('Нет активного класса. Создайте класс во вкладке "Classes"', 'OK', { duration: 3000 });
      return;
    }
    
    // Проверяем, есть ли уже студент в классе
    if (activeClass.students && activeClass.students.find((s: Student) => s.id === student.studentId || s.name === student.name)) {
      this.snackBar.open('Студент уже в классе', 'OK', { duration: 3000 });
      return;
    }
    
    // Добавляем студента в класс
    if (!activeClass.students) {
      activeClass.students = [];
    }
    
    activeClass.students.push({
      id: student.studentId || Date.now().toString(),
      name: student.name || student.metadata?.studentName || 'Unknown Student',
      addedAt: new Date().toISOString()
    });
    
    // Сохраняем обновленные классы
    localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(classes));
    
    this.snackBar.open(`✅ ${student.name || student.metadata?.studentName} добавлен в класс "${activeClass.name}"`, 'OK', { duration: 3000 });
  }

  isStudentInClass(student: Student): boolean {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return false;
    
    const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
    if (!savedClasses) return false;
    
    const classes = JSON.parse(savedClasses);
    const activeClass = classes.find((cls: TeacherClass) => cls.status === 'active');
    
    if (!activeClass || !activeClass.students) return false;
    
    return activeClass.students.some((s: Student) => 
      s.id === student.studentId || 
      s.name === student.name || 
      s.name === student.metadata?.studentName
    );
  }

  sendStudentInvitation(): void {
    if(!environment.production) console.log('📧 Отправка приглашения студенту:', this.inviteForm);
    
    if (!this.inviteForm.email || !this.inviteForm.level) {
      this.snackBar.open('Заполните обязательные поля', 'OK', { duration: 3000 });
      return;
    }

    // Реализация через платформу вместо email
    const inviteCode = this.generateInviteCode();
    const platformInviteLink = `${window.location.origin}/join-teacher/${this.authService.getCurrentUser()?.id}?code=${inviteCode}&level=${this.inviteForm.level}`;
    
    const message = `Приглашение отправлено! Поделитесь этой ссылкой с студентом:\n\n${platformInviteLink}\n\nКод приглашения: ${inviteCode}\nУровень: ${this.inviteForm.level}`;
    
    // Очищаем форму
    this.inviteForm = {
      email: '',
      level: '',
      message: '',
      examGoal: ''
    };

    this.snackBar.open('✅ Приглашение создано!', 'OK', { duration: 3000 });
    alert(message);
  }

  inviteStudentToClass(student: Student): void {
    if(!environment.production) console.log('👥 Приглашение студента в класс:', student);
    
    // Генерируем ссылку приглашения для конкретного студента
    const inviteCode = this.generateInviteCode();
    const studentInviteLink = `${window.location.origin}/join-teacher/${this.authService.getCurrentUser()?.id}?code=${inviteCode}&student=${student.metadata?.studentName || student.name}`;
    
    const message = `Приглашение для ${student.metadata?.studentName || student.name}!\n\nПоделитесь этой ссылкой со студентом для присоединения к вашим урокам:\n\n${studentInviteLink}\n\nКод приглашения: ${inviteCode}\n\nСтудент сможет подтвердить, что хочет стать вашим учеником.`;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(studentInviteLink).then(() => {
        this.snackBar.open('✅ Ссылка приглашения скопирована в буфер обмена!', 'OK', { duration: 3000 });
        alert(message);
      }).catch(() => {
        alert(message);
      });
    } else {
      alert(message);
    }
  }

  addStudentToSelectedClass(student: Student, classId: string): void {
    if(!environment.production) console.log('📨 Отправка приглашения студенту в класс:', student, classId);
    
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId || !classId) return;
    
    const targetClass = this.teacherClasses.find(cls => cls.id === classId);
    if (!targetClass) {
      this.snackBar.open('Класс не найден', 'OK', { duration: 3000 });
      return;
    }
    
    const studentId = student.studentId || student.id;
    if (!studentId) {
      this.snackBar.open('ID студента не найден', 'OK', { duration: 3000 });
      return;
    }
    
    // Проверяем, есть ли уже отправленное приглашение
    const invitationKey = `${studentId}_${classId}`;
    if (this.sentInvitations[invitationKey]) {
      this.snackBar.open('Приглашение уже отправлено', 'OK', { duration: 3000 });
      return;
    }
    
    // Подготавливаем данные класса для приглашения
    const classData = {
      id: targetClass.id,
      name: targetClass.name,
      level: targetClass.level,
      description: targetClass['description'] || `Classe de préparation à l'examen DELF niveau ${targetClass.level}`,
      teacherName: this.authService.getCurrentUser()?.name || 'Professeur'
    };

    // Создаем приглашение через API
    this.lessonService.createClassInvitation(classId, teacherId, studentId, `Приглашение в класс ${targetClass.name}`).subscribe({
      next: (invitation) => {
        this.devLog('[OVERVIEW] Приглашение создано/обновлено в базе данных:', invitation);
        
        // Всегда отправляем WebSocket уведомление (даже если студент офлайн)
        this.wsService.inviteToClass(studentId, teacherId, classData);
        
        // Сохраняем информацию об отправленном приглашении
        this.sentInvitations[invitationKey] = {
          studentId: studentId,
          classId: classId,
          status: 'sent'
        };
        
        // Сохраняем в localStorage
        localStorage.setItem(`sent_invitations_${teacherId}`, JSON.stringify(this.sentInvitations));
        
        // Обновляем статус студента в списке
        this.updateStudentInvitationStatus(student, classId, 'sent');
        
        // Показываем сообщение в зависимости от того, новая ли это запись
        const message = invitation.invitedAt && invitation.invitedAt.getTime() === invitation.addedAt.getTime() 
          ? `Приглашение отправлено студенту ${student.name}` 
          : `Приглашение повторно отправлено студенту ${student.name}`;
        
        this.snackBar.open(message, 'OK', { duration: 3000 });
      },
      error: (error) => {
        this.devLog('[OVERVIEW] Ошибка при создании приглашения:', error);
        this.snackBar.open('Ошибка при отправке приглашения', 'OK', { duration: 3000 });
      }
    });
    
    this.snackBar.open(`📨 Приглашение отправлено ${student.name || student.metadata?.studentName} в класс "${targetClass.name}"`, 'OK', { duration: 3000 });
  }

  getStudentCurrentClass(student: Student): string | null {
    const studentName = student.name || student.metadata?.studentName;
    
    for (const classe of this.teacherClasses) {
      if (classe.students && classe.students.find((s: Student) => 
        s.id === student.studentId || s.name === studentName)) {
        return classe.id;
      }
    }
    return null;
  }

  getStudentCurrentClassName(student: Student): string | null {
    const classId = this.getStudentCurrentClass(student);
    if (!classId) return null;
    
    const classe = this.teacherClasses.find(cls => cls.id === classId);
    return classe ? classe.name : null;
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  // Helper методы для доступа к свойствам teacher в шаблоне
  getTeacherPhotoUrl(): string {
    return (this.teacher as {photoUrl?: string})?.photoUrl || '';
  }

  getTeacherName(): string {
    return (this.teacher as {name?: string})?.name || '';
  }

  getTeacherSurname(): string {
    return (this.teacher as {surname?: string})?.surname || '';
  }

  getTeacherEmail(): string {
    return (this.teacher as {email?: string})?.email || '';
  }

  getTeacherBio(): string {
    return (this.teacher as {bio?: string})?.bio || '';
  }

  getTeacherSpecializations(): string[] {
    return (this.teacher as {specializations?: string[]})?.specializations || [];
  }

  getTeacherExperienceYears(): number {
    return (this.teacher as {experienceYears?: number})?.experienceYears || 0;
  }

  getTeacherPrice(): number {
    return (this.teacher as {price?: number})?.price || 0;
  }

  getTeacherRating(): number {
    return (this.teacher as {rating?: number})?.rating || 0;
  }

  getTeacherCertificates(): string[] {
    return (this.teacher as {certificates?: string[]})?.certificates || [];
  }

  getTeacherReviews(): any[] {
    return (this.teacherReviews as any[]) || [];
  }

  // Helper methods for profile safe access
  getProfilePhotoUrl(): string | null {
    return this.profile?.photo_url || null;
  }

  getProfileFullName(): string {
    return this.profile?.full_name || '';
  }

  /**
   * Добавить студента по email
   */
  addStudentByEmail(): void {
    console.log('🔥🔥🔥 addStudentByEmail method called!');
    console.log('🔥🔥🔥 Form valid:', this.addStudentForm.valid);
    console.log('🔥🔥🔥 Form value:', this.addStudentForm.value);
    
    if (this.addStudentForm.invalid) {
      console.log('🔥🔥🔥 Form is invalid, returning');
      this.devLog('[OVERVIEW] Form is invalid');
      return;
    }

    const email = this.addStudentForm.get('email')?.value;
    const teacherId = this.authService.getCurrentUser()?.id;

    if (!teacherId) {
      this.devLog('[OVERVIEW] No teacher ID found');
      this.snackBar.open('Erreur: Impossible de récupérer l\'ID du professeur', 'Fermer', { duration: 3000 });
      return;
    }

    this.isAddingStudent = true;
    this.devLog('[OVERVIEW] Adding student by email:', email, 'for teacher:', teacherId);

    // Сначала проверяем, существует ли студент
    this.lessonService.getStudentByEmail(email).subscribe({
      next: (response) => {
        this.devLog('[OVERVIEW] Student search response:', response);
        
        if (response && response.success && response.student) {
          // Студент найден, добавляем его в список как раньше
          this.addStudentToList(response.student, email);
        } else {
          this.isAddingStudent = false;
          const errorMessage = response?.message || 'Студент с таким email не найден';
          this.snackBar.open(errorMessage, 'Fermer', { duration: 3000 });
        }
      },
      error: (error) => {
        this.devLog('[OVERVIEW] Error finding student:', error);
        this.isAddingStudent = false;
        this.snackBar.open('Ошибка при поиске студента', 'Fermer', { duration: 3000 });
      }
    });
  }

  private devLog(message: string, ...args: any[]): void {
    // Временно всегда выводим логи для отладки
    console.log(message, ...args);
  }

  /**
   * Добавить студента в список (как раньше)
   */
  private addStudentToList(studentData: any, email: string): void {
    this.devLog('[OVERVIEW] Adding student to list:', studentData);
    this.devLog('[OVERVIEW] Current confirmedStudents before adding:', this.confirmedStudents);
    this.devLog('[OVERVIEW] Current confirmedStudents count before adding:', this.confirmedStudents.length);
    
    // Создаем объект студента для добавления в список
    const newStudent: Student = {
      id: studentData.id,
      studentId: studentData.id,
      name: studentData.name || email,
      email: email,
      photoUrl: '', // Если есть фото, можно добавить
      isStudent: true,
      nextLessonDate: null,
      // Добавляем метаданные для отображения
      metadata: {
        studentName: studentData.name || email
      }
    };

    this.devLog('[OVERVIEW] New student object created:', newStudent);

    // Добавляем студента в список подтвержденных студентов
    this.confirmedStudents.push(newStudent);
    
    this.devLog('[OVERVIEW] Student added to array. New confirmedStudents:', this.confirmedStudents);
    this.devLog('[OVERVIEW] New confirmedStudents count:', this.confirmedStudents.length);
    
    // Сохраняем в localStorage
    this.saveStudentsToStorage();
    
    this.isAddingStudent = false;
    this.addStudentForm.reset();
    
    this.snackBar.open(`✅ Студент ${studentData.name || email} добавлен в список`, 'Fermer', { duration: 3000 });
    
    this.devLog('[OVERVIEW] Student added to confirmedStudents:', this.confirmedStudents);
  }

  /**
   * Сохранить студентов в localStorage
   */
  private saveStudentsToStorage(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    this.devLog('[OVERVIEW] saveStudentsToStorage called with teacherId:', teacherId);
    this.devLog('[OVERVIEW] saveStudentsToStorage - confirmedStudents to save:', this.confirmedStudents);
    this.devLog('[OVERVIEW] saveStudentsToStorage - confirmedStudents count:', this.confirmedStudents.length);
    
    if (teacherId) {
      const dataToSave = JSON.stringify(this.confirmedStudents);
      this.devLog('[OVERVIEW] Data to save to localStorage:', dataToSave);
      
      localStorage.setItem(`teacher_students_${teacherId}`, dataToSave);
      
      // Проверяем, что данные действительно сохранились
      const savedData = localStorage.getItem(`teacher_students_${teacherId}`);
      this.devLog('[OVERVIEW] Verification - data read back from localStorage:', savedData);
      
      this.devLog('[OVERVIEW] Students saved to localStorage:', this.confirmedStudents);
    } else {
      this.devLog('[OVERVIEW] No teacherId found, cannot save to localStorage');
    }
  }

  /**
   * Загрузить студентов из localStorage
   */
  private loadStudentsFromStorage(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    this.devLog('[OVERVIEW] loadStudentsFromStorage called with teacherId:', teacherId);
    
    if (teacherId) {
      const stored = localStorage.getItem(`teacher_students_${teacherId}`);
      this.devLog('[OVERVIEW] Raw localStorage data:', stored);
      
      if (stored) {
        try {
          this.confirmedStudents = JSON.parse(stored);
          this.devLog('[OVERVIEW] Students loaded from localStorage:', this.confirmedStudents);
          this.devLog('[OVERVIEW] Number of students from localStorage:', this.confirmedStudents.length);
        } catch (error) {
          this.devLog('[OVERVIEW] Error parsing localStorage data:', error);
          this.confirmedStudents = [];
        }
      } else {
        this.devLog('[OVERVIEW] No data in localStorage for teacherId:', teacherId);
        this.confirmedStudents = [];
      }
    } else {
      this.devLog('[OVERVIEW] No teacherId found');
      this.confirmedStudents = [];
    }
  }

  /**
   * Обновить статус приглашения для студента
   */
  private updateStudentInvitationStatus(student: Student, classId: string, status: 'sent' | 'accepted' | 'declined'): void {
    const studentId = student.studentId || student.id;
    if (!studentId) return;

    // Обновляем статус в объекте студента
    if (!student.metadata) {
      student.metadata = {};
    }
    student.metadata.invitationStatus = status;
    student.metadata.invitationClassId = classId;

    // Сохраняем обновленный список студентов
    this.saveStudentsToStorage();
    
    this.devLog('[OVERVIEW] Updated student invitation status:', student.name, status);
  }

  // Отправка приглашения в класс студенту
  private sendClassInvitationToStudent(studentId: string, email: string, teacherId: string): void {
    // Создаем базовое приглашение (без конкретного класса)
    const classData = {
      id: 'general_invitation',
      name: 'Classe DELF/DALF',
      level: 'À déterminer',
      description: 'Invitation à rejoindre une classe de préparation DELF/DALF',
      teacherName: this.authService.getCurrentUser()?.name || 'Professeur'
    };

    // Отправляем WebSocket приглашение
    this.wsService.inviteToClass(studentId, teacherId, classData);
    
    // Сохраняем информацию об отправленном приглашении
    const invitationKey = `${studentId}_general`;
    this.sentInvitations[invitationKey] = {
      studentId: studentId,
      classId: 'general_invitation',
      status: 'sent'
    };
    
    // Сохраняем в localStorage
    localStorage.setItem(`sent_invitations_${teacherId}`, JSON.stringify(this.sentInvitations));
    
    this.snackBar.open(`📨 Приглашение отправлено на ${email}`, 'Fermer', { duration: 3000 });
    this.addStudentForm.reset();
  }

  testClick(): void {
    console.log('🔥🔥🔥🔥 BUTTON CLICKED!');
    console.log('🔥🔥🔥🔥 Form valid:', this.addStudentForm.valid);
    console.log('🔥🔥🔥🔥 Form value:', this.addStudentForm.value);
    this.addStudentByEmail();
  }

  // Проверка статуса приглашения для студента
  getStudentInvitationStatus(student: Student, classId?: string): 'none' | 'sent' | 'accepted' | 'declined' {
    const studentId = student.studentId || student.id;
    if (!studentId) return 'none';
    
    // Сначала проверяем статус в метаданных студента
    if (student.metadata?.invitationStatus) {
      return student.metadata.invitationStatus;
    }
    
    // Затем проверяем общее приглашение (по email)
    const generalInvitationKey = `${studentId}_general`;
    const generalInvitation = this.sentInvitations[generalInvitationKey];
    if (generalInvitation) {
      return generalInvitation.status;
    }
    
    // Затем проверяем приглашение в конкретный класс
    if (classId) {
      const invitationKey = `${studentId}_${classId}`;
      const invitation = this.sentInvitations[invitationKey];
      return invitation ? invitation.status : 'none';
    }
    
    return 'none';
  }

  // Получение текста статуса приглашения
  getInvitationStatusText(student: Student, classId?: string): string {
    const status = this.getStudentInvitationStatus(student, classId);
    
    switch (status) {
      case 'sent': return '📨 Запрос отправлен';
      case 'accepted': return '✅ Принято';
      case 'declined': return '❌ Отклонено';
      default: return '';
    }
  }

}
