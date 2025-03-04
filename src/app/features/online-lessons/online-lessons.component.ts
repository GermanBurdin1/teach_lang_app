import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BackgroundService } from '../../services/background.service';

@Component({
  selector: 'app-online-lessons',
  templateUrl: './online-lessons.component.html',
  styleUrl: './online-lessons.component.css'
})
export class OnlineLessonsComponent {
  activeLessonTab: string = 'Классы';
  isCreateStudentModalOpen = false;
  showAdditionalInfo = false;
  classCover: string | null = null;

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

  constructor(private route: ActivatedRoute, private router: Router, private backgroundService: BackgroundService) { }


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

    this.checkPaidOrTrialStatus();
// Загружаем сохранённые классы из localStorage
const savedClasses = localStorage.getItem('classes');
if (savedClasses) {
  this.classes = JSON.parse(savedClasses);
} else {
  this.classes = [];
}
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
    this.router.navigate([`/cabinet/school/users/teacher/${id}`]);
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

  openSettings(): void {
    console.log('Открытие страницы настроек.');
  }

  //payé
  isPaidOrTrial: boolean = true;

  checkPaidOrTrialStatus(): void {

  }

  isCreateClassModalOpen: boolean = false; // Управляет отображением модального окна
  newClassName: string = ''; // Название нового класса
  classAvatarPreview: string = 'A'; // Предварительный просмотр аватарки
  classes: Array<{ id: number; name: string; description: string }> = []; // Список классов

  openCreateClassModal(): void {
    this.isCreateClassModalOpen = true;
  }

  closeCreateClassModal(event?: MouseEvent): void {
    if (event) event.stopPropagation();
    this.isCreateClassModalOpen = false;
  }

  onClassAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.classAvatarPreview = 'A'; // Заглушка для аватарки, можно заменить логикой чтения файла
      };
      reader.readAsDataURL(file);
    }
  }

  createClass(): void {
    if (this.newClassName.trim() === '') {
      alert('Введите название класса!');
      return;
    }

    const newClass = {
      id: Date.now(),
      name: this.newClassName,
      description: 'Описание класса',
    };

    // Добавляем класс в массив
    this.classes.push(newClass);

    // Сохраняем массив классов в localStorage
    localStorage.setItem('classes', JSON.stringify(this.classes));

    // Очищаем поле и закрываем модалку
    this.newClassName = '';
    this.isCreateClassModalOpen = false;
  }

  openClassManagement(classId: number): void {
    this.router.navigate([`/classroom/${classId}/lesson`]);
    console.log(`Переход к управлению классом с ID: ${classId}`);
  }

  //добавить учеников
  showStudentTabsModal: boolean = false;
  openStudentTabsModal(): void {
    this.showStudentTabsModal = true; // Открываем модалку
    console.log("Открытие модалки: showStudentTabsModal =", this.showStudentTabsModal);

  }

  closeStudentTabsModal(): void {
    this.showStudentTabsModal = false; // Закрываем модалку
  }

  activeTab: string = 'link'; // Начальная активная вкладка

  switchTab(tab: string): void {
    this.activeTab = tab; // Переключение активной вкладки
  }

  showAddAdditionalStudentModal: boolean = false;

  currentModalView: string = 'default'; // Управление отображением ('default' или 'link')
  inviteLink: string = 'https://new.progressme.ru/invite/1587'; // Ссылка для приглашения

  switchModalView(view: string): void {
    this.currentModalView = view;
  }


  openAddAdditionalStudentModal(): void {
    this.showAddAdditionalStudentModal = true;
    this.currentModalView = 'default';
  }

  closeAddAdditionalStudentModal(): void {
    this.showAddAdditionalStudentModal = false;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.inviteLink);
    alert('Ссылка скопирована!');
  }

  users = [
    {
      initials: 'J',
      name: 'Jean',
      email: 'coding_german@',
      id: 2477981,
      role: 'student',
    },
    {
      initials: 'A',
      name: 'Alice',
      email: 'alice@example.com',
      id: 1234567,
      role: 'student',
    },
  ];

  // Список всех учеников
  allStudents = [
    { id: 1, name: 'German', email: 'coding_german@', initials: 'J', online: true },
    { id: 2, name: 'Aliska', email: 'alice@example.com', initials: 'A', online: false },
    { id: 3, name: 'Bobchenko', email: 'bob@example.com', initials: 'B', online: true },
    // Добавьте других учеников
  ];

  getAvailableStudents(): any[] {
    return this.allStudents.filter(
      (user) => !this.users.some((s) => s.id === user.id)
    );
  }

  selectedStudent: any = null;

  selectStudent(student: any): void {
    if (this.selectedStudent?.id === student.id) {
      // Если студент уже выбран, снять выбор
      this.selectedStudent = null;
    } else {
      // Если студент еще не выбран, выбрать
      this.selectedStudent = student;
    }
  }

  addSelectedStudent(): void {
    if (this.selectedStudent) {
      const alreadyExists = this.users.some(
        (s) => s.id === this.selectedStudent.id
      );
      if (!alreadyExists) {
        this.users.push(this.selectedStudent); // Добавить в класс
        console.log('Добавлен ученик:', this.selectedStudent);
      }
      this.selectedStudent = null; // Снять выбор
      this.switchModalView('default'); // Вернуться в начальное состояние
    }
  }

  //пользователи
  openUserModal(): void {
    this.isUserModalOpen = true;
  }

  // Закрыть модальное окно для пользователей
  // Управление модальным окном "Пользователи"
  isUserModalOpen = false;
  closeUserModal(): void {
    this.isUserModalOpen = false;
  }

  getTooltipText(role: string): string {
    switch (role) {
      case 'student':
        return 'Ученик в классе';
      case 'teacher':
        return 'Преподаватель';
      default:
        return '';
    }
  }

  showStudentListModal: boolean = false; // Переменная для управления отображением модального окна

  openStudentListModal(): void {
    this.showStudentListModal = true; // Открыть модалку
  }

  closeStudentListModal(): void {
    this.showStudentListModal = false; // Закрыть модалку
  }

  // Загружаем обложку из localStorage
  savedCover = localStorage.getItem('classCover');
  if (savedCover: any) {
    this.classCover = savedCover; 
  }

  // Загружаем фон из localStorage
  savedBackground = localStorage.getItem('selectedBackground');

  // openSchedule
  showScheduleModal: boolean = false;

  openScheduleModal(): void {
    this.showScheduleModal = true;
  }

  //настройки класса
  showClassSettingsModal: boolean = false;
  openClassSettingsModal(): void {
    this.showClassSettingsModal = true;
  }

  //выйти
  showLeaveClassModal: boolean = false;

  openLeaveClassModal(): void {
    this.showLeaveClassModal = true; // Открыть модалку
  }

  closeClassSettingsModal(): void {
    this.showClassSettingsModal = false;
  }

  tooltipPosition = { top: '0px', left: '0px' };

  classSettingsTooltips = {
    quickTranslation: 'Перевод текста по выделению',
    lessonDuration: 'Продолжительность одного занятия',
    classBackground: 'Выберите фон, который будет отображаться в виртуальном классе',
    statistics: 'Начислять ученикам баллы за верные ответы и отображать их в результатах уроков',
    studentRating: 'Показывать рейтинговую таблицу учеников, согласно набранным баллам.',
  };

  classSettingsTooltip: string | null = null;

  showClassSettingsTooltip(
    type: keyof typeof this.classSettingsTooltips,
    event: MouseEvent
  ): void {
    this.classSettingsTooltip = this.classSettingsTooltips[type] || null;

    // Вычисляем позицию подсказки
    const target = event.target as HTMLElement;
    const rect = target.getBoundingClientRect();
    const modalRect = document.querySelector('.modal-dialog')?.getBoundingClientRect();

    if (modalRect) {
      this.tooltipPosition = {
        top: `${rect.top - modalRect.top + window.scrollY - 30}px`, // Поднимаем подсказку над иконкой
        left: `${rect.left - modalRect.left + rect.width / 2 + 10}px`, // Смещаем правее относительно центра
      };
    } else {
      // Запасной вариант
      this.tooltipPosition = {
        top: `${rect.top + window.scrollY - 30}px`, // Поднимаем над иконкой
        left: `${rect.left + window.scrollX + rect.width / 2 + 10}px`, // Смещаем правее относительно центра
      };
    }
  }

  hideClassSettingsTooltip(): void {
    this.classSettingsTooltip = null;
  }

  //загрузить свой фон
  uploadFile(inputId: string): void {
    const fileInput = document.getElementById(inputId) as HTMLInputElement;
    fileInput.click();
  }

  onFileUpload(event: Event, type: 'cover' | 'background'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      console.log(`Выбран файл для ${type}:`, file.name);

      // Дополнительная обработка
      const reader = new FileReader();
      reader.onload = () => {
        if (type === 'cover') {
          this.classCover = reader.result as string; // Сохраняем обложку
        } else if (type === 'background') {
          this.selectedBackground = reader.result as string; // Сохраняем фон
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // меняе bg в classroom

  selectedBackground: string = ''; // Временный фон

  // Метод для временного выбора фона
  selectBackground(imageUrl: string): void {
    console.log("selected bg");

    this.selectedBackground = imageUrl; // Устанавливаем временный фон
  }

  saveSettings(): void {
    // Сохраняем фон через сервис
    this.backgroundService.setBackground(this.selectedBackground);

    // Сохраняем обложку
    if (this.classCover) {
      console.log('Сохранена обложка:', this.classCover);
      localStorage.setItem('classCover', this.classCover); // Сохраняем обложку в localStorage
    }

    // Сохраняем фон
    if (this.selectedBackground) {
      console.log('Сохранён фон:', this.selectedBackground);
      localStorage.setItem('selectedBackground', this.selectedBackground); // Сохраняем фон в localStorage
    }

    // Закрываем модалку
    this.closeClassSettingsModal();
  }


  closeScheduleModal(): void {
    this.showScheduleModal = false;
  }

}
