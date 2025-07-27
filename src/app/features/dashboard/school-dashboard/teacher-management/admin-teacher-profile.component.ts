import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';
import { TawkService } from '../../../../services/support-chat.service';
import { MOCK_TEACHER_PROFILE } from './mock-teacher-profile';
import { TeacherProfile } from './teacher-profile.model';

// TODO : ajouter interface pour les leçons
interface Lesson {
  day: string;
  hour: string;
  topic?: string; // propriétés supplémentaires de la leçon si nécessaire
}

@Component({
  selector: 'app-admin-teacher-profile',
  templateUrl: './admin-teacher-profile.component.html',
  styleUrls: ['./admin-teacher-profile.component.css']
})
export class AdminTeacherProfileComponent implements OnInit {
  teacherId: number | null = null;
  teacherData: TeacherProfile | null = null;
  tabs = ['Cours en ligne', 'Marathons', 'Administrateur'];
  subTabs = ['Enseignant', 'Classes', 'Matériels personnels'];
  activeTab: string = this.tabs[0];
  activeSubTab: string = this.subTabs[0];

  schedule: Lesson[] = [];
  currentWeekStart: Date = new Date();

  hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
  startHour: string = '09:00';
  endHour: string = '22:00';
  timezones = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00',
    'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00',
    'UTC+05:00', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
  ];
  daysWithDates: string[] = [];
  showButton: { [key: string]: boolean } = {};
  activeSlots: Record<string, boolean> = {};
  currentTimeSlot: { day: string; hour: string } | null = null;

  settingsMenuOpen = false;
  showModal = false;
  showNewLessonModal = false;
  activeLessonTab: string = 'individual';

  constructor(private route: ActivatedRoute, private router: Router, private tawkService: TawkService) {
    this.currentWeekStart = this.getStartOfWeek(new Date());
  }

  ngOnInit(): void {
    this.teacherId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTeacherData();
    this.daysWithDates = this.getWeekDates().map(date => date.toISOString().split('T')[0]);
    this.loadHourRangeFromLocalStorage();
    this.tawkService.loadTawkScript();
  }

  loadTeacherData(): void {
    this.teacherData = MOCK_TEACHER_PROFILE;
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
  }

  switchSubTab(subTab: string): void {
    this.activeSubTab = subTab;
  }

  getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // début de semaine - lundi
    return new Date(start.setDate(diff));
  }

  getWeekDates(): Date[] {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(this.currentWeekStart);
      date.setDate(this.currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }

  nextWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
  }

  previousWeek(): void {
    this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
  }

  // TODO : optimiser la gestion des créneaux temporels
  toggleTimeSlot(day: string, hour: string) {
    const slotKey = `${day}-${hour}`;
    this.activeSlots[slotKey] = !this.activeSlots[slotKey];
  }

  showSelectButton(day: string, hour: string) {
    this.showButton[`${day}-${hour}`] = true;
  }

  hideSelectButton(day: string, hour: string) {
    this.showButton[`${day}-${hour}`] = false;
  }

  selectSlot(day: string, hour: string) {
    this.showModal = true;
    this.toggleTimeSlot(day, hour);
  }

  isTimeSlotActive(day: string, hour: string): boolean {
    return this.activeSlots[`${day}-${hour}`] || false;
  }

  isCurrentTime(day: string, hour: string): boolean {
    return this.currentTimeSlot?.day === day && this.currentTimeSlot?.hour === hour;
  }

  toggleSettingsMenu(): void {
    this.settingsMenuOpen = !this.settingsMenuOpen;
  }

  onStartHourChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.startHour = target.value;
      this.saveHourRangeToLocalStorage(); // Save changes to local storage
    }
  }

  onEndHourChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.endHour = target.value;
      this.saveHourRangeToLocalStorage(); // Save changes to local storage
    }
  }

  filterHours(): string[] {
    const startIndex = this.hours.indexOf(this.startHour);
    const endIndex = this.hours.indexOf(this.endHour);
    return this.hours.slice(startIndex, endIndex + 1);
  }

  loadHourRangeFromLocalStorage(): void {
    const savedStartHour = localStorage.getItem('startHour');
    const savedEndHour = localStorage.getItem('endHour');
    if (savedStartHour && this.hours.includes(savedStartHour)) {
      this.startHour = savedStartHour;
    }
    if (savedEndHour && this.hours.includes(savedEndHour)) {
      this.endHour = savedEndHour;
    }
  }

  saveHourRangeToLocalStorage(): void {
    localStorage.setItem('startHour', this.startHour);
    localStorage.setItem('endHour', this.endHour);
  }

  conductedLessonsCount: number = 0;
  workloadPercentage: number = 0;

  openNewLessonModal(): void {
    this.showModal = false; // on ferme la première modale
    this.showNewLessonModal = true; // on ouvre la modale avec onglets
  }

  closeNewLessonModal(): void {
    this.showNewLessonModal = false;
  }

  switchLessonTab(tab: string): void {
    this.activeLessonTab = tab;
  }

  closeModal(): void {
    this.showModal = false;
  }

  goToOnlineLessons(): void {
    this.router.navigate(['/online-lessons'], { queryParams: { activeTab: 'Élèves' } });
  }

  navigateBack() {
    this.router.navigate(['/student-dashboard/users']);
  }

  showStatisticsModal = false;

  // TODO : intégrer le téléchargement de statistiques réelles
  downloadStatistics() {
    this.showStatisticsModal = true;
  }

  closeStatisticsModal() {
    this.showStatisticsModal = false;
  }

  possibilities = [
    {
      title: 'Enseignant de cours en ligne',
      description: 'L\'employé pourra donner des cours en ligne',
      icon: 'bi bi-person-video3',
      role: 'teacher',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Superviseur de marathons',
      description: 'L\'employé pourra superviser les marathons et cours en ligne',
      icon: 'bi bi-award',
      role: 'teacher',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Administrateur',
      description: 'L\'employé pourra administrer le processus d\'apprentissage',
      icon: 'bi bi-gear',
      role: 'admin',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
  ];

  sections = [
    { name: 'Indicateurs', icon: 'bi bi-grid', enabled: false },
    { name: 'Revenus et paiements', icon: 'bi bi-currency-dollar', enabled: false },
    { name: 'Utilisateurs', icon: 'bi bi-people', enabled: false },
    { name: 'Cours en ligne', icon: 'bi bi-mortarboard', enabled: false },
    { name: 'Marathons', icon: 'bi bi-activity', enabled: false },
    { name: 'Matériels', icon: 'bi bi-journal', enabled: false }
  ];

  platforms = [
    { value: 'Skype', label: 'Skype', icon: 'bi bi-skype' },
    { value: 'Zoom', label: 'Zoom', icon: 'bi bi-camera-video' }
  ];

  newTeacher: { name: string; email: string; nativeLanguage: string; id: number } = {
    name: '',
    email: '',
    nativeLanguage: '',
    id: Date.now(),
  };

  editInfo(): void {
    const newTeacher = { ...this.newTeacher, id: Date.now() };
    this.teachers.push(newTeacher);
    this.saveTeachers();
    this.clearNewTeacherForm();
    this.isEditModalOpen = false;
  }

  teachers: Array<{ name: string; id: number; email: string; nativeLanguage: string }> = [];

  clearNewTeacherForm(): void {
    this.newTeacher = { name: '', email: '', nativeLanguage: '', id: Date.now() };
  }

  saveTeachers(): void {
    localStorage.setItem('teachers', JSON.stringify(this.teachers));
  }

  isEditModalOpen = false;
  showAdditionalInfo = false;
  selectedFile: File | null = null;
  selectedPlatform = 'Skype';
  linkPlaceholder = 'Entrez le lien pour Skype';
  linkInput: string | undefined;
  teacherWillFill: boolean = false;
  selectedLanguages: string = 'Anglais';
  availableLanguages = ['Français', 'Anglais', 'Espagnol'];
  crossEntryEnabled: boolean = false;

  // TODO : améliorer la gestion des modales
  openEditModal(): void {
    this.isEditModalOpen = true;
  }

  closeEditModal(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isEditModalOpen = false;
  }

  toggleAdditionalInfo(): void {
    this.showAdditionalInfo = !this.showAdditionalInfo;
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('avatarUpload') as HTMLElement;
    fileInput.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('[AdminTeacherProfile] Fichier sélectionné:', this.selectedFile.name);
    }
  }

  updateLinkPlaceholder(): void {
    this.linkPlaceholder = this.selectedPlatform === 'Skype' ? 'Entrez le lien pour Skype' : 'Entrez le lien pour Zoom';
  }

  togglePossibility(possibility: any) {
    possibility.expanded = !possibility.expanded;
  }

  toggleFeature(possibility: any) {
    if (possibility.role === 'admin') {
      // logique pour l'administrateur
      possibility.isFeatureEnabled = !possibility.isFeatureEnabled;
      // actions supplémentaires pour l'administrateur
    } else if (possibility.role === 'teacher') {
      // logique pour l'enseignant
      possibility.isFeatureEnabled = !possibility.isFeatureEnabled;
      // actions supplémentaires pour l'enseignant
    }
  }

  fillSchedule() {
    this.teacherWillFill = false;
  }

  fillTeacherSchedule() {
    this.teacherWillFill = true;
  }

  showTooltip(role: string): void {
    console.log("[AdminTeacherProfile] Affichage tooltip");
    this.tooltipVisible = role;
  }

  hideTooltip(): void {
    this.tooltipVisible = null;
  }

  tooltipVisible: string | null = null;

  showDeactivateModal = false;

  openDeactivateModal() {
    this.showDeactivateModal = true;
  }

  closeDeactivateModal() {
    this.showDeactivateModal = false;
  }

  // TODO : intégrer l'API de désactivation
  confirmDeactivation() {
    // logique de désactivation
    console.log('[AdminTeacherProfile] Enseignant désactivé');
    this.closeDeactivateModal();
  }

  // marathon
  showMarathonModal: boolean = false;
  proFeatures = [
    { icon: 'bi bi-star', description: 'Toutes les fonctionnalités du tarif "Standard" incluses' },
    { icon: 'bi bi-people', description: 'Possibilité d\'assigner des superviseurs' },
    { icon: 'bi bi-cash', description: 'Accepter les paiements des élèves sur la plateforme' },
    { icon: 'bi bi-gear', description: 'Automatisation d\'ouverture d\'accès aux marathons' },
    { icon: 'bi bi-badge', description: 'Possibilité de connecter White Label et bloc publicitaire' },
    { icon: 'bi bi-bar-chart', description: 'Contrôle du processus d\'apprentissage' }
  ];

  openMarathonModal() {
    this.showMarathonModal = true;
  }

  closeMarathonModal() {
    this.showMarathonModal = false;
  }

  showAdditionalModal: boolean = false;

  openAdditionalModal(): void {
    this.showAdditionalModal = true;
  }

  closeAdditionalModal(): void {
    this.showAdditionalModal = false;
  }

  closeMainModal(): void {
    this.showMarathonModal = false;
  }

  showProductSelectionModal: boolean = false; // modale pour sélection de produit
  showPaymentConfirmationModal: boolean = false; // modale pour confirmation de paiement

  // ouvrir la modale de sélection de produit
  openProductSelectionModal(): void {
    this.showMarathonModal = false;
    this.showProductSelectionModal = true;
  }

  // aller vers la modale de confirmation de paiement
  proceedToPayment(): void {
    this.showProductSelectionModal = false;
    this.showPaymentConfirmationModal = true;
  }

  closeProductSelectionModal(): void {
    this.showProductSelectionModal = false;
  }
  
  closePaymentConfirmationModal(): void {
    this.showPaymentConfirmationModal = false;
  }

  showTariffModal: boolean = false; // contrôle l'affichage de <app-tariff-status>

  openTariffModal(): void {
    this.showTariffModal = true; // ouvrir la modale
  }

  closeTariffModal(): void {
    this.showTariffModal = false; // fermer la modale
  }
}
