import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Router } from '@angular/router';

interface Lesson {
  day: string;
  hour: string;
  topic?: string; // Дополнительные свойства урока, если нужны
}

@Component({
  selector: 'app-teacher-profile',
  templateUrl: './teacher-profile.component.html',
  styleUrls: ['./teacher-profile.component.css']
})
export class TeacherProfileComponent implements OnInit {
  teacherId: number | null = null;
  teacherData: any;
  tabs = ['Онлайн-уроки', 'Марафоны', 'Администратор'];
  subTabs = ['Учитель', 'Классы', 'Личные материалы'];
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


  constructor(private route: ActivatedRoute, private router: Router) {
    this.currentWeekStart = this.getStartOfWeek(new Date());
  }

  ngOnInit(): void {
    this.teacherId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadTeacherData();
    this.daysWithDates = this.getWeekDates().map(date => date.toISOString().split('T')[0]);
    this.loadHourRangeFromLocalStorage();
  }

  loadTeacherData(): void {
    const savedTeachers = localStorage.getItem('teachers');
    if (savedTeachers) {
      const teachers = JSON.parse(savedTeachers);
      this.teacherData = teachers.find((teacher: any) => teacher.id === this.teacherId);
    }
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
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Начало недели - понедельник
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
    this.showModal = false; // Закрываем первую модалку
    this.showNewLessonModal = true; // Открываем модалку с вкладками
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
    this.router.navigate(['/online-lessons'], { queryParams: { activeTab: 'Ученики' } });
  }

  navigateBack() {
    this.router.navigate(['/student-dashboard/users']);
  }

  downloadStatistics() {
    // Логика для скачивания статистики
    alert('Скачать статистику');
  }

  possibilities = [
    {
      title: 'Учитель онлайн-уроков',
      description: 'Сотрудник сможет проводить онлайн-уроки',
      icon: 'bi bi-person-video3',
      role: 'teacher',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Куратор марафонов',
      description: 'Сотрудник сможет курировать марафоны и онлайн-курсы',
      icon: 'bi bi-award',
      role: 'teacher',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
    {
      title: 'Администратор',
      description: 'Сотрудник сможет администрировать учебный процесс',
      icon: 'bi bi-gear',
      role: 'admin',
      enabled: false,
      expanded: false,
      isFeatureEnabled: false,
    },
  ];

  sections = [
    { name: 'Показатели', icon: 'bi bi-grid', enabled: false },
    { name: 'Выручка и платежи', icon: 'bi bi-currency-dollar', enabled: false },
    { name: 'Пользователи', icon: 'bi bi-people', enabled: false },
    { name: 'Онлайн-уроки', icon: 'bi bi-mortarboard', enabled: false },
    { name: 'Марафоны', icon: 'bi bi-activity', enabled: false },
    { name: 'Материалы', icon: 'bi bi-journal', enabled: false }
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
  linkPlaceholder = 'Введите ссылку для Skype';
  linkInput: string | undefined;
  teacherWillFill: boolean = false;
  selectedLanguages: string = 'Английский';
  availableLanguages = ['Русский', 'Английский', 'Французский'];
  crossEntryEnabled: boolean = false;

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
      console.log('Выбранный файл:', this.selectedFile.name);
    }
  }

  updateLinkPlaceholder(): void {
    this.linkPlaceholder = this.selectedPlatform === 'Skype' ? 'Введите ссылку для Skype' : 'Введите ссылку для Zoom';
  }

  togglePossibility(possibility: any) {
    possibility.expanded = !possibility.expanded;
  }

  toggleFeature(possibility: any) {
    if (possibility.role === 'admin') {
      // Логика для администратора
      possibility.isFeatureEnabled = !possibility.isFeatureEnabled;
      // Дополнительные действия для администратора
    } else if (possibility.role === 'teacher') {
      // Логика для учителя
      possibility.isFeatureEnabled = !possibility.isFeatureEnabled;
      // Дополнительные действия для учителя
    }
  }


  fillSchedule() {
    this.teacherWillFill = false;
  }

  fillTeacherSchedule() {
    this.teacherWillFill = true;
  }
}
