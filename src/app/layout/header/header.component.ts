import { Component } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { BackgroundService } from '../../services/background.service';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';


@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  showTabs = false;
  activeLessonTab: 'cards' | 'lesson' | 'homework' = 'cards';
  isHeaderExpanded = false;
  showLessonDescription = false;
  lessonDescription$!: Observable<{ lesson: string; course: string } | null>;
  isLessonStarted$!: Observable<boolean>;
  settingsLink: string = '';
  
  // Dark mode functionality
  isDarkMode = false;
  private darkThemeLink: HTMLLinkElement | null = null;

  constructor(private router: Router, private dashboardService: DashboardService, private activatedRoute: ActivatedRoute, private backgroundService: BackgroundService, private lessonTabsService: LessonTabsService, public authService: AuthService) { }

  ngOnInit(): void {

    this.lessonDescription$ = this.lessonTabsService.lessonDescription$;
    this.isLessonStarted$ = this.lessonTabsService.lessonStarted$;

    // Initialize dark mode from localStorage
    this.isDarkMode = localStorage.getItem('darkMode') === 'true';
    this.applyTheme();

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkLessonMaterialRoute();
      });

    // Проверяем текущий маршрут при загрузке компонента
    this.checkLessonMaterialRoute();

    // Загружаем обложку из localStorage
    const savedCover = localStorage.getItem('classCover');
    if (savedCover) {
      this.classCover = savedCover; // Устанавливаем обложку
    }

    // Загружаем фон из localStorage
    const savedBackground = localStorage.getItem('selectedBackground');
    if (savedBackground) {
      this.selectedBackground = savedBackground; // Устанавливаем фон
      this.backgroundService.setBackground(this.selectedBackground); // Применяем фон
    }

    this.lessonTabsService.tabsVisible$.subscribe((isVisible) => {
      this.showTabs = isVisible;
    });

    this.lessonTabsService.activeTab$.subscribe((tab) => {
      this.activeLessonTab = tab;
    });

    this.authService.currentRole$.subscribe(role => {
      this.setSettingsLink();
      console.log('[HeaderComponent] Role changed. settingsLink =', this.settingsLink);
    });

  }

  // Dark mode toggle functionality
  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('darkMode', this.isDarkMode.toString());
    this.applyTheme();
  }

  private applyTheme(): void {
    const body = document.body;
    
    if (this.isDarkMode) {
      // Add dark-theme class to body
      body.classList.add('dark-theme');
      
      // Dynamically load dark theme CSS if not already loaded
      if (!this.darkThemeLink) {
        this.loadDarkThemeCSS();
      }
    } else {
      // Remove dark-theme class from body
      body.classList.remove('dark-theme');
      
      // Remove dark theme CSS link
      if (this.darkThemeLink) {
        this.removeDarkThemeCSS();
      }
    }
  }

  private loadDarkThemeCSS(): void {
    this.darkThemeLink = document.createElement('link');
    this.darkThemeLink.rel = 'stylesheet';
    this.darkThemeLink.type = 'text/css';
    this.darkThemeLink.href = 'assets/themes/dark-theme.css';
    this.darkThemeLink.id = 'dark-theme-styles';
    
    // Add error handler for debugging
    this.darkThemeLink.onerror = () => {
      console.error('Failed to load dark theme CSS');
    };
    
    document.head.appendChild(this.darkThemeLink);
  }

  private removeDarkThemeCSS(): void {
    if (this.darkThemeLink) {
      document.head.removeChild(this.darkThemeLink);
      this.darkThemeLink = null;
    }
  }

  setActiveTab(tab: 'cards' | 'lesson' | 'homework'): void {
    this.lessonTabsService.setActiveTab(tab);
  }

  private checkLessonMaterialRoute(): void {
    const currentUrl = this.router.url; // Получаем текущий URL
    const lessonRegex = /^\/classroom\/\d+\/lesson$/; // Регулярное выражение для маршрута classroom/:id/lesson
    this.isLessonMaterialRoute = lessonRegex.test(currentUrl); // Проверяем соответствие
  }

  toggleExpandHeader(): void {
    this.isHeaderExpanded = !this.isHeaderExpanded;
  }

  switchToStudent(): void {
    this.isHeaderExpanded = false;

    const user = this.authService.getCurrentUser();
    if (user) {
      user.currentRole = 'student';
      this.authService.setUser(user);
      this.setSettingsLink();
    }

    this.router.navigate(['student/wordsTeaching']).then(() => {
      this.dashboardService.switchToStudentDashboard();
    });
  }

  switchToTeacher(): void {
    this.isHeaderExpanded = false;

    const user = this.authService.getCurrentUser();
    if (user) {
      user.currentRole = 'teacher';
      this.authService.setUser(user);
      this.setSettingsLink();
    }

    this.router.navigate(['teacher/wordsTeaching']).then(() => {
      this.dashboardService.switchToTeacherDashboard();
    });
  }

  switchToAdmin(): void {
    this.isHeaderExpanded = false;

    const user = this.authService.getCurrentUser();
    if (user) {
      user.currentRole = 'admin';
      this.authService.setUser(user);
      this.setSettingsLink();
    }

    this.router.navigate(['admin/home']).then(() => {
      this.dashboardService.switchToSchoolDashboard();
    });
  }


  // ajouter de l'argent
  showBalanceModal = false;
  isPaymentModalOpen = false;
  amountToTopUp: number = 0;

  openBalanceModal(): void {
    this.showBalanceModal = true;
  }

  closeBalanceModal(): void {
    this.showBalanceModal = false;
  }

  payWithCard(): void {
    this.showBalanceModal = false;
    this.isPaymentModalOpen = true;
  }

  closePaymentModal(): void {
    this.isPaymentModalOpen = false;
  }

  // демо-тур
  isTourModalOpen = false;
  currentStep = 0;
  modalPosition = 'relative';
  modalTop = '';
  modalLeft = '';

  tourSteps = [
    {
      title: 'Добро пожаловать на ProgressMe!',
      content: 'ProgressMe - это интерактивная платформа для преподавания. Здесь можно проводить онлайн-уроки вживую или создавать курсы для асинхронной работы. В этой короткой демонстрации вы познакомитесь с основными возможностями и разделами платформы.',
    },
    {
      title: 'Разделы личного кабинета',
      content: 'Здесь находятся активированные модули платформы...',
      position: { top: '250px', left: '10px' }, // Корректировка положения
      highlightElementId: 'sidebar' // ID элемента для подсветки
    },
    {
      title: 'Настройки платформы',
      content: 'В Настройках расположено редактирование личного профиля...',
      position: { top: '200px', left: '10px' }, // Позиция может быть скорректирована при необходимости
      highlightElementId: 'settings' // ID элемента для подсветки (если необходимо)
    },
    {
      title: 'Тарифы, история оплат и промокоды',
      content: 'Перейдите в этот раздел чтобы выбрать подходящий тарифный план, посмотреть историю оплат или ввести промокод.',
      position: { top: '255px', left: '10px' }, // Позиция может быть скорректирована при необходимости
      highlightElementId: 'tariffs' // ID элемента для подсветки (если необходимо)
    },
    {
      title: 'Онлайн-уроки в реальном времени',
      content: 'В этом разделе вы сможете проводить индивидуальные или групповые уроки в режиме реального времени. Приглашайте учеников и создавайте для них онлайн-классы с интерактивными учебными материалами, видесвязью, чатом и виртуальной доской. Все действия в классе будут мгновенно синхронизироваться между вами и учениками. Добавляйте уроки в расписание, чтобы ученики знали, когда будет следующий урок..',
      position: { top: '70px', left: '10px' }, // Позиция может быть скорректирована при необходимости
      highlightElementId: 'online-courses' // ID элемента для подсветки (если необходимо)
    },
    {
      title: 'Онлайн-курсы для асинхронного обучения',
      content: 'Здесь создаются и проводятся  авторские онлайн-курсы для самостоятельного обучения.Более 25 видов интерактивных заданий с автопроверкой, 5 режимов прохождения, подсчёт баллов и таблица лидеров. Участники смогут проходить курсы в удобное время, а вы сможете давать обратную связь для каждого урока и упражнения.',
      position: { top: '30px', left: '10px' },
      highlightElementId: 'online-courses'
    },
    {
      title: 'Учебные материалы',
      content: 'Здесь хранятся интерактивные учебники и готовые уроки от методистов платформы или ваших  коллег, которые вы можете использовать на занятиях. А если подходящего урока нет в каталоге, создать собственные материалы поможет конструктор уроков с 25+ шаблонами упражнений и AI-ассистентом. ',
      position: { top: '130px', left: '10px' },
      highlightElementId: 'online-courses'
    },
    {
      title: 'Подробнее о платформе',
      content: 'В нашей базе знаний вы найдёте обучающие статьи с подробными инструкциями для работы на платформе.',
      position: { top: '-200px', left: '650px' },
      highlightElementId: 'online-courses'
    },
    {
      title: 'Если понадобится помощь',
      content: 'Напишите нам в поддержку, нажав на эту иконку. Мы на связи с с 9:00 до 21:00 (GMT+3).',
      position: { top: '-200px', left: '650px' },
      highlightElementId: 'online-courses'
    }
  ];

  openTourModal(): void {
    this.isTourModalOpen = true;
    this.currentStep = 0;
    this.updateModalPosition();
    this.addHighlightOverlay();
  }

  closeTourModal(): void {
    this.isTourModalOpen = false;
    this.removeHighlight(); // Удаляем overlay при закрытии
  }

  nextStep(): void {
    const modalElements = document.querySelectorAll('.modal.show.d-block, .modal.fade');
    modalElements.forEach(modal => {
      // Приведение к типу HTMLElement для доступа к свойству 'style'
      if (modal instanceof HTMLElement) {
        const currentBgColor = window.getComputedStyle(modal).backgroundColor;
        if (currentBgColor === 'rgba(0, 0, 0, 0.5)') {
          // Если уже есть, удаляем его
          modal.style.backgroundColor = 'transparent';
        }
      }
    });
    // Переход на следующий шаг
    this.currentStep++;
    if (this.currentStep < this.tourSteps.length) {
      this.updateModalPosition();
    } else {
      this.closeTourModal();
    }
  }

  previousStep(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.updateModalPosition();
    }
  }

  updateModalPosition(): void {
    const step = this.tourSteps[this.currentStep];

    const modalDialog = document.querySelector('.modal-dialog') as HTMLElement;
    if (modalDialog) {
      if (this.currentStep === 0) {
        // На первом шаге модалка остается по умолчанию
        modalDialog.style.position = '';
        modalDialog.style.top = '';
        modalDialog.style.left = '';
        modalDialog.style.transform = ''; // Удаляем любые трансформации

        // Не удаляем вуаль, а обновляем её положение
        this.addHighlightOverlay();
      } else {
        // Применяем позицию на втором и следующих шагах
        modalDialog.style.position = 'absolute';
        modalDialog.style.top = step.position?.top || '0px'; // Используем координаты из шага, если есть
        modalDialog.style.left = step.position?.left || '0px';
        modalDialog.style.transform = ''; // Применяем любые другие трансформации, если нужно

        // Подсветка выделенного элемента
        if (step.highlightElementId) {
          this.addHighlightOverlay(step.position);
        } else {
          this.removeHighlight();
        }
      }
    }
  }


  addHighlightOverlay(position?: { top: string; left: string }): void {
    // Удаляем существующий highlightOverlay, если он есть
    let existingHighlightOverlay = document.getElementById('highlight-overlay');
    if (existingHighlightOverlay) {
      existingHighlightOverlay.remove();
    }

    // Создаем новый highlightOverlay
    const highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'highlight-overlay';
    highlightOverlay.style.position = 'fixed';
    highlightOverlay.style.top = '0';
    highlightOverlay.style.left = '0';
    highlightOverlay.style.width = '100vw';
    highlightOverlay.style.height = '100vh';
    highlightOverlay.style.background = 'rgba(0, 0, 0, 0.5)'; // Постоянный цвет фона
    highlightOverlay.style.zIndex = '1040'; // Убедитесь, что это выше других элементов
    highlightOverlay.style.pointerEvents = 'none'; // Пропускаем клики
    document.body.appendChild(highlightOverlay);

    if (position) {// Рассчитываем размеры и позицию "дырки"
      let top = parseInt(position.top.replace('px', ''), 10) - 150;
      let left = parseInt(position.left.replace('px', ''), 5);
      let width = 64; // Ширина области
      let height = 418; // Высота области

      // Изменение высоты на третьем шаге
      if (this.currentStep === 2) {
        top = parseInt(position.top.replace('px', ''), 0) + 210;
        height = 50;
      }

      if (this.currentStep === 3) {
        top = parseInt(position.top.replace('px', ''), 0) + 210;
        height = 50;
      }

      if (this.currentStep === 4) {
        top = parseInt(position.top.replace('px', ''), 0) + 145;
        height = 50;
      }

      if (this.currentStep === 5) {
        top = parseInt(position.top.replace('px', ''), 0) + 130;
        height = 50;
      }

      if (this.currentStep === 6) {
        top = parseInt(position.top.replace('px', ''), 0) + 145;
        height = 50;
      }

      if (this.currentStep === 7) {
        top = 9;
        left = 940;
        width = 140;
        height = 50;
      }

      if (this.currentStep === 8) {
        top = 700;
        left = 1300;
        width = 140;
        height = 700;
      }


      // Устанавливаем clip-path для создания "дырки"
      highlightOverlay.style.clipPath = `
				polygon(
					0 0,
					100% 0,
					100% 100%,
					0 100%,
					0 0,
					${left}px ${top}px,
					${left}px ${top + height}px,
					${left + width}px ${top + height}px,
					${left + width}px ${top}px,
					${left}px ${top}px
				)`;
    }

  }

  removeHighlight(): void {
    const highlightOverlay = document.getElementById('highlight-overlay');
    if (highlightOverlay) {
      highlightOverlay.remove();
    }
  }

  //for class
  isLessonMaterialRoute = false;

  // Управление модальным окном "Пользователи"
  isUserModalOpen = false;

  // Управление модальным окном "Добавить учеников"
  showAddStudentModal = false;

  // Пример списка пользователей
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

  openUserModal(): void {
    this.isUserModalOpen = true;
  }

  // Закрыть модальное окно для пользователей
  closeUserModal(): void {
    this.isUserModalOpen = false;
  }

  // Открыть модальное окно "Добавить учеников"
  openAddStudentModal(): void {
    this.showAddStudentModal = true;
  }

  // Закрыть модальное окно "Добавить учеников"
  closeAddStudentModal(): void {
    this.showAddStudentModal = false;
  }

  // Навигация на другой урок
  navigateToLesson(): void {
    // Здесь будет логика навигации
    console.log('Перейти на другой урок');
  }

  tooltipVisible: string | null = null;

  showTooltip(role: string): void {
    this.tooltipVisible = role;
  }

  hideTooltip(): void {
    this.tooltipVisible = null;
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

  // Список всех учеников
  allStudents = [
    { id: 1, name: 'German', email: 'coding_german@', initials: 'J', online: true },
    { id: 2, name: 'Aliska', email: 'alice@example.com', initials: 'A', online: false },
    { id: 3, name: 'Bobchenko', email: 'bob@example.com', initials: 'B', online: true },
    // Добавьте других учеников
  ];


  showStudentListModal: boolean = false; // Переменная для управления отображением модального окна

  openStudentListModal(): void {
    this.showStudentListModal = true; // Открыть модалку
  }

  closeStudentListModal(): void {
    this.showStudentListModal = false; // Закрыть модалку
  }

  showAddAdditionalStudentModal: boolean = false;

  openAddAdditionalStudentModal(): void {
    this.showAddAdditionalStudentModal = true;
    this.currentModalView = 'default';
  }

  closeAddAdditionalStudentModal(): void {
    this.showAddAdditionalStudentModal = false;
  }

  addStudentByLink(): void {
    console.log('Добавить по ссылке');
    // Реализуйте логику добавления по ссылке
  }

  addStudentByEmail(): void {
    console.log('Добавить по эл. почте');
    // Реализуйте логику добавления по электронной почте
  }

  addStudentFromExisting(): void {
    console.log('Выбрать из существующих');
    // Реализуйте логику выбора из существующих
  }

  currentModalView: string = 'default'; // Управление отображением ('default' или 'link')
  inviteLink: string = 'https://new.progressme.ru/invite/1587'; // Ссылка для приглашения

  switchModalView(view: string): void {
    this.currentModalView = view;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.inviteLink);
    alert('Ссылка скопирована!');
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


  getAvailableStudents(): any[] {
    return this.allStudents.filter(
      (user) => !this.users.some((s) => s.id === user.id)
    );
  }

  showStudentTabsModal: boolean = false; // Новая переменная для отображения модалки

  openStudentTabsModal(): void {
    this.showStudentTabsModal = true; // Открываем модалку
    this.activeTab = 'link'; // Начальная вкладка
  }

  closeStudentTabsModal(): void {
    this.showStudentTabsModal = false; // Закрываем модалку
  }

  activeTab: string = 'link'; // Начальная активная вкладка

  switchTab(tab: string): void {
    this.activeTab = tab; // Переключение активной вкладки
  }

  //выйти
  showLeaveClassModal: boolean = false;

  openLeaveClassModal(): void {
    this.showLeaveClassModal = true; // Открыть модалку
  }

  closeLeaveClassModal(): void {
    this.showLeaveClassModal = false; // Закрыть модалку
  }

  confirmLeaveClass(): void {
    console.log('Пользователь покинул класс'); // Логика выхода (если есть дополнительные действия)
    this.closeLeaveClassModal(); // Закрыть модалку
    this.router.navigate(['/school/online-lessons']); // Перенаправить на указанную страницу
  }

  //настройки класса
  showClassSettingsModal: boolean = false;
  openClassSettingsModal(): void {
    this.showClassSettingsModal = true;
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
  //обложка
  classCover: string | null = null;
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

  // openSchedule
  showScheduleModal: boolean = false;

  openScheduleModal(): void {
    this.showScheduleModal = true;
  }

  closeScheduleModal(): void {
    this.showScheduleModal = false;
  }

  shouldShowSwitchTo(role: 'student' | 'teacher' | 'admin'): boolean {
    const user = this.authService.user;

    if (!user) return false;

    const { currentRole, roles } = user;

    // Никогда не показываем текущую роль
    if (role === currentRole) return false;

    // 🔁 Если у пользователя есть роль "admin" в списке, значит он зашёл как админ — показываем все 3 роли, кроме текущей
    if (roles.includes('admin')) return true;

    // ⚠️ В остальных случаях (вошёл не как админ) — показываем только те роли, которые реально доступны
    return roles.includes(role);
  }

  private setSettingsLink(): void {
    const user = this.authService.getCurrentUser();
    const role = user?.currentRole;

    switch (role) {
      case 'admin':
        this.settingsLink = '/admin/settings';
        break;
      case 'teacher':
        this.settingsLink = '/teacher/settings';
        break;
      case 'student':
        this.settingsLink = '/student/settings';
        break;
      default:
        this.settingsLink = '/settings';
    }
  }

  get loggedInAsAdminAccount(): boolean {
  const user = this.authService.user;
  return !!user && Array.isArray(user.roles) && user.roles.includes('admin');
}


}
