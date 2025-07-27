import { Component, OnInit } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { NotificationService } from '../../../../services/notifications.service';
import { NotificationService as MatNotificationService } from '../../../../services/notification.service';
import { AuthService } from '../../../../services/auth.service';
import { LessonSession } from '../../../../models/lesson-session.model';
import { LessonService } from '../../../../services/lesson.service';
import { GoalsService } from '../../../../services/goals.service';
import { StudentGoal, ExamLevel, CreateGoalDto } from '../../../../models/student-goal.model';
import { Router } from '@angular/router';
import { VideoCallService } from '../../../../services/video-call.service';
import { TeacherService } from '../../../../services/teacher.service';
import { HomeworkService, Homework } from '../../../../services/homework.service';
import { LessonTabsService } from '../../../../services/lesson-tabs.service';
import { MaterialService } from '../../../../services/material.service';
import { StatisticsService, StudentStats } from '../../../../services/statistics.service';
import { LexiconService } from '../../../../services/lexicon.service';

@Component({
  selector: 'app-student-home',
  templateUrl: './student-home.component.html',
  styleUrls: ['./student-home.component.css']
})
export class StudentHomeComponent implements OnInit {
  goal = 'DALF C1 avant le 15 juillet 2025';
  
  // Propriétés pour les objectifs
  currentGoal: StudentGoal | null = null;
  showGoalModal = false;
  availableExamLevels: ExamLevel[] = [];
  selectedExamLevel: ExamLevel | null = null;
  selectedTargetDate: Date | null = null;
  goalDescription: string = '';
  loadingGoals = false;

  stats: StudentStats = {
    daysActive: 0,
    lessonsCompleted: 0,
    wordsLearned: 0
  };
  
  loadingStats = false;

  selectedLesson: CalendarEvent | null = null;
  showModal = false;
  upcomingLessons: CalendarEvent[] = [];
  selectedNewDate: Date | null = null;
  showRescheduleModal = false;
  rescheduleConfirmed = false;
  now = new Date();
  cancelReason: string | null = null;
  showModifyModal = false;
  actionType: 'reschedule' | 'cancel' | null = null;
  customCancelReason: string = '';
  notifications: any[] = [];
  selectedDateOnly: Date | null = null;
  selectedTimeOnly: string = '';

  // Nouvelles propriétés pour la gestion des notifications
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 5;

  studentHomework: Homework[] = [];

  notificationsCollapsed = false;
  goalCollapsed = false;
  statsCollapsed = false;
  homeworkCollapsed = false;

  constructor(
    private notificationService: NotificationService,
    private matNotificationService: MatNotificationService,
    private authService: AuthService,
    private lessonService: LessonService,
    private goalsService: GoalsService,
    private router: Router,
    private videoCallService: VideoCallService,
    private teacherService: TeacherService,
    private homeworkService: HomeworkService,
    private lessonTabsService: LessonTabsService,
    private materialService: MaterialService,
    private statisticsService: StatisticsService,
    private lexiconService: LexiconService
  ) { }

  ngOnInit(): void {
    // Met à jour l'heure chaque minute
    setInterval(() => {
      this.now = new Date();
    }, 60000);

    // Vérifie l'authentification
    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.id;
    
    console.log('[StudentHome] ngOnInit appelé, utilisateur courant:', currentUser, 'studentId:', studentId);
    
    if (!studentId) {
      console.warn('[StudentHome] Aucun studentId disponible, en attente d\'authentification...');
      // On réessaie dans une seconde
      setTimeout(() => {
        const retryUser = this.authService.getCurrentUser();
        const retryStudentId = retryUser?.id;
        if (retryStudentId) {
          console.log('[StudentHome] Utilisateur chargé lors du retry:', retryUser);
          this.initializeComponent(retryStudentId);
        } else {
          console.error('[StudentHome] Toujours pas d\'utilisateur après retry');
        }
      }, 1000);
      return;
    }

    this.initializeComponent(studentId);
  }

