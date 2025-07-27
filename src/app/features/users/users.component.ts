import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-users',
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css']
})
export class UsersComponent implements OnInit {

  isCreateStudentModalOpen = false;
  isCreateTeacherModalOpen = false;
  showAdditionalInfo = false;
  selectedFile: File | null = null;
  selectedPlatform = 'Skype';
  linkPlaceholder = 'Entrez le lien pour Skype';
  linkInput: string | undefined;
  teachers: Array<{ name: string; id: number; email: string; nativeLanguage: string }> = [];
  tooltipVisible: string | null = null;

  constructor(private router: Router) { }

  newTeacher: { name: string; email: string; nativeLanguage: string; id: number } = {
    name: '',
    email: '',
    nativeLanguage: '',
    id: Date.now(),
  };

  addTeacher(): void {
    const newTeacher = { ...this.newTeacher, id: Date.now() };
    this.teachers.push(newTeacher);
    this.saveTeachers();
    this.clearNewTeacherForm();
    this.isCreateTeacherModalOpen = false;
  }


  saveTeachers(): void {
    localStorage.setItem('teachers', JSON.stringify(this.teachers));
  }

  loadTeachers(): void {
    const savedTeachers = localStorage.getItem('teachers');
    if (savedTeachers) {
      this.teachers = JSON.parse(savedTeachers);
    }
  }

  clearNewTeacherForm(): void {
    this.newTeacher = { name: '', email: '', nativeLanguage: '', id: Date.now() };
  }

  openTeacherProfile(id: number): void {
    console.log(id);
    this.router.navigate([`/cabinet/school/users/teacher/${id}`]);
  }

  showTooltip(role: string): void {
    console.log("hello");
    this.tooltipVisible = role;
  }

  hideTooltip(): void {
    this.tooltipVisible = null;
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

  frequencies = [
    '1 fois par semaine', '2 fois par semaine', '3 fois par semaine', '4 fois par semaine',
    '5 fois par semaine', '6 fois par semaine', '7 fois par semaine'
  ];

  possibilities = [
    {
      title: 'Enseignant des cours en ligne',
      description: 'L\'employé pourra donner des cours en ligne',
      icon: 'bi bi-person-video3',
      role: 'teacher',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Curateur des marathons',
      description: 'L\'employé pourra superviser les marathons et les cours en ligne',
      icon: 'bi bi-award',
      role: 'teacher',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Administrateur',
      description: 'L\'employé pourra administrer le processus éducatif',
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
    { name: 'Matériaux', icon: 'bi bi-journal', enabled: false }
  ];
  selectedLanguages: string = 'Anglais';
  availableLanguages = ['Russe', 'Anglais', 'Français'];
  teacherWillFill: boolean = false;
  daysWithDates: string[] = [];
  hours: string[] = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  showButton: { [key: string]: boolean } = {};
  activeSlots: Record<string, boolean> = {};
  currentTimeSlot: { day: string; hour: string } | null = null;
  crossEntryEnabled: boolean = false;

  ngOnInit() {
    this.loadTeachers();
    this.loadStudents();
    this.initializeDaysWithDates();
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 60000);
  }

  initializeDaysWithDates() {
    const today = new Date();
    this.daysWithDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayName = date.toLocaleDateString('ru-RU', { weekday: 'short' });
      const dayDate = date.toLocaleDateString('ru-RU', { day: 'numeric' });
      this.daysWithDates.push(`${dayName}, ${dayDate}`);
    }
  }

  updateCurrentTime() {
    const now = new Date();
    const currentDay = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    const currentHour = `${now.getHours()}:00`;
    this.currentTimeSlot = { day: currentDay, hour: currentHour };
  }

  isCurrentTime(day: string, hour: string): boolean {
    return this.currentTimeSlot?.day === day && this.currentTimeSlot?.hour === hour;
  }

  openCreateStudentModal(): void {
    this.isCreateStudentModalOpen = true;
  }

  closeCreateStudentModal(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isCreateStudentModalOpen = false;
  }

  openCreateTeacherModal(): void {
    this.isCreateTeacherModalOpen = true;
  }

  closeCreateTeacherModal(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isCreateTeacherModalOpen = false;
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
      console.log('Fichier sélectionné:', this.selectedFile.name);
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
      // Logique pour l'administrateur
      possibility.isFeatureEnabled = !possibility.isFeatureEnabled;
      // Actions supplémentaires pour l'administrateur
    } else if (possibility.role === 'teacher') {
      // Logique pour l'enseignant
      possibility.isFeatureEnabled = !possibility.isFeatureEnabled;
      // Actions supplémentaires pour l'enseignant
    }
  }


  fillSchedule() {
    this.teacherWillFill = false;
  }

  fillTeacherSchedule() {
    this.teacherWillFill = true;
  }

  toggleTimeSlot(day: string, hour: string) {
    const slotKey = `${day}-${hour}`;
    this.activeSlots[slotKey] = !this.activeSlots[slotKey];
  }

  showSelectButton(day: string, hour: string) {
    console.log("hello");
    this.showButton[`${day}-${hour}`] = true;
  }

  hideSelectButton(day: string, hour: string) {
    console.log("goodbye");
    this.showButton[`${day}-${hour}`] = false;
  }

  selectSlot(day: string, hour: string) {
    this.toggleTimeSlot(day, hour);
  }

  isTimeSlotActive(day: string, hour: string): boolean {
    return this.activeSlots[`${day}-${hour}`] || false;
  }

  // students
  students: Array<{ name: string; id: number; email: string }> = [];

  newStudent: { name: string; email: string; id: number } = {
    name: '',
    email: '',
    id: Date.now(),
  };

  addStudent(): void {
    const newStudent = { ...this.newStudent, id: Date.now() };
    this.students.push(newStudent);
    this.saveStudents();
    this.clearNewStudentForm();
    this.isCreateStudentModalOpen = false;
  }

  saveStudents(): void {
    localStorage.setItem('students', JSON.stringify(this.students));
  }

  loadStudents(): void {
    const savedStudents = localStorage.getItem('students');
    if (savedStudents) {
      this.students = JSON.parse(savedStudents);
    }
  }

  clearNewStudentForm(): void {
    this.newStudent = { name: '', email: '', id: Date.now() };
  }


  openStudentProfile(id: number): void {
    this.router.navigate([`/cabinet/school/users/student/${id}`]);
  }
}

