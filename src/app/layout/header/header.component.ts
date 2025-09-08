import { Component } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { BackgroundService } from '../../services/background.service';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../../environment';


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
      if (!environment.production) {
        console.log('[HeaderComponent] Role changed. settingsLink =', this.settingsLink);
      }
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
      if (!environment.production) {
        console.error('Failed to load dark theme CSS');
      }
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

    this.router.navigate(['student/home']).then(() => {
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

    this.router.navigate(['teacher/home']).then(() => {
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






  //for class
  isLessonMaterialRoute = false;

  // Управление модальным окном "Пользователи"
  isUserModalOpen = false;

  // Управление модальным окном "Добавить учеников"
  showAddStudentModal = false;

  // Пример списка пользователей
  users: { initials: string; name: string; email: string; id: number; role: string; online: boolean; }[] = [
    {
      initials: 'J',
      name: 'Jean',
      email: 'coding_german@',
      id: 2477981,
      role: 'student',
      online: true,
    },
    {
      initials: 'A',
      name: 'Alice',
      email: 'alice@example.com',
      id: 1234567,
      role: 'student',
      online: false,
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
    if (!environment.production) {
      console.log('Перейти на другой урок');
    }
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
    if (!environment.production) {
      console.log('Добавить по ссылке');
    }
    // Реализуйте логику добавления по ссылке
  }

  addStudentByEmail(): void {
    if (!environment.production) {
      console.log('Добавить по эл. почте');
    }
    // Реализуйте логику добавления по электронной почте
  }

  addStudentFromExisting(): void {
    if (!environment.production) {
      console.log('Выбрать из существующих');
    }
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
        if (!environment.production) {
          console.log('Добавлен ученик:', this.selectedStudent);
        }
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
    if (!environment.production) {
      console.log('Пользователь покинул класс'); // Логика выхода (если есть дополнительные действия)
    }
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
      if (!environment.production) {
        console.log(`Выбран файл для ${type}:`, file.name);
      }

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
    if (!environment.production) {
      console.log("selected bg");
    }

    this.selectedBackground = imageUrl; // Устанавливаем временный фон
  }

  saveSettings(): void {
    // Сохраняем фон через сервис
    this.backgroundService.setBackground(this.selectedBackground);

    // Сохраняем обложку
    if (this.classCover) {
      if (!environment.production) {
        console.log('Сохранена обложка:', this.classCover);
      }
      localStorage.setItem('classCover', this.classCover); // Сохраняем обложку в localStorage
    }

    // Сохраняем фон
    if (this.selectedBackground) {
      if (!environment.production) {
        console.log('Сохранён фон:', this.selectedBackground);
      }
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

  logout(): void {
    // Вызываем logout из AuthService
    this.authService.logout();
    // Перенаправляем на страницу логина
    this.router.navigate(['/login']);
  }

}
