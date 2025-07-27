import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-student-profile',
  templateUrl: './student-profile.component.html',
  styleUrls: ['./student-profile.component.css']
})
export class StudentProfileComponent {

  isEditModalOpen = false;
  studentData: any;
  studentId: number | null = null;
  isTariffPaid: boolean = true;


  constructor(private route: ActivatedRoute, private router: Router) {

  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId = Number(id); // Enregistre l'id si besoin
      this.loadStudentData();
    }
  }

  loadStudentData(): void {
    const savedStudents = localStorage.getItem('students');
    if (savedStudents) {
      const students = JSON.parse(savedStudents);
      this.studentData = students.find((student: any) => student.id === this.studentId);
    }
  }

  openEditModal(): void {
    this.isEditModalOpen = true;
  }

  navigateBack() {
    this.router.navigate(['/student-dashboard/users']);
  }

  showStatisticsModal = false;

  downloadStatistics() {
    this.showStatisticsModal = true;
  }

  closeStatisticsModal() {
    this.showStatisticsModal = false;
  }

  showTooltip(role: string): void {
    console.log("hello");
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

  confirmDeactivation() {
    // Logique de désactivation
    console.log('Enseignant désactivé');
    this.closeDeactivateModal();
  }

  newStudent: { name: string; email: string; password: string, nativeLanguage: string; id: number } = {
    name: '',
    email: '',
    password: '',
    nativeLanguage: '',
    id: Date.now(),
  };

  editInfo(): void {
    const newStudent = { ...this.newStudent, id: Date.now() };
    this.teachers.push(newStudent);
    this.saveTeachers();
    this.clearNewTeacherForm();
    this.isEditModalOpen = false;
  }

  teachers: Array<{ name: string; id: number; email: string; nativeLanguage: string }> = [];

  clearNewTeacherForm(): void {
    this.newStudent = { name: '', email: '', nativeLanguage: '', password: '', id: Date.now() };
  }

  saveTeachers(): void {
    localStorage.setItem('teachers', JSON.stringify(this.teachers));
  }

  showAdditionalInfo = false;
  selectedFile: File | null = null;
  selectedPlatform = 'Skype';
  linkPlaceholder = 'Введите ссылку для Skype';
  linkInput: string | undefined;
  teacherWillFill: boolean = false;
  selectedLanguages: string = 'Английский';
  availableLanguages = ['Русский', 'Английский', 'Французский'];
  crossEntryEnabled: boolean = false;

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
      console.log('Fichier sélectionné :', this.selectedFile.name);
    }
  }

  platforms = [
    { value: 'Skype', label: 'Skype', icon: 'bi bi-skype' },
    { value: 'Zoom', label: 'Zoom', icon: 'bi bi-camera-video' }
  ];

  timezones = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00',
    'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00',
    'UTC+05:00', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
  ];

  updateLinkPlaceholder(): void {
    this.linkPlaceholder = this.selectedPlatform === 'Skype' ? 'Entrez le lien Skype' : 'Entrez le lien Zoom';
  }

  showDeleteStudentModal = false;

  openDeleteStudentModal(): void {
    this.showDeleteStudentModal = true;
  }

  closeDeleteStudentModal(): void {
    this.showDeleteStudentModal = false;
  }

  confirmDeleteStudent(): void {
    // Logique pour supprimer l'élève
    console.log('Élève supprimé');
    this.closeDeleteStudentModal();
  }

  frequencies = [
    '1 fois par semaine', '2 fois par semaine', '3 fois par semaine',
    '4 fois par semaine', '5 fois par semaine', '6 fois par semaine', '7 fois par semaine'
  ];
  selectedFrequency: string = '1 fois par semaine';
  studyGoal: string = '';
  note: string = '';

  showAccessModal: boolean = false;

  openAccessModal(): void {
    this.showAccessModal = true;
  }

  closeAccessModal(): void {
    this.showAccessModal = false;
  }

  showTariffModal: boolean = false; 
  openTariffModal(): void {
    this.showTariffModal = true; 
  }

  closeTariffModal(): void {
    this.showTariffModal = false; 
  }

  // si payé

  openAddClassModal(): void {
    if (this.isTariffPaid) {
      this.showAddClassModal = true; 
    } else {
      this.openAccessModal(); 
    }
  }

  showAddClassModal: boolean = false;

  closeAddClassModal(): void {
    this.showAddClassModal = false;
  }

  classType: string = 'individual';
  className: string = '';

  setClassType(type: string): void {
    this.classType = type;
  }

  saveClass(): void {
    // Logique de sauvegarde de la classe
    console.log('Classe ajoutée :', { type: this.classType, name: this.className, cover: this.selectedFile });
    this.closeAddClassModal();
  }

  selectedTab: string = 'individual'; // Par défaut, "Individuel" est sélectionné
  setTab(tab: string): void {
    this.selectedTab = tab;
  }


}
