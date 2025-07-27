import { Component, OnInit, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { CalendarEvent } from 'angular-calendar';
import { AuthService } from '../../../../services/auth.service';
import { TeacherService } from '../../../../services/teacher.service';
import { NotificationService } from '../../../../services/notifications.service';
import { Notification } from '../../../../models/notification.model';
import { LessonService, TeacherTimeSlot } from '../../../../services/lesson.service';
import { GoalsService } from '../../../../services/goals.service';
import { StudentGoal, ExamLevel } from '../../../../models/student-goal.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { VideoCallService } from '../../../../services/video-call.service';
import { LessonTabsService } from '../../../../services/lesson-tabs.service';
import { MaterialService } from '../../../../services/material.service';
import { HomeworkService, Homework } from '../../../../services/homework.service';

@Component({
  selector: 'app-teacher-home',
  templateUrl: './teacher-home.component.html',
  styleUrls: ['./teacher-home.component.css']
})
export class TeacherHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  constructor(
    private authService: AuthService,
    private teacherService: TeacherService,
    private notificationService: NotificationService,
    private lessonService: LessonService,
    private goalsService: GoalsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private ngZone: NgZone,
    private videoCallService: VideoCallService,
    private lessonTabsService: LessonTabsService,
    private materialService: MaterialService,
    private homeworkService: HomeworkService
  ) { }

  // notifications: string[] = [
  //   'Un nouvel avis a été laissé sur votre profil.',
  //   'Votre profil a été mis en avant cette semaine.'
  // ];
  newRequests: Notification[] = [];
  notifications: Notification[] = [];

  // newRequests = [
  //   { name: 'Claire Martin', date: '21/05/2025' },
  //   { name: 'Julien Lefevre', date: '20/05/2025' }
  // ];

  // Homework properties
  teacherHomework: Homework[] = [];
  homeworksToReview: Homework[] = [];
  loadingHomework = false;

  upcomingLessons: CalendarEvent[] = [];

  shownRequests = 5;

  REJECTION_REASONS = [
    'Je ne suis pas disponible à cette date',
    'Ce créneau ne correspond pas à mon emploi du temps régulier',
    'Je préfère discuter avant d\'accepter une première leçon',
    'Je n\'enseigne pas actuellement à ce niveau',
    'Autre'
  ];
  selectedRequest: Notification | null = null;
  selectedReason = '';
  customReason = '';
  showRefuseDialog = false;
  treatedRequests: Notification[] = [];
  confirmedStudents: any[] = [];
  selectedRefusalMode: 'refuse' | 'propose' = 'refuse';
  selectedAlternativeDate?: Date;
  selectedAlternativeTime?: string;
  teacherAlternativeSchedule: TeacherTimeSlot[] = [];

  // Nouvelles propriétés pour la gestion des notifications (comme dans student-home)
  showMoreNotifications = false;
  readonly MAX_NOTIFICATIONS = 10;

  // Nouvelles propriétés pour la gestion des demandes traitées
  showMoreTreatedRequests = false;
  readonly MAX_TREATED_REQUESTS = 10;

  // Nouvelles propriétés pour la modale étudiant
  selectedStudent: any = null;
  showStudentModal = false;

  // Heure actuelle pour les templates
  now = new Date();

  notificationsCollapsed = false;
  homeworkCollapsed = false;

  private refreshCalendar(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome] refreshCalendar: requesting all confirmed lessons for teacher', userId);
    this.lessonService.getAllConfirmedLessonsForTeacher(userId).subscribe(lessons => {
      console.log('[TeacherHome] Toutes les leçons confirmées:', lessons);
      this.upcomingLessons = lessons.map(lesson => ({
        start: new Date(lesson.scheduledAt),
        end: new Date(new Date(lesson.scheduledAt).getTime() + 60 * 60 * 1000),
        title: `${this.getStatusIcon(lesson.status)} ${lesson.studentName}`,
        color: this.getCalendarColor(lesson.status),
        allDay: false,
        meta: { 
          lessonId: lesson.id,
          status: lesson.status,
          studentId: lesson.studentId,
          studentName: lesson.studentName
        }
              }));
    });
  }



  private refreshNotifications(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    console.log('[TeacherHome][FRONT] refreshNotifications called for userId:', userId);
    this.notificationService.getNotificationsForUser(userId).subscribe({
      next: (all) => {
        console.log('🔔 [FRONT] Réponse du serveur:', all);
        this.notifications = all.filter(n => n.type !== 'booking_request');
        this.newRequests = all.filter(n => n.type === 'booking_request' && n.status === 'pending');
        this.treatedRequests = all.filter(n => n.type === 'booking_request' && n.status !== 'pending');
      },
      error: (err) => {
        console.error('❌ [FRONT] Erreur lors de la réception des notifications:', err);
      }
    });
  }

  private refreshStudents(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    this.lessonService.getConfirmedStudentsForTeacher(userId).subscribe(students => {
      this.confirmedStudents = students;
      console.log('[TeacherHome] Liste confirmedStudents mise à jour:', students);
    });
  }

  private loadTeacherHomework(): void {
    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;
    
    this.loadingHomework = true;
    console.log('[TeacherHome] Chargement des devoirs pour l\'enseignant:', userId);
    
    this.homeworkService.getHomeworkForTeacher(userId).subscribe({
      next: (homework: Homework[]) => {
        console.log('[TeacherHome] Devoirs de l\'enseignant chargés:', homework);
        this.teacherHomework = homework;
        
        // On filtre les devoirs à vérifier (terminés mais pas encore notés)
        this.homeworksToReview = homework.filter((hw: Homework) => {
          // On exclut les devoirs déjà notés
          if (hw.grade !== null && hw.grade !== undefined) {
            return false;
          }
          
          // On inclut les devoirs avec le statut submitted, completed, ou finished avec une réponse de l'étudiant
          return hw.status === 'submitted' || 
                 hw.status === 'completed' || 
                 (hw.status === 'finished' && hw.studentResponse && hw.studentResponse.trim().length > 0) ||
                 (hw.status === 'unfinished' && this.isHomeworkOverdue(hw));
        });
        
        console.log('[TeacherHome] Statut des devoirs:', {
          total: homework.length,
          submitted: homework.filter(hw => hw.status === 'submitted').length,
          completed: homework.filter(hw => hw.status === 'completed').length,
          finished: homework.filter(hw => hw.status === 'finished').length,
          finishedWithResponse: homework.filter(hw => hw.status === 'finished' && hw.studentResponse).length,
          unfinished: homework.filter(hw => hw.status === 'unfinished').length,
          toReview: this.homeworksToReview.length
        });
        
        console.log('[TeacherHome] Devoirs à vérifier:', this.homeworksToReview);
        this.loadingHomework = false;
      },
      error: (error: any) => {
        console.error('[TeacherHome] Erreur lors du chargement des devoirs:', error);
        this.loadingHomework = false;
      }
    });
  }

  isHomeworkOverdue(homework: Homework): boolean {
    if (!homework.dueDate) return false;
    const now = new Date();
    const dueDate = new Date(homework.dueDate);
    return now > dueDate;
  }

  goToHomeworkReview(homework: Homework): void {
    // On va à homework dans le composant trainer avec des paramètres spéciaux pour l'enseignant
    this.router.navigate(['/teacher/trainer'], { 
      queryParams: { 
        tab: 'homework', 
        homeworkId: homework.id,
        mode: 'review' // mode spécial pour les enseignants
      } 
    });
  }

  getDaysOverdue(homework: Homework): number {
    if (!homework.dueDate) return 0;
    const now = new Date();
    const dueDate = new Date(homework.dueDate);
    const diffTime = now.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getOverdueCount(): number {
    return this.teacherHomework.filter(hw => 
      hw.status === 'unfinished' && this.isHomeworkOverdue(hw)
    ).length;
  }

  getSubmittedCount(): number {
    return this.teacherHomework.filter(hw => 
      hw.status === 'submitted' || 
      hw.status === 'completed' ||
      (hw.status === 'finished' && hw.studentResponse) // ✨ Включаем finished со studentResponse
    ).length;
  }

  ngOnInit(): void {
    this.refreshStudents();
    
    // On met à jour l'heure chaque minute
    setInterval(() => {
      this.now = new Date();
    }, 60000);
    
    // On charge les devoirs pour l'enseignant
    this.loadTeacherHomework();
    
    // On s'abonne aux mises à jour des devoirs
    this.homeworkService.onHomeworkUpdated().subscribe(() => {
      console.log('[TeacherHome] Devoirs mis à jour, rechargement...');
      this.loadTeacherHomework();
    });

    const userId = this.authService.getCurrentUser()?.id;
    if (!userId) return;

    this.teacherService.getTeacherById(userId).subscribe(profile => {
      if (!profile.bio || !profile.price || !profile.experienceYears ||
        !profile.specializations.length || !profile.certificates.length) {
        this.notifications.unshift({
          id: 'warning-missing-profile',
          user_id: userId,
          title: '⚠️ Veuillez compléter votre profil',
          message: '...pour apparaître dans les résultats de recherche.',
          type: 'info',
          status: 'pending'
        });
      }
    });

    this.notificationService.getNotificationsForUser(userId).subscribe({
      next: (all) => {
        console.log('🔔 [FRONT] Réponse du serveur:', all);
        this.notifications = all.filter(n => n.type !== 'booking_request');
        this.newRequests = all.filter(n => n.type === 'booking_request' && n.status === 'pending');
        this.treatedRequests = all.filter(n => n.type === 'booking_request' && n.status !== 'pending');
      },
      error: (err) => {
        console.error('❌ [FRONT] Erreur lors de la réception des notifications:', err);
      }
    });

    this.refreshCalendar();
    this.refreshNotifications();
  }

  respondToRequest(request: Notification, accepted: boolean): void {
    const metadata = (request as any).data;
    if (!metadata?.lessonId) {
      console.error('❌ Données de requête invalides (lessonId manquant)');
      return;
    }

    console.log('[TeacherHome][FRONT] respondToRequest called for request:', request, 'accepted:', accepted);
    if (accepted) {
      this.lessonService.respondToBooking(metadata.lessonId, accepted).subscribe(() => {
        console.log('[TeacherHome][FRONT] Booking accepted, refreshing notifications, calendar, and students');
        this.refreshStudents();
        this.refreshCalendar();
        this.refreshNotifications();
      });
    } else {
      this.selectedRequest = request;
      this.selectedReason = '';
      this.customReason = '';
      this.showRefuseDialog = true;
    }
  }

  loadMore(): void {
    this.shownRequests = Math.min(this.shownRequests + 5, this.newRequests.length);
  }

  reduce(): void {
    this.shownRequests = 5;
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

  onAlternativeDateChange() {
    this.selectedAlternativeTime = '';
    this.loadAvailableSlots();
  }

  loadAvailableSlots() {
    const teacherId = this.authService.getCurrentUser()?.id;
    if (!teacherId || !this.selectedAlternativeDate) return;
    
    const dateStr = this.selectedAlternativeDate.toISOString().split('T')[0];
    this.lessonService.getAvailableSlots(teacherId, dateStr).subscribe({
      next: (slots) => {
        // On filtre les créneaux passés
        const now = new Date();
        if (!this.selectedAlternativeDate) {
          this.teacherAlternativeSchedule = slots;
          return;
        }
        
        const currentDate = this.selectedAlternativeDate.toDateString();
        const todayDate = now.toDateString();
        
        if (currentDate === todayDate) {
          // Si aujourd'hui est sélectionné, on filtre les heures passées
          this.teacherAlternativeSchedule = slots.filter(slot => {
            const [hours, minutes] = slot.time.split(':').map(Number);
            const slotDateTime = new Date(
              this.selectedAlternativeDate!.getFullYear(),
              this.selectedAlternativeDate!.getMonth(),
              this.selectedAlternativeDate!.getDate(),
              hours,
              minutes
            );
            return slotDateTime > now;
          });
        } else {
          // Si ce n'est pas aujourd'hui, on affiche tous les créneaux
          this.teacherAlternativeSchedule = slots;
        }
        
        console.log('✅ Planning alternatif du professeur chargé (filtré):', this.teacherAlternativeSchedule);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du planning alternatif:', error);
        this.teacherAlternativeSchedule = [];
      }
    });
  }

  selectAlternativeTimeSlot(time: string) {
    this.selectedAlternativeTime = time;
  }

  // Méthodes pour le template de temps alternatif
  hasNoAlternativeSlots(): boolean {
    return this.teacherAlternativeSchedule.length > 0 && !this.teacherAlternativeSchedule.some(s => s.available);
  }

  confirmRefusal(): void {
    if (!this.selectedRequest) return;
    let metadata = this.selectedRequest.data;
    if (!metadata && 'metadata' in this.selectedRequest) {
      metadata = (this.selectedRequest as any).metadata;
    }
    if (!metadata || !metadata.lessonId) return;

    if (this.selectedRefusalMode === 'refuse') {
      const reason = this.selectedReason === 'Autre' ? this.customReason.trim() : this.selectedReason;
      if (!reason) return;
      this.lessonService.respondToBooking(metadata.lessonId, false, reason, false).subscribe(() => {
        this.showRefuseDialog = false;
        this.selectedReason = '';
        this.customReason = '';
        this.selectedRefusalMode = 'refuse';
        this.snackBar.open('Студенту envoyé un message de refus', 'OK', { duration: 3000 });
        this.refreshNotifications();
      });
    } else if (this.selectedRefusalMode === 'propose') {
      if (!this.selectedAlternativeDate || !this.selectedAlternativeTime) return;
      const [hours, minutes] = this.selectedAlternativeTime.split(':').map(Number);
      const proposedDateTime = new Date(this.selectedAlternativeDate);
      proposedDateTime.setHours(hours, minutes, 0, 0);
      this.lessonService.respondToBooking(metadata.lessonId, false, '', true, proposedDateTime.toISOString()).subscribe(() => {
        this.showRefuseDialog = false;
        this.selectedAlternativeDate = undefined;
        this.selectedAlternativeTime = undefined;
        this.selectedRefusalMode = 'refuse';
        this.teacherAlternativeSchedule = [];
        this.snackBar.open('Студенту envoyé un message de nouvelle date', 'OK', { duration: 3000 });
        this.refreshNotifications();
      });
    }
  }

  // Méthodes pour la gestion des notifications (comme dans student-home)
  hideNotification(notification: any) {
    if (notification.id) {
      this.notificationService.hideNotification(notification.id).subscribe(() => {
        // On supprime la notification du tableau local
        this.notifications = this.notifications.filter(n => n.id !== notification.id);
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

  // Méthodes pour la gestion des demandes traitées
  hideTreatedRequest(request: any) {
    if (request.id) {
      this.notificationService.hideNotification(request.id).subscribe(() => {
        // On supprime la demande du tableau local
        this.treatedRequests = this.treatedRequests.filter(r => r.id !== request.id);
      });
    }
  }

  get visibleTreatedRequests() {
    return this.showMoreTreatedRequests 
      ? this.treatedRequests 
      : this.treatedRequests.slice(0, this.MAX_TREATED_REQUESTS);
  }

  get hasMoreTreatedRequests() {
    return this.treatedRequests.length > this.MAX_TREATED_REQUESTS;
  }

  toggleShowMoreTreatedRequests() {
    this.showMoreTreatedRequests = !this.showMoreTreatedRequests;
  }

  // Méthodes pour la modale étudiant
  openStudentModal(student: any): void {
    this.selectedStudent = { ...student, loadingGoal: true };
    this.showStudentModal = true;
    
    // On charge les informations sur les objectifs de l'étudiant
    if (student.id) {
      this.goalsService.getActiveGoal(student.id).subscribe({
        next: (goal: StudentGoal | null) => {
          this.selectedStudent = {
            ...this.selectedStudent,
            goal: goal,
            goalDisplayText: goal ? this.getGoalDisplayText(goal) : 'Aucun objectif défini',
            loadingGoal: false
          };
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'objectif de l\'étudiant:', error);
          this.selectedStudent = {
            ...this.selectedStudent,
            goalDisplayText: 'Erreur lors du chargement de l\'objectif',
            loadingGoal: false
          };
        }
      });
    } else {
      this.selectedStudent.loadingGoal = false;
      this.selectedStudent.goalDisplayText = 'Aucun objectif défini';
    }
  }

  closeStudentModal(): void {
    this.showStudentModal = false;
    this.selectedStudent = null;
  }

  // Extraction du nom de l'étudiant depuis la notification
  getStudentNameFromNotification(notification: any): string {
    return notification.data?.studentName || 'Étudiant';
  }

  // Extraction de l'ID de l'étudiant depuis la notification
  getStudentIdFromNotification(notification: any): string {
    return notification.data?.studentId || '';
  }

  // Gestion du clic sur la notification
  onNotificationClick(event: any, notification: any): void {
    // On vérifie si le clic était sur un élément cliquable du nom de l'étudiant
    if (event.target && event.target.classList.contains('student-name-clickable')) {
      this.onStudentNameClick(notification);
    }
  }

  // Gestion du clic sur le nom de l'étudiant dans les notifications
  onStudentNameClick(notification: any): void {
    const studentInfo = {
      id: this.getStudentIdFromNotification(notification),
      name: this.getStudentNameFromNotification(notification),
      lessonId: notification.data?.lessonId,
      // Données supplémentaires depuis la notification
      ...notification.data
    };
    this.openStudentModal(studentInfo);
  }

  // Gestion du clic sur l'étudiant dans les demandes
  onStudentRequestClick(request: any): void {
    const studentInfo = {
      id: request.data?.studentId || '',
      name: request.data?.studentName || request.title,
      lessonId: request.data?.lessonId,
      ...request.data
    };
    this.openStudentModal(studentInfo);
  }

  // Navigation vers le cours
  navigateToLesson(lessonId: string): void {
    this.router.navigate(['/lessons/teacher'], { 
      queryParams: { 
        lessonId: lessonId,
        tab: 'upcoming' 
      } 
    });
  }

  // Gestion du clic sur un événement du calendrier
  onCalendarEventClick(event: CalendarEvent): void {
    if (event.meta?.lessonId) {
      this.navigateToLesson(event.meta.lessonId);
    }
  }

  // Création de noms d'étudiants cliquables dans les notifications
  makeStudentNameClickable(message: string, notification: any): string {
    const studentName = this.getStudentNameFromNotification(notification);
    
    if (!studentName || studentName === 'Étudiant') {
      return `<strong>${notification.title}</strong><br><small>${message}</small>`;
    }
    
    // On crée un élément cliquable pour le nom de l'étudiant
    const clickableMessage = message.replace(
      studentName, 
      `<span class="student-name-clickable" 
         data-notification-id="${notification.id}"
         style="color: #1976d2; text-decoration: underline; cursor: pointer; font-weight: bold;">
         ${studentName}
       </span>`
    );
    
    return `<strong>${notification.title}</strong><br><small>${clickableMessage}</small>`;
  }

  ngAfterViewInit(): void {
    // Plus besoin d'un écouteur d'événements global
  }

  ngOnDestroy(): void {
    // Plus besoin de supprimer l'écouteur
  }

  private getCalendarColor(status: string): { primary: string, secondary: string } {
    switch (status) {
      case 'confirmed': 
        return { primary: '#4caf50', secondary: '#e8f5e9' }; // Vert
      case 'rejected': 
        return { primary: '#f44336', secondary: '#ffebee' }; // Rouge
      case 'pending': 
        return { primary: '#ff9800', secondary: '#fff3e0' }; // Jaune/orange
      case 'cancelled_by_student':
      case 'cancelled_by_student_no_refund':
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // Gris pour les annulés
      case 'in_progress':
        return { primary: '#2196f3', secondary: '#e3f2fd' }; // Bleu
      case 'completed':
        return { primary: '#9c27b0', secondary: '#f3e5f5' }; // Violet
      default: 
        return { primary: '#9e9e9e', secondary: '#f5f5f5' }; // Gris
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

  private getGoalDisplayText(goal: StudentGoal): string {
    const examLevel = this.goalsService.getExamLevelDisplayName(goal.examLevel);
    const targetDate = goal.targetDate ? ` avant le ${new Date(goal.targetDate).toLocaleDateString('fr-FR')}` : '';
    return `${examLevel}${targetDate}`;
  }

  // Méthodes pour l'affichage dans la fenêtre modale
  getExamLevelDisplay(examLevel: string): string {
    return this.goalsService.getExamLevelDisplayName(examLevel as ExamLevel);
  }

  formatTargetDate(targetDate: string): string {
    return new Date(targetDate).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Vérification si on peut entrer en classe (le jour du cours)
  canEnterClass(event: CalendarEvent): boolean {
    if (event.meta?.status !== 'confirmed') return false;
    
    const now = new Date();
    const lessonTime = event.start;
    
    // On vérifie que le cours est le même jour
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lessonDate = new Date(lessonTime.getFullYear(), lessonTime.getMonth(), lessonTime.getDate());
    
    return nowDate.getTime() === lessonDate.getTime();
  }

  private async getMaterialsForLesson(lessonId: string): Promise<any[]> {
    try {
      console.log('[TeacherHome] Chargement des matériaux pour le cours:', lessonId);
      const allMaterials = await this.materialService.getMaterials().toPromise();
      console.log('[TeacherHome] Tous les matériaux reçus:', allMaterials);
      
      if (!allMaterials || allMaterials.length === 0) {
        console.warn('[TeacherHome] Matériaux non trouvés ou liste vide. Peut-être que file-service n\'est pas lancé ?');
        return [];
      }
      
      const filteredMaterials = allMaterials.filter(material => {
        const isAttached = material.attachedLessons && material.attachedLessons.includes(lessonId);
        return isAttached;
      });
      
      console.log('[TeacherHome] Matériaux filtrés pour le cours:', filteredMaterials);
      return filteredMaterials;
    } catch (error) {
      console.error('[TeacherHome] Erreur lors du chargement des matériaux pour le cours:', error);
      return [];
    }
  }

  // Entrée dans la classe virtuelle
  async enterVirtualClass(event: CalendarEvent): Promise<void> {
    const currentUserId = this.authService.getCurrentUser()?.id;
    if (!currentUserId || !event.meta?.lessonId) return;

    // On définit les données du cours dans VideoCallService
    this.videoCallService.setLessonData(event.meta.lessonId, currentUserId);

    // On charge les tâches, questions et matériaux pour le cours
    const [tasks, questions, materials] = await Promise.all([
      this.lessonService.getTasksForLesson(event.meta.lessonId).toPromise(),
      this.lessonService.getQuestionsForLesson(event.meta.lessonId).toPromise(),
      this.getMaterialsForLesson(event.meta.lessonId)
    ]);

    // On divise les tâches et questions par rôles
    const studentTasks = (tasks || []).filter((t: any) => t.createdByRole === 'student').map((t: any) => ({ id: t.id, title: t.title }));
    const teacherTasks = (tasks || []).filter((t: any) => t.createdByRole === 'teacher').map((t: any) => ({ id: t.id, title: t.title }));
    const studentQuestions = (questions || []).filter((q: any) => q.createdByRole === 'student').map((q: any) => ({ id: q.id, question: q.question }));
    const teacherQuestions = (questions || []).filter((q: any) => q.createdByRole === 'teacher').map((q: any) => ({ id: q.id, question: q.question }));

    console.log('[TeacherHome] Données du cours préparées:', {
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
    const now = new Date();
    const lessonStart = new Date(event.start);
    const diffInMs = lessonStart.getTime() - now.getTime();
    return Math.round(diffInMs / (1000 * 60));
  }

  getHomeworkStatusText(status: string): string {
    switch (status) {
      case 'submitted': return 'Soumis';
      case 'completed': return 'Complété';
      case 'finished': return 'Terminé';
      case 'unfinished': return 'En cours';
      default: return 'Statut inconnu';
    }
  }
}