  private initializeComponent(studentId: string): void {
    console.log('[StudentHome] Initialisation avec studentId:', studentId);

    // Enregistre la connexion de l'utilisateur pour les stats de jours actifs
    this.statisticsService.recordUserLogin(studentId).subscribe({
      next: () => console.log('[StudentHome] Connexion utilisateur enregistrée'),
      error: (err) => console.error('[StudentHome] Échec de l\'enregistrement de la connexion:', err)
    });

    // Charge les objectifs de l'étudiant
    this.loadStudentGoal(studentId);
    this.loadAvailableExamLevels();
    
    // Charge les stats de l'étudiant
    this.loadStudentStats(studentId);

    this.notificationService.getNotificationsForUser(studentId).subscribe(res => {
      console.log('[StudentHomeComponent] Notifications brutes du backend:', res);
      this.notifications = res
        .filter(n => n.type === 'booking_response' || n.type === 'booking_proposal')
        .map((n: any) => {
          if (n.type === 'booking_proposal') {
            console.log('[StudentHomeComponent] Traitement de booking_proposal:', n);
            const teacherName = n.data?.teacherName;
            const displayText = teacherName 
              ? `Votre professeur ${teacherName} vous propose ${n.data?.proposedTime ? (new Date(n.data.proposedTime)).toLocaleString('fr-FR') : ''}` 
              : `Le professeur vous propose ${n.data?.proposedTime ? (new Date(n.data.proposedTime)).toLocaleString('fr-FR') : ''}`;
              
            return {
              text: displayText,
              type: n.type,
              lessonId: n.data?.lessonId,
              proposedTime: n.data?.proposedTime,
              teacherId: n.data?.teacherId,
              teacherName: n.data?.teacherName || '',
              accepted: n.data?.accepted || false,
              refused: n.data?.refused || false,
              notification: n
            };
          }
          return {
            text: `${n.title}: ${n.message}`,
            type: n.type,
            teacherId: n.data?.teacherId,
            teacherName: n.data?.teacherName || '',
            notification: n
          };
        });
      console.log('[StudentHomeComponent] notifications pour le template:', this.notifications);
    });

    // ==================== ЗАГРУЗКА ВСЕХ ЗАЯВОК ДЛЯ КАЛЕНДАРЯ ====================
    this.loadAllLessonsForCalendar(studentId);

    // Charge les devoirs réels
    this.homeworkService.getHomeworkForStudent(studentId).subscribe({
      next: (homework) => {
        // Filtrage des devoirs non terminés pour l'affichage dans "Devoirs à faire"
        this.studentHomework = homework.filter(hw => 
          hw.status !== 'completed' && 
          hw.status !== 'submitted' && 
          hw.status !== 'finished'  // on ajoute le filtre pour le statut 'finished'
        );
        console.log('[StudentHome] Devoirs non terminés chargés:', this.studentHomework);
      },
      error: (err) => {
        console.error('[StudentHome] Erreur de chargement des devoirs:', err);
        this.studentHomework = [];
      }
    });

    // S'abonne aux mises à jour des devoirs
    this.homeworkService.onHomeworkUpdated().subscribe(() => {
      console.log('[StudentHome] Notification de mise à jour des devoirs reçue');
      this.refreshHomework(studentId);
    });
  }

  onLessonClick(event: CalendarEvent): void {
    // Si le cours est confirmé, va à lesson-management
    if (event.meta?.status === 'confirmed' && event.meta?.lessonId) {
      this.router.navigate(['/lessons/student'], { 
        queryParams: { 
          lessonId: event.meta.lessonId,
          tab: 'upcoming' 
        } 
      });
      return;
    }
    
    // Pour les autres statuts, affiche la modale avec les détails
    this.selectedLesson = event;
    this.now = new Date(); // on met à jour le moment actuel
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedLesson = null;
  }

