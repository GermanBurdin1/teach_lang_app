import { Component, OnInit } from '@angular/core';

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
  linkPlaceholder = 'Введите ссылку для Skype';
  linkInput: string | undefined;
  teachers: Array<{ name: string; id: number; email: string; nativeLanguage: string }> = [];

  newTeacher: { name: string; email: string; nativeLanguage: string; id: number } = {
    name: '',
    email: '',
    nativeLanguage: '',
    id: Date.now(),
  };

  addTeacher() {
    this.newTeacher.id = Date.now();

    this.teachers.push({ ...this.newTeacher });

    this.isCreateTeacherModalOpen = false;

    this.newTeacher = {
      name: '',
      email: '',
      nativeLanguage: '',
      id: Date.now(),
    };
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
    '1 раз в неделю', '2 раза в неделю', '3 раза в неделю', '4 раза в неделю',
    '5 раз в неделю', '6 раз в неделю', '7 раз в неделю'
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
  daysWithDates: string[] = [];
  hours: string[] = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  showButton: { [key: string]: boolean } = {};
  activeSlots: Record<string, boolean> = {};
  teacherWillFill: boolean = false;
  currentTimeSlot: { day: string; hour: string } | null = null;
  crossEntryEnabled: boolean = false;

  ngOnInit() {
    this.initializeDaysWithDates();
    this.updateCurrentTime();
    setInterval(() => this.updateCurrentTime(), 60000); // Обновление каждые 60 секунд
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
}

