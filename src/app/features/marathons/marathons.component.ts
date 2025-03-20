import { Component, AfterViewInit, Output, EventEmitter, OnInit } from '@angular/core';
import { Tooltip } from 'bootstrap';

@Component({
  selector: 'app-marathons',
  templateUrl: './marathons.component.html',
  styleUrls: ['./marathons.component.css']
})
export class MarathonsComponent implements AfterViewInit, OnInit {
  @Output() coursesEmitter = new EventEmitter<string[]>();
  document: any;
  // Основные вкладки
  mainTabs: string[] = ['Онлайн-уроки', 'Марафоны', 'Администратор'];
  activeMainTab: string = 'Онлайн-уроки';
  isCreateStudentModalOpen = false;
  showAdditionalInfo = false;

  // Вкладки курсов
  courses: string[] = ['cours DELF B1', 'cours DALF B2', 'cours DALF C1', 'cours DALF C2'];
  selectedCourse: string | null = null;
  isCourseOpen: boolean = false; // ❗️ Новый флаг для "разворачивания" курса

  // Вкладки внутри курса
  courseTabs: string[] = ['Statistique', 'Настройка контента', 'Просмотр курса'];
  selectedTab: string | null = null;
  isTabOpen: boolean = false; // ❗️ Новый флаг для "разворачивания" подвкладки

  studentPeriods = ['Сегодня', 'На этой неделе', 'В этом месяце', 'Полгода', 'Год'];
  lessonPeriods = ['Сегодня', 'На этой неделе', 'В этом месяце', 'Полгода', 'Год'];
  selectedStudentPeriod = 'Год';
  selectedLessonPeriod = 'Год';
  currentWeekStart: Date = new Date();
  hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
  timezones = [
    'UTC-12:00', 'UTC-11:00', 'UTC-10:00', 'UTC-09:00', 'UTC-08:00', 'UTC-07:00', 'UTC-06:00', 'UTC-05:00', 'UTC-04:00',
    'UTC-03:00', 'UTC-02:00', 'UTC-01:00', 'UTC+00:00', 'UTC+01:00', 'UTC+02:00', 'UTC+03:00', 'UTC+04:00',
    'UTC+05:00', 'UTC+06:00', 'UTC+07:00', 'UTC+08:00', 'UTC+09:00', 'UTC+10:00', 'UTC+11:00', 'UTC+12:00'
  ];
  frequencies = [
    '1 раз в неделю', '2 раза в неделю', '3 раза в неделю', '4 раза в неделю',
    '5 раз в неделю', '6 раз в неделю', '7 раз в неделю'
  ];
  startHour: string = '09:00';
  endHour: string = '22:00';
  activeLessonTab: string = 'Расписание';
  daysWithDates: string[] = [];
  showButton: { [key: string]: boolean } = {};
  activeSlots: Record<string, boolean> = {};
  currentTimeSlot: { day: string; hour: string } | null = null;
  settingsMenuOpen = false;

  showModal = false;
  showNewLessonModal = false;
  activeModalTab: string = 'individual';

  constructor() {
    this.currentWeekStart = this.getStartOfWeek(new Date());
    this.generateRandomStatistics();
  }

  ngOnInit(): void {
    this.daysWithDates = this.getWeekDates().map(date => date.toISOString().split('T')[0]); // Заполняем дни недели
    this.loadHourRangeFromLocalStorage(); // Загружаем диапазон отображаемых часов
    this.updateCurrentTime(); // Обновляем текущее время
    setInterval(() => this.updateCurrentTime(), 60000); // Запускаем автообновление раз в минуту
    this.loadCourses();
    this.coursesEmitter.emit(this.courses);
  }

  updateCurrentTime() {
    const now = new Date();
    const currentDay = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric' });
    const currentHour = `${now.getHours()}:00`;
    this.currentTimeSlot = { day: currentDay, hour: currentHour };
  }


  switchLessonTab(tab: string): void {
    this.activeLessonTab = tab;
  }