  openRescheduleModal(): void {
    this.showModal = false;
    this.showRescheduleModal = true;
  }

  closeRescheduleModal(): void {
    this.showRescheduleModal = false;
    this.selectedNewDate = null;
  }

  confirmReschedule(): void {
    if (this.selectedNewDate) {
      // здесь можно отправить запрос на бэкенд
      console.log('Replanification demandée:', this.selectedNewDate);
      this.showRescheduleModal = false;
      this.selectedNewDate = null;
      this.rescheduleConfirmed = true;
    }
  }

  canReschedule(): boolean {
    return !!this.selectedLesson?.end && this.selectedLesson.end >= this.now;
  }

  openModifyModal(): void {
    this.showModal = false;
    this.showModifyModal = true;
    this.actionType = null;
    this.cancelReason = null;
    this.selectedDateOnly = null;
    this.selectedTimeOnly = '';
  }

  closeModifyModal(): void {
    this.showModifyModal = false;
    this.selectedNewDate = null;
    this.cancelReason = null;
    this.actionType = null;
    this.selectedDateOnly = null;
    this.selectedTimeOnly = '';
  }

  submitModification(): void {
    if (this.actionType === 'reschedule' && this.selectedDateOnly && this.selectedTimeOnly) {
      const [hours, minutes] = this.selectedTimeOnly.split(':').map(Number);
      const newDate = new Date(this.selectedDateOnly);
      newDate.setHours(hours, minutes);
      
      // Here you would typically call your service to update the lesson
      console.log('Rescheduling to:', newDate);
      this.rescheduleConfirmed = true;
      this.closeModifyModal();
    } else if (this.actionType === 'cancel') {
      const reason = this.cancelReason === 'autre' ? this.customCancelReason : this.cancelReason;
      if (!reason || !this.selectedLesson?.meta?.lessonId) {
        console.error('Raison manquante ou ID de cours manquant');
        return;
      }
      this.cancelLesson(this.selectedLesson.meta.lessonId, reason);
    }
  }

  canCancelLesson(): boolean {
    if (!this.selectedLesson?.start || !this.selectedLesson?.meta?.status) {
      return false;
    }

    // Peut annuler seulement les cours confirmés
    if (this.selectedLesson.meta.status !== 'confirmed') {
      return false;
    }

    // Vérifie que le cours est dans le futur
    return this.selectedLesson.start > this.now;
  }

  isCancellationTooLate(): boolean {
    if (!this.selectedLesson?.start) {
      return false;
    }

    const now = new Date();
    const twoHoursBeforeLesson = new Date(this.selectedLesson.start.getTime() - 2 * 60 * 60 * 1000);
    return now > twoHoursBeforeLesson;
  }

