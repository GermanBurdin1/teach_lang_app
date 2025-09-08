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
import { environment } from '../environment.prod';


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

  teacher: any = null;
  teacherReviews: any[] = [];
  showPublicProfilePreview = false;

  // Управление классом и приглашениями
  hasActiveClass = true; // Временно установим true для демонстрации
  teacherClasses: any[] = []; // Список всех классов преподавателя
  inviteForm = {
    email: '',
    level: '',
    message: '',
    examGoal: ''
  };

  ngOnInit(): void {
    const stored = localStorage.getItem('teacher_reviews');
    this.reviews = stored ? JSON.parse(stored) : MOCK_REVIEWS;

    const teacherId = this.authService.getCurrentUser()?.id;
    if (teacherId) {
      // Загружаем все подтверждённые занятия для календаря с цветовой индикацией
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

      // Загружаем заявки (demandes) как в teacher-home.component
      this.notificationService.getNotificationsForUser(teacherId).subscribe({
        next: (all: any[]) => {
          this.pendingRequests = all.filter((n: any) => n.type === 'booking_request' && n.status === 'pending');
          this.treatedRequests = all.filter((n: any) => n.type === 'booking_request' && n.status !== 'pending');
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
      if(!environment.production) console.log('[OVERVIEW] Обновляем подтверждённых студентов для teacherId:', teacherId);
      this.lessonService.getConfirmedStudentsForTeacher(teacherId).subscribe(students => {
        this.confirmedStudents = students;
        if(!environment.production) console.log('[OVERVIEW] confirmedStudents (refresh):', students);
      });
    }
  }

  private refreshStudents(): void {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return;
    this.lessonService.getAllConfirmedLessonsForTeacher(teacherId).subscribe(lessons => {
      const now = new Date();
      if(!environment.production) console.log('[DEBUG] Загруженные уроки для учителя:', lessons);
      // Группируем занятия по studentId
      const studentsMap: { [studentId: string]: any } = {};
      lessons.forEach((lesson: any) => {
        if (!studentsMap[lesson.studentId]) {
          studentsMap[lesson.studentId] = {
            studentId: lesson.studentId,
            name: lesson.studentName,
            photoUrl: lesson.studentPhotoUrl, // если есть
            lessons: []
          };
        }
        studentsMap[lesson.studentId].lessons.push(lesson);
      });
      if(!environment.production) console.log('[DEBUG] Сгруппированные по студентам уроки:', studentsMap);
      // Для каждого студента ищем ближайшее будущее занятие
      this.confirmedStudents = Object.values(studentsMap).map((student: any) => {
        const futureLessons = student.lessons
          .map((l: any) => new Date(l.scheduledAt))
          .filter((date: Date) => date > now)
          .sort((a: Date, b: Date) => a.getTime() - b.getTime());
        if(!environment.production) console.log(`[DEBUG] Студент ${student.name} (${student.studentId}): futureLessons =`, futureLessons);
        return {
          ...student,
          nextLessonDate: futureLessons.length > 0 ? futureLessons[0] : null
        };
      });
      if(!environment.production) console.log('[Overview] Обновлён список confirmedStudents:', this.confirmedStudents);
    });
  }

  respondToRequest(request: any, accepted: boolean): void {
    const metadata = (request as any).data;
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

    const metadata = this.parseMetadata(this.selectedRequest.message);
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

  addStudentToClass(student: any): void {
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
    const activeClass = classes.find((cls: any) => cls.status === 'active');
    
    if (!activeClass) {
      this.snackBar.open('Нет активного класса. Создайте класс во вкладке "Classes"', 'OK', { duration: 3000 });
      return;
    }
    
    // Проверяем, есть ли уже студент в классе
    if (activeClass.students && activeClass.students.find((s: any) => s.id === student.studentId || s.name === student.name)) {
      this.snackBar.open('Студент уже в классе', 'OK', { duration: 3000 });
      return;
    }
    
    // Добавляем студента в класс
    if (!activeClass.students) {
      activeClass.students = [];
    }
    
    activeClass.students.push({
      id: student.studentId || Date.now().toString(),
      name: student.name || student.metadata?.studentName,
      addedAt: new Date().toISOString()
    });
    
    // Сохраняем обновленные классы
    localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(classes));
    
    this.snackBar.open(`✅ ${student.name || student.metadata?.studentName} добавлен в класс "${activeClass.name}"`, 'OK', { duration: 3000 });
  }

  isStudentInClass(student: any): boolean {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId) return false;
    
    const savedClasses = localStorage.getItem(`teacher_classes_${teacherId}`);
    if (!savedClasses) return false;
    
    const classes = JSON.parse(savedClasses);
    const activeClass = classes.find((cls: any) => cls.status === 'active');
    
    if (!activeClass || !activeClass.students) return false;
    
    return activeClass.students.some((s: any) => 
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

  inviteStudentToClass(student: any): void {
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

  addStudentToSelectedClass(student: any, classId: string): void {
    if(!environment.production) console.log('👥 Добавление студента в выбранный класс:', student, classId);
    
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId || !classId) return;
    
    const targetClass = this.teacherClasses.find(cls => cls.id === classId);
    if (!targetClass) {
      this.snackBar.open('Класс не найден', 'OK', { duration: 3000 });
      return;
    }
    
    // Проверяем, есть ли уже студент в классе
    if (targetClass.students && targetClass.students.find((s: any) => 
      s.id === student.studentId || s.name === student.name)) {
      this.snackBar.open('Студент уже в этом классе', 'OK', { duration: 3000 });
      return;
    }
    
    // Удаляем студента из других классов
    this.teacherClasses.forEach(cls => {
      if (cls.students) {
        cls.students = cls.students.filter((s: any) => 
          s.id !== student.studentId && s.name !== student.name);
      }
    });
    
    // Добавляем студента в выбранный класс
    if (!targetClass.students) {
      targetClass.students = [];
    }
    
    targetClass.students.push({
      id: student.studentId || Date.now().toString(),
      name: student.name || student.metadata?.studentName,
      addedAt: new Date().toISOString()
    });
    
    // Сохраняем изменения
    localStorage.setItem(`teacher_classes_${teacherId}`, JSON.stringify(this.teacherClasses));
    
    this.snackBar.open(`✅ ${student.name || student.metadata?.studentName} добавлен в класс "${targetClass.name}"`, 'OK', { duration: 3000 });
  }

  getStudentCurrentClass(student: any): string | null {
    const studentName = student.name || student.metadata?.studentName;
    
    for (const classe of this.teacherClasses) {
      if (classe.students && classe.students.find((s: any) => 
        s.id === student.studentId || s.name === studentName)) {
        return classe.id;
      }
    }
    return null;
  }

  getStudentCurrentClassName(student: any): string | null {
    const classId = this.getStudentCurrentClass(student);
    if (!classId) return null;
    
    const classe = this.teacherClasses.find(cls => cls.id === classId);
    return classe ? classe.name : null;
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

}