  filterHours(): string[] {
    const startIndex = this.hours.indexOf(this.startHour);
    const endIndex = this.hours.indexOf(this.endHour);
    return this.hours.slice(startIndex, endIndex + 1);
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

  closeTimetableModal(): void {
    this.showModal = false;
  }

  openNewLessonModal(): void {
    this.showModal = false; // Закрываем первую модалку
    this.showNewLessonModal = true; // Открываем модалку с вкладками
  }

  closeNewLessonModal(): void {
    this.showNewLessonModal = false;
  }

  switchModalTab(tab: string): void {
    this.activeModalTab = tab;
  }

  // Данные для статистики (могут обновляться в будущем API-запросом)
  statistics: {
    balance: number;
    totalLessons: number;
    students: number;
    teachers: number;
    studentsChartData: number[]; // ✅ Указан тип number[]
    lessonsChartData: number[];  // ✅ Указан тип number[]
  } = {
      balance: 0,
      totalLessons: 0,
      students: 0,
      teachers: 0,
      studentsChartData: [], // ✅ Избегаем never[]
      lessonsChartData: [],  // ✅ Избегаем never[]
    };




  switchMainTab(tab: string) {
    this.activeMainTab = tab;
  }

  // Метод выбора курса (включает/выключает курс)
  selectCourse(course: string) {
    if (this.selectedCourse === course) {
      this.isCourseOpen = !this.isCourseOpen; // ❗️ Переключаем состояние (свернуть/развернуть)
      if (!this.isCourseOpen) {
        this.selectedCourse = null;
        this.selectedTab = null;
        this.isTabOpen = false; // ❗️ Закрываем всё при закрытии курса
      }
    } else {
      this.selectedCourse = course;
      this.isCourseOpen = true;
      this.selectedTab = null; // ❗️ Сбрасываем подвкладку при выборе нового курса
      this.isTabOpen = false;
    }
  }

  // Метод выбора подвкладки (включает/выключает содержимое)
  selectTab(tab: string) {
    if (this.selectedTab === tab) {
      this.isTabOpen = !this.isTabOpen; // ❗️ Переключаем состояние подвкладки
      if (!this.isTabOpen) {
        this.selectedTab = null; // ❗️ Сбрасываем выбранную подвкладку
      }
    } else {
      this.selectedTab = tab;
      this.isTabOpen = true;
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

  isLessonScheduled(day: Date, hour: string): boolean {
    // Логика проверки, запланирован ли урок (можно заменить на вашу)
    return false;
  }

  // подвкладка статистики
  // Генерация случайных данных (можно заменить на API-запрос)
  generateRandomStatistics() {
    this.statistics.balance = Math.floor(Math.random() * 50000);
    this.statistics.totalLessons = Math.floor(Math.random() * 200);
    this.statistics.students = Math.floor(Math.random() * 50) + 1;
    this.statistics.teachers = Math.floor(Math.random() * 10) + 1;

    this.statistics.studentsChartData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));
    this.statistics.lessonsChartData = Array.from({ length: 12 }, () => Math.floor(Math.random() * 100));
  }

  // Метод обновления статистики при выборе периода
  updateStatistics() {
    this.generateRandomStatistics();
  }


  //настройка контента
  ngAfterViewInit(): void {
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(tooltipTriggerEl => {
      new Tooltip(tooltipTriggerEl);
    });
  }

  selectedFile: File | null = null;

  selectedCourseId: number | null = null;
  showDeleteModal = false;

  // Функция для обработки выбора файла
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Выбранный файл:', this.selectedFile.name);
    }
  }

  // Открытие модального окна удаления
  openDeleteModal(courseId: number): void {
    this.selectedCourseId = courseId;
    this.showDeleteModal = true;
  }

  // Закрытие модального окна удаления
  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  // Удаление курса
  deleteCourse(): void {
    if (this.selectedCourseId !== null) {
      this.coursesCreated = this.coursesCreated.filter(course => course.id !== this.selectedCourseId);
      this.selectedCourseId = null;
      this.closeDeleteModal();
    }
  }


  //фильтры => oсновные

  isFilterModalOpen = false;
  selectedFilters: any = {}; // Объект для хранения выбранных значений фильтров

  filters = [
    { label: 'Язык', placeholder: 'Выберите язык', type: 'language', options: ['Русский', 'Английский', 'Испанский'] },
    { label: 'Возраст', placeholder: 'Выберите возраст', type: 'age', options: ['Дети', 'Подростки', 'Взрослые'] },
    { label: 'Уровень', placeholder: 'Выберите уровень', type: 'level', options: ['Начальный', 'Средний', 'Продвинутый'] },
    { label: 'Тип', placeholder: 'Выберите тип', type: 'type', options: ['Общий', 'Бизнес', 'Для путешествий'] },
    { label: 'Навыки', placeholder: 'Выберите навык', type: 'skills', options: ['Грамматика', 'Лексика', 'Письмо'] },
    { label: 'Время', placeholder: 'Выберите время', type: 'time', options: ['Утро', 'День', 'Вечер'] },
    { label: 'Грамматика', placeholder: 'Введите тип', type: 'grammar', options: ['Основы', 'Продвинутый'] },
    { label: 'Лексика', placeholder: 'Выберите лексику', type: 'vocabulary', options: ['Базовая', 'Продвинутая'] },
    { label: 'Функции', placeholder: 'Выберите функции', type: 'functions', options: ['Разговор', 'Письмо', 'Чтение'] },
    { label: 'Другое', placeholder: 'Выберите тег', type: 'other', options: ['Дополнительный', 'Специальный'] }
  ];



  openFilterModal(): void {
    this.isFilterModalOpen = true;
  }

  closeFilterModal(): void {
    this.isFilterModalOpen = false;
  }

  resetFilters(): void {
    this.selectedFilters = {}; // Сбрасываем все выбранные фильтры
    console.log('Сбросить все фильтры');
  }

  applyFilters(): void {
    console.log('Применить фильтры', this.selectedFilters);
    // Логика применения выбранных фильтров
  }

  ///////////////////////////////// интерактивная карта
  isCreateBoardModalOpen = false;

  openCreateBoardModal(): void {
    this.isCreateBoardModalOpen = true;
    console.log('Открытие модального окна для создания новой доски');
  }

  closeCreateBoardModal(): void {
    this.isCreateBoardModalOpen = false;
    console.log('Закрытие модального окна для создания новой доски');
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('coverUpload') as HTMLInputElement;
    fileInput?.click();
  }

  ///////////////////////////////////////////////////////////////////////создание курса
  showCreateCourseModal = false;
  newCourseName = '';
  coursesCreated: { id: number; name: string; letter: string }[] = [];


  // Открываем модальное окно
  openCreateCourseModal(): void {
    this.showCreateCourseModal = true;
  }

  // Закрываем модальное окно
  closeCreateCourseModal(): void {
    this.showCreateCourseModal = false;
    this.newCourseName = ''; // Очищаем поле
  }

  // Создание курса (можно добавить генерацию ID и сохранение в массив)
  createCourse(): void {
    if (this.newCourseName.trim()) {
      const newCourse = {
        id: this.generateCourseId(),
        name: this.newCourseName,
        letter: this.newCourseName.charAt(0).toUpperCase()
      };
      this.coursesCreated.push(newCourse);
      this.saveCourses();
      this.closeCreateCourseModal();
    }
  }

  saveCourses(): void {
    localStorage.setItem('courses', JSON.stringify(this.coursesCreated));
  }

  loadCourses(): void {
    const savedCourses = localStorage.getItem('courses');
    if (savedCourses) {
      this.coursesCreated = JSON.parse(savedCourses);
    }
  }

  // Метод генерации уникального ID
  private generateCourseId(): number {
    return this.coursesCreated.length > 0
      ? Math.max(...this.coursesCreated.map(course => course.id)) + 1
      : 1;
  }

  //свернуть расписание
  isTimetableCollapsed = false; // 

  toggleTimetable(): void {
    this.isTimetableCollapsed = !this.isTimetableCollapsed;
  }

}