  cancelLesson(lessonId: string, reason: string): void {
    // Mock pour tester
    if (lessonId.startsWith('mock-lesson-')) {
      // Mock implementation for testing
      const isWithinTwoHours = this.isCancellationTooLate();
      const mockResponse = {
        success: true,
        status: isWithinTwoHours ? 'cancelled_by_student_no_refund' : 'cancelled_by_student',
        refundAvailable: !isWithinTwoHours,
        message: isWithinTwoHours 
          ? 'Cours annulé. Comme l\'annulation a eu lieu moins de 2 heures avant le début, aucun remboursement ne sera effectué.'
          : 'Cours annulé. Le remboursement sera effectué dans un délai de 3-5 jours ouvrés.'
      };
      
      setTimeout(() => {
        console.log('[MOCK] Cours annulé:', mockResponse);
        this.matNotificationService.info(mockResponse.message);
        
        // Supprime le cours du calendrier
        this.upcomingLessons = this.upcomingLessons.filter(
          lesson => lesson.meta?.lessonId !== lessonId
        );
        
        this.closeModifyModal();
      }, 500); // Имитируем задержку API
      
      return;
    }

    // Appel API réel
    this.lessonService.cancelLesson(lessonId, reason).subscribe({
      next: (response) => {
        console.log('✅ Урок отменен:', response);
        
        // Affiche le message à l'utilisateur
        this.matNotificationService.success(response.message || 'Урок успешно отменен');
        
        // Met à jour le calendrier
        const studentId = this.authService.getCurrentUser()?.id;
        if (studentId) {
          this.lessonService.getConfirmedLessons(studentId).subscribe(lessons => {
            this.upcomingLessons = lessons.map(lesson => ({
              start: new Date(lesson.scheduledAt),
              end: new Date(new Date(lesson.scheduledAt).getTime() + 60 * 60 * 1000),
              title: `Cours avec ${lesson.teacherName}`,
              color: { primary: '#3f51b5', secondary: '#e8eaf6' },
              allDay: false,
              meta: { 
                lessonId: lesson.id, 
                status: lesson.status,
                teacherId: lesson.teacherId,
                teacherName: lesson.teacherName
              }
            }));
          });
        }
        
        this.closeModifyModal();
      },
      error: (error) => {
        console.error('❌ Ошибка при отмене урока:', error);
        this.matNotificationService.error('Erreur lors de l\'annulation du cours: ' + (error.error?.message || error.message));
      }
    });
  }

  onBackFromModify(): void {
    this.closeModifyModal();
    this.showModal = true;
  }

  mapSessionsToEvents(sessions: LessonSession[]): CalendarEvent[] {
    return sessions.map(session => {
      let color;
      switch (session.status) {
        case 'confirmed':
          color = { primary: '#4caf50', secondary: '#e8f5e9' }; // зелёный
          break;
        case 'declined':
          color = { primary: '#f44336', secondary: '#ffebee' }; // красный
          break;
        case 'pending':
        default:
          color = { primary: '#9e9e9e', secondary: '#f5f5f5' }; // серый
          break;
      }

      return {
        start: new Date(session.start),
        end: new Date(session.end),
        title: session.title,
        color,
        meta: { sessionId: session.id, status: session.status }
      };
    });
  }

  makeProfesseurLink(text: string, teacherId: string, teacherName?: string): string {
    // Remplace 'Le professeur' ou 'Votre professeur NOM' par un lien
    const displayName = teacherName ? `Votre professeur ${teacherName}` : 'Votre professeur';
    const link = `<a href="/student/teachers/${teacherId}" title="voir l'information" style="text-decoration: underline; cursor: pointer;">${displayName}</a>`;
    
    // D'abord, remplace la correspondance complète
    if (teacherName) {
      const fullMatch = `Votre professeur ${teacherName}`;
      if (text.includes(fullMatch)) {
        return text.replace(fullMatch, link);
      }
    }
    
    // Puis remplace les variantes de base
    return text.replace('Votre professeur', link).replace('Le professeur', link);
  }

  acceptProposal(notif: any) {
    console.log('[acceptProposal] notif:', notif);
    this.lessonService.studentRespondToProposal({
      lessonId: notif.lessonId,
      accepted: true
    }).subscribe((res) => {
      console.log('[acceptProposal] ответ от сервера:', res);
      notif.accepted = true;
      notif.refused = false;
      // Ne pas appeler ngOnInit pour effet instantané
    });
  }

  refuseProposal(notif: any) {
    this.lessonService.studentRespondToProposal({
      lessonId: notif.lessonId,
      accepted: false
    }).subscribe((res) => {
      console.log('[refuseProposal] ответ от сервера:', res);
      notif.accepted = false;
      notif.refused = true;
      // Ne pas appeler ngOnInit pour effet instantané
    });
  }

  hideNotification(notification: any) {
    if (notification.notification?.id) {
      this.notificationService.hideNotification(notification.notification.id).subscribe(() => {
        // Supprime la notification du tableau local
        this.notifications = this.notifications.filter(n => n.notification?.id !== notification.notification.id);
      });
    }
  }

