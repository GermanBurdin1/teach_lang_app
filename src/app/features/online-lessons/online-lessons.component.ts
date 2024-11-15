import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-online-lessons',
  templateUrl: './online-lessons.component.html',
  styleUrl: './online-lessons.component.css'
})
export class OnlineLessonsComponent {
  activeLessonTab: string = 'Расписание';
  isCreateStudentModalOpen = false;
  showAdditionalInfo = false;

  switchLessonTab(tab: string): void {
    this.activeLessonTab = tab;
  }

  // Methods related to calendar logic:
  currentWeekStart: Date = new Date();
  hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];
  startHour: string = '09:00';
  endHour: string = '22:00';
  timezones = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00',
    'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00',
    'UTC+05:00', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
  ];
  frequencies = [
    '1 раз в неделю', '2 раза в неделю', '3 раза в неделю', '4 раза в неделю',
    '5 раз в неделю', '6 раз в неделю', '7 раз в неделю'
  ];
  daysWithDates: string[] = [];
  showButton: { [key: string]: boolean } = {};
  activeSlots: Record<string, boolean> = {};
  currentTimeSlot: { day: string; hour: string } | null = null;
  settingsMenuOpen = false;

  showModal = false;
  showNewLessonModal = false;
  activeModalTab: string = 'individual';

  constructor(private route: ActivatedRoute, private router: Router) {}


  ngOnInit(): void {
    this.daysWithDates = this.getWeekDates().map(date => date.toISOString().split('T')[0]);
    this.loadHourRangeFromLocalStorage();
    this.route.queryParams.subscribe(params => {
      if (params['activeTab']) {
        this.activeLessonTab = params['activeTab'];
      }
    });
    this.loadTeachers();
    this.initializeDaysWithDates();
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 60000);

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
      this.saveHourRangeToLocalStorage();
    }
  }

  onEndHourChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.endHour = target.value;
      this.saveHourRangeToLocalStorage();
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

  openNewLessonModal(): void {
    this.showModal = false; // Закрываем первую модалку
    this.showNewLessonModal = true; // Открываем модалку с вкладками
  }

  closeNewLessonModal(): void {
    this.showNewLessonModal = false;
  }


  closeModal(): void {
    this.showModal = false;
  }

  switchModalTab(tab: string): void {
    this.activeModalTab = tab;
  }

  openCreateStudentModal(): void {
    this.isCreateStudentModalOpen = true;
  }

  closeCreateStudentModal(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isCreateStudentModalOpen = false;
  }

  toggleAdditionalInfo(): void {
    this.showAdditionalInfo = !this.showAdditionalInfo;
  }

  // тарифы
  showTariffModal: boolean = false; // Управляет отображением <app-tariff-status>

  openTariffModal(): void {
    this.showTariffModal = true; // Открыть модалку
  }

  closeTariffModal(): void {
    this.showTariffModal = false; // Закрыть модалку
  }

  showAccessModal: boolean = false;

  openAccessModal(): void {
    this.showAccessModal = true;
  }

  closeAccessModal(): void {
    this.showAccessModal = false;
  }

  // вкладка учителя
  tooltipVisible: string | null = null;
  isCreateTeacherModalOpen = false;
  teachers: Array<{ name: string; id: number; email: string; nativeLanguage: string }> = [];

  showTooltip(role: string): void {
    console.log("hello");
    this.tooltipVisible = role;
  }

  hideTooltip(): void {
    this.tooltipVisible = null;
  }

  openCreateTeacherModal(): void {
    this.isCreateTeacherModalOpen = true;
  }

  closeCreateTeacherModal(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isCreateTeacherModalOpen = false;
  }

  openTeacherProfile(id: number): void {
    this.router.navigate([`/student-dashboard/users/teacher/${id}`]);
  }

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

  platforms = [
    { value: 'Skype', label: 'Skype', icon: 'bi bi-skype' },
    { value: 'Zoom', label: 'Zoom', icon: 'bi bi-camera-video' }
  ];

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

  selectedLanguages: string = 'Английский';
  availableLanguages = ['Русский', 'Английский', 'Французский'];
  teacherWillFill: boolean = false;
  crossEntryEnabled: boolean = false;
  selectedPlatform = 'Skype';
  selectedFile: File | null = null;
  linkPlaceholder = 'Введите ссылку для Skype';
  linkInput: string | undefined;

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

}
