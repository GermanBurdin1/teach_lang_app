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


  constructor(private route: ActivatedRoute, private router: Router) {

  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.studentId = Number(id); // Сохраните id, если нужно
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
    // Логика деактивации
    console.log('Учитель деактивирован');
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
      console.log('Выбранный файл:', this.selectedFile.name);
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
    this.linkPlaceholder = this.selectedPlatform === 'Skype' ? 'Введите ссылку для Skype' : 'Введите ссылку для Zoom';
  }

  showDeleteStudentModal = false;

  openDeleteStudentModal(): void {
    this.showDeleteStudentModal = true;
  }

  closeDeleteStudentModal(): void {
    this.showDeleteStudentModal = false;
  }

  confirmDeleteStudent(): void {
    // Логика для удаления ученика
    console.log('Ученик удален');
    this.closeDeleteStudentModal();
  }

  frequencies = [
    '1 раз в неделю', '2 раза в неделю', '3 раза в неделю',
    '4 раза в неделю', '5 раз в неделю', '6 раз в неделю', '7 раз в неделю'
  ];
  selectedFrequency: string = '1 раз в неделю'; // Выбор по умолчанию
  studyGoal: string = '';
  note: string = '';

}