  get visibleNotifications() {
    return this.showMoreNotifications 
      ? this.notifications 
      : this.notifications.slice(0, this.MAX_NOTIFICATIONS);
  }

  get hasMoreNotifications() {
    return this.notifications.length > this.MAX_NOTIFICATIONS;
  }

  toggleShowMore() {
    this.showMoreNotifications = !this.showMoreNotifications;
  }

  // ==================== ЗАГРУЗКА ВСЕХ ЗАЯВОК ДЛЯ КАЛЕНДАРЯ ====================
  
  private loadAllLessonsForCalendar(studentId: string): void {
    // Charge toutes les demandes envoyées par l'étudiant pour le calendrier
    this.lessonService.getStudentSentRequests(studentId).subscribe(requests => {
      console.log('📅 Charge toutes les demandes pour le calendrier:', requests);
      
      this.upcomingLessons = requests.map(request => {
        const lessonTime = new Date(request.scheduledAt);
        const endTime = new Date(lessonTime.getTime() + 60 * 60 * 1000);
        
        return {
          start: lessonTime,
          end: endTime,
          title: `${this.getStatusIcon(request.status)} ${request.teacherName}`,
          color: this.getCalendarColor(request.status),
          allDay: false,
          meta: { 
            lessonId: request.lessonId, 
            status: request.status,
            teacherId: request.teacherId,
            teacherName: request.teacherName,
            createdAt: request.createdAt,
            proposedTime: request.proposedTime,
            studentConfirmed: request.studentConfirmed,
            studentRefused: request.studentRefused
          }
        };
      });
      
      console.log('📅 Календарь обновлен:', this.upcomingLessons);
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



  // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С ЦЕЛЯМИ ====================

  private loadStudentGoal(studentId: string): void {
    this.loadingGoals = true;
    this.goalsService.getActiveGoal(studentId).subscribe({
      next: (goal) => {
        this.currentGoal = goal;
        if (goal) {
          this.goal = `${this.goalsService.getExamLevelDisplayName(goal.examLevel)}${goal.targetDate ? ' avant le ' + new Date(goal.targetDate).toLocaleDateString('fr-FR') : ''}`;
        }
        this.loadingGoals = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la cible:', error);
        this.loadingGoals = false;
      }
    });
  }

  private loadAvailableExamLevels(): void {
    this.goalsService.getAvailableExamLevels().subscribe({
      next: (response) => {
        this.availableExamLevels = response.levels;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des niveaux d\'examen:', error);
      }
    });
  }

  openGoalModal(): void {
    if (this.currentGoal) {
      this.selectedExamLevel = this.currentGoal.examLevel;
      this.selectedTargetDate = this.currentGoal.targetDate ? new Date(this.currentGoal.targetDate) : null;
      this.goalDescription = this.currentGoal.description || '';
    } else {
      this.selectedExamLevel = null;
      this.selectedTargetDate = null;
      this.goalDescription = '';
    }
    this.showGoalModal = true;
  }

  closeGoalModal(): void {
    this.showGoalModal = false;
    this.selectedExamLevel = null;
    this.selectedTargetDate = null;
    this.goalDescription = '';
  }

  saveGoal(): void {
    if (!this.selectedExamLevel) {
      console.error('Niveau d\'examen requis');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    const studentId = currentUser?.id;
    
    if (!studentId) {
      console.error('Student ID not found');
      return;
    }

    const goalData: CreateGoalDto & { studentId: string } = {
      examLevel: this.selectedExamLevel,
      targetDate: this.selectedTargetDate ? this.selectedTargetDate.toISOString() : undefined,
      description: this.goalDescription.trim() || undefined,
      studentId: studentId
    };

    this.loadingGoals = true;
    this.goalsService.createGoal(goalData).subscribe({
      next: (newGoal) => {
        this.currentGoal = newGoal;
        this.goal = `${this.goalsService.getExamLevelDisplayName(newGoal.examLevel)}${newGoal.targetDate ? ' avant le ' + new Date(newGoal.targetDate).toLocaleDateString('fr-FR') : ''}`;
        this.closeGoalModal();
        this.loadingGoals = false;
        console.log('Objectif sauvegardé avec succès:', newGoal);
      },
      error: (error) => {
        console.error('Erreur lors de la sauvegarde de l\'objectif:', error);
        this.loadingGoals = false;
      }
    });
  }

  getExamLevelDisplayName(level: ExamLevel): string {
    return this.goalsService.getExamLevelDisplayName(level);
  }

  // Obtenir le prochain cours
  getNextLesson(): CalendarEvent | null {
    const now = new Date();
    const confirmedLessons = this.upcomingLessons.filter(lesson => 
      lesson.meta?.status === 'confirmed' && 
      lesson.start > now
    );
    
    if (confirmedLessons.length === 0) return null;
    
    return confirmedLessons.sort((a, b) => 
      a.start.getTime() - b.start.getTime()
    )[0];
  }

  // Vérifie si on peut entrer en classe (le jour du cours)
  canEnterClass(event: CalendarEvent): boolean {
    const status = event.meta?.status;
    if (status === 'confirmed') {
      // Старое поведение: только в день урока
      const now = new Date();
      const lessonTime = event.start;
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lessonDate = new Date(lessonTime.getFullYear(), lessonTime.getMonth(), lessonTime.getDate());
      return nowDate.getTime() === lessonDate.getTime();
    }
    // Новое: разрешить вход только если статус in_progress
    return status === 'in_progress';
  }

  // Entrée dans la classe virtuelle
  async enterVirtualClass(event: CalendarEvent): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId || !event.meta?.lessonId) return;

    // Устанавливаем данные урока в VideoCallService
    this.videoCallService.setLessonData(event.meta.lessonId, currentUserId);

    // Charge les tâches, questions et matériaux pour le cours
    const [tasks, questions, materials] = await Promise.all([
      this.lessonService.getTasksForLesson(event.meta.lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(event.meta.lessonId).toPromise(),
      this.getMaterialsForLesson(event.meta.lessonId)
    ]);

    // Sépare les tâches et questions par rôle
    const studentTasks = (tasks || []).filter((t: any) => t.createdByRole === 'student').map((t: any) => ({ id: t.id, title: t.title }));
    const teacherTasks = (tasks || []).filter((t: any) => t.createdByRole === 'teacher').map((t: any) => ({ id: t.id, title: t.title }));
    const studentQuestions = (questions || []).filter((q: any) => q.createdByRole === 'student').map((q: any) => ({ id: q.id, question: q.question }));
    const teacherQuestions = (questions || []).filter((q: any) => q.createdByRole === 'teacher').map((q: any) => ({ id: q.id, question: q.question }));

    console.log('✅ [StudentHome] Данные урока подготовлены:', {
      studentTasks,
      teacherTasks,
      studentQuestions,
      teacherQuestions,
      materials: materials.length
    });

    this.lessonTabsService.setCurrentLessonData({
      id: event.meta.lessonId,
      date: event.start,
      teacherTasks: teacherTasks,
      studentTasks: studentTasks,
      studentQuestions: studentQuestions,
      teacherQuestions: teacherQuestions,
      materials: materials,
      texts: materials.filter((m: any) => m.type === 'text'),
      audios: materials.filter((m: any) => m.type === 'audio'),
      videos: materials.filter((m: any) => m.type === 'video'),
      homework: []
    });

    this.router.navigate([`/classroom/${event.meta.lessonId}/lesson`], {
      queryParams: { startCall: true }
    });
  }

  // Obtenir le nombre de minutes avant le cours
  getMinutesUntilLesson(event: CalendarEvent): number {
    if (!event.start) return 0;
    const diffMs = event.start.getTime() - this.now.getTime();
    return Math.floor(diffMs / (1000 * 60));
  }

  // Méthodes pour les devoirs
  goToHomeworkDetails(homework: Homework): void {
    // Переход в TrainingComponent на вкладку домашних заданий
    this.router.navigate(['/student/trainer'], { 
      queryParams: { 
        tab: 'homework',
        homeworkId: homework.id 
      } 
    });
  }

  isHomeworkOverdue(homework: Homework): boolean {
    if (!homework.dueDate) return false;
    const now = new Date();
    const dueDate = new Date(homework.dueDate);
    return now > dueDate && (homework.status === 'unfinished' || homework.status === 'assigned');
  }

  private async getMaterialsForLesson(lessonId: string): Promise<any[]> {
    try {
      console.log('🔍 [StudentHome] Загружаем материалы для урока:', lessonId);
      const allMaterials = await this.materialService.getMaterials().toPromise();
      console.log('📦 [StudentHome] Все материалы получены:', allMaterials);
      
      if (!allMaterials || allMaterials.length === 0) {
        console.warn('[StudentHome] Matériaux non trouvés ou liste vide. Le file-service est-il lancé ?');
        return [];
      }
      
      const filteredMaterials = allMaterials.filter(material => {
        const isAttached = material.attachedLessons && material.attachedLessons.includes(lessonId);
        return isAttached;
      });
      
      console.log('[StudentHome] Matériaux filtrés pour le cours:', filteredMaterials);
      return filteredMaterials;
    } catch (error) {
      console.error('[StudentHome] Erreur de chargement des matériaux pour le cours:', error);
      return [];
    }
  }

  private refreshHomework(studentId: string): void {
    // Recharge les devoirs réels
    this.homeworkService.getHomeworkForStudent(studentId).subscribe({
      next: (homework) => {
        // Filtrage des devoirs non terminés pour l'affichage dans "Devoirs à faire"
        this.studentHomework = homework.filter(hw => 
          hw.status !== 'completed' && 
          hw.status !== 'submitted' && 
          hw.status !== 'finished'  // on ajoute le filtre pour le statut 'finished'
        );
        console.log('[StudentHome] Devoirs non terminés rechargés:', this.studentHomework);
      },
      error: (err) => {
        console.error('[StudentHome] Erreur de rechargement des devoirs:', err);
        this.studentHomework = [];
      }
    });
  }

  /**
   * Charger les statistiques de l'étudiant
   */
  private loadStudentStats(studentId: string): void {
    this.loadingStats = true;
    console.log('[StudentHome] Chargement des statistiques pour l\'étudiant:', studentId);
    
    // Charge les stats directement via différents services
    const activeDaysPromise = this.statisticsService.getActiveDaysCount(studentId).toPromise();
    const lessonsCompletedPromise = this.statisticsService.getCompletedLessonsCount(studentId).toPromise();
    const wordsLearnedPromise = this.lexiconService.getLearnedWordsCount().toPromise();
    
    Promise.all([activeDaysPromise, lessonsCompletedPromise, wordsLearnedPromise])
      .then(([activeDaysResult, lessonsResult, wordsResult]) => {
        console.log('[StudentHome] Statistiques reçues:', {
          activeDays: activeDaysResult?.count || 0,
          lessons: lessonsResult?.count || 0,
          words: wordsResult?.count || 0
        });
        
        this.stats = {
          daysActive: activeDaysResult?.count || 0,
          lessonsCompleted: lessonsResult?.count || 0,
          wordsLearned: wordsResult?.count || 0
        };
        this.loadingStats = false;
      })
      .catch((error) => {
        console.error('[StudentHome] Erreur de chargement des statistiques:', error);
        this.loadingStats = false;
        // Laisse les valeurs par défaut (0)
        this.stats = {
          daysActive: 0,
          lessonsCompleted: 0,
          wordsLearned: 0
        };
      });
  }

}
