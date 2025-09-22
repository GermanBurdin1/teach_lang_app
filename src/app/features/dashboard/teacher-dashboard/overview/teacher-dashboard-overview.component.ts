import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { TeacherProfile } from '../teacher-profile.model';
import { Review } from '../../shared/models/review.model';
import { MOCK_REVIEWS } from '../mock-reviews';
import { AuthService } from '../../../../services/auth.service';
import { ProfilesApiService } from '../../../../services/profiles-api.service';
import { MatDialog } from '@angular/material/dialog';
import { CalendarEvent } from 'angular-calendar';
import { LessonService } from '../../../../services/lesson.service';
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

    const teacherId = this.authService.getCurrentUser()?.id;
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

    this.refreshStudents();
    this.loadTeacherClasses();
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
    const teacherId = this.authService.getCurrentUser()?.id;
    if (teacherId) {
      if(!environment.production) console.log('[OVERVIEW] Обновляем подтверждённых студентов для teacherId:', teacherId);
      this.lessonService.getConfirmedStudentsForTeacher(teacherId).subscribe((students: unknown[]) => {
        this.confirmedStudents = students.map(s => {
          const student = s as {id?: string, [key: string]: unknown};
          return {...student, id: student.id || ''} as Student;
        });
        if(!environment.production) console.log('[OVERVIEW] confirmedStudents (refresh):', students);
      });
    }
  }

  private refreshStudents(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
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
      this.confirmedStudents = Object.values(studentsMap).map((student: Student) => {
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
    if(!environment.production) console.log('👥 Добавление студента в выбранный класс:', student, classId);
    
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId || !classId) return;
    
    const targetClass = this.teacherClasses.find(cls => cls.id === classId);
    if (!targetClass) {
      this.snackBar.open('Класс не найден', 'OK', { duration: 3000 });
      return;
    }
    
    // Проверяем, есть ли уже студент в классе
    if (targetClass.students && targetClass.students.find((s: Student) => 
      s.id === student.studentId || s.name === student.name)) {
      this.snackBar.open('Студент уже в этом классе', 'OK', { duration: 3000 });
      return;
    }
    
    // Удаляем студента из других классов
    this.teacherClasses.forEach(cls => {
      if (cls.students) {
        cls.students = cls.students.filter((s: Student) => 
          s.id !== student.studentId && s.name !== student.name);
      }
    });
    
    // Добавляем студента в выбранный класс
    if (!targetClass.students) {
      targetClass.students = [];
    }
    
    targetClass.students.push({
      id: student.studentId || Date.now().toString(),
      name: student.name || student.metadata?.studentName || 'Unknown Student',
      addedAt: new Date().toISOString()
    });
    
    // Сохраняем изменения
    localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(this.teacherClasses));
    
    this.snackBar.open(`✅ ${student.name || student.metadata?.studentName} добавлен в класс "${targetClass.name}"`, 'OK', { duration: 3000 });
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
    if (this.addStudentForm.invalid) {
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

    this.lessonService.addStudentByEmail(email, teacherId).subscribe({
      next: (result) => {
        this.devLog('[OVERVIEW] Add student result:', result);
        this.isAddingStudent = false;

        if (result.success) {
          this.snackBar.open(result.message, 'Fermer', { duration: 3000 });
          this.addStudentForm.reset();
          // Обновляем список студентов
          this.refreshConfirmedStudents();
        } else {
          this.snackBar.open(result.message, 'Fermer', { duration: 3000 });
        }
      },
      error: (error) => {
        this.devLog('[OVERVIEW] Error adding student:', error);
        this.isAddingStudent = false;
        this.snackBar.open('Erreur lors de l\'ajout de l\'étudiant', 'Fermer', { duration: 3000 });
      }
    });
  }

  private devLog(message: string, ...args: any[]): void {
    if (!environment.production) {
      console.log(message, ...args);
    }
  }

}
