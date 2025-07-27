import { Component } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { DashboardService } from '../../services/dashboard.service';
import { BackgroundService } from '../../services/background.service';
import { LessonTabsService } from '../../services/lesson-tabs.service';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

// TODO : refactoriser ce composant header qui est devenu très volumineux
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

    // on vérifie la route actuelle au chargement du composant
    this.checkLessonMaterialRoute();

    // on charge la couverture depuis localStorage
    const savedCover = localStorage.getItem('classCover');
    if (savedCover) {
      this.classCover = savedCover; // on définit la couverture
    }

    // on charge le fond depuis localStorage
    const savedBackground = localStorage.getItem('selectedBackground');
    if (savedBackground) {
      this.selectedBackground = savedBackground; // on définit le fond
      this.backgroundService.setBackground(this.selectedBackground); // on applique le fond
    }

    this.lessonTabsService.tabsVisible$.subscribe((isVisible) => {
      this.showTabs = isVisible;
    });

    this.lessonTabsService.activeTab$.subscribe((tab) => {
      this.activeLessonTab = tab;
    });

    this.authService.currentRole$.subscribe(role => {
      this.setSettingsLink();
      console.log('[Header] Changement de rôle. settingsLink =', this.settingsLink);
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
    const currentUrl = this.router.url; // on récupère l'URL actuelle
    const lessonRegex = /^\/classroom\/\d+\/lesson$/; // expression régulière pour la route classroom/:id/lesson
    this.isLessonMaterialRoute = lessonRegex.test(currentUrl); // on vérifie la correspondance
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

  // tour de démonstration
  isTourModalOpen = false;
  currentStep = 0;
  modalPosition = 'relative';
  modalTop = '';
  modalLeft = '';

  tourSteps = [
    {
      title: 'Bienvenue sur ProgressMe!',
      content: 'ProgressMe est une plateforme interactive d\'enseignement. Ici vous pouvez donner des cours en ligne en direct ou créer des cours pour un apprentissage asynchrone. Dans cette courte démonstration, vous découvrirez les principales fonctionnalités et sections de la plateforme.',
    },
    {
      title: 'Sections du tableau de bord',
      content: 'Ici se trouvent les modules activés de la plateforme...',
      position: { top: '250px', left: '10px' }, // ajustement de la position
      highlightElementId: 'sidebar' // ID de l'élément à mettre en surbrillance
    },
    {
      title: 'Paramètres de la plateforme',
      content: 'Dans les Paramètres se trouve l\'édition du profil personnel...',
      position: { top: '200px', left: '10px' }, // la position peut être ajustée si nécessaire
      highlightElementId: 'settings' // ID de l'élément à mettre en surbrillance (si nécessaire)
    },
    {
      title: 'Tarifs, historique des paiements et codes promo',
      content: 'Allez dans cette section pour choisir un plan tarifaire adapté, voir l\'historique des paiements ou entrer un code promo.',
      position: { top: '255px', left: '10px' }, // la position peut être ajustée si nécessaire
      highlightElementId: 'tariffs' // ID de l'élément à mettre en surbrillance (si nécessaire)
    },
    {
      title: 'Cours en ligne en temps réel',
      content: 'Dans cette section, vous pourrez donner des cours individuels ou de groupe en temps réel. Invitez les étudiants et créez pour eux des classes en ligne avec du matériel pédagogique interactif, appel vidéo, chat et tableau virtuel. Toutes les actions en classe seront instantanément synchronisées entre vous et les étudiants. Ajoutez des cours au planning pour que les étudiants sachent quand aura lieu le prochain cours.',
      position: { top: '70px', left: '10px' }, // la position peut être ajustée si nécessaire
      highlightElementId: 'online-courses' // ID de l'élément à mettre en surbrillance (si nécessaire)
    },
    {
      title: 'Cours en ligne pour l\'apprentissage asynchrone',
      content: 'Ici sont créés et dispensés des cours en ligne d\'auteur pour l\'apprentissage autonome. Plus de 25 types d\'exercices interactifs avec vérification automatique, 5 modes de progression, comptage des points et tableau des leaders. Les participants pourront suivre les cours au moment qui leur convient, et vous pourrez donner des retours pour chaque leçon et exercice.',
      position: { top: '30px', left: '10px' },
      highlightElementId: 'online-courses'
    },
    {
      title: 'Matériel pédagogique',
      content: 'Ici sont stockés les manuels interactifs et leçons prêtes des méthodologistes de la plateforme ou de vos collègues, que vous pouvez utiliser en cours. Et s\'il n\'y a pas de leçon appropriée dans le catalogue, le constructeur de leçons avec 25+ modèles d\'exercices et assistant IA vous aidera à créer votre propre matériel.',
      position: { top: '130px', left: '10px' },
      highlightElementId: 'online-courses'
    },
    {
      title: 'En savoir plus sur la plateforme',
      content: 'Dans notre base de connaissances, vous trouverez des articles éducatifs avec des instructions détaillées pour travailler sur la plateforme.',
      position: { top: '-200px', left: '650px' },
      highlightElementId: 'online-courses'
    },
    {
      title: 'Si vous avez besoin d\'aide',
      content: 'Écrivez-nous au support en cliquant sur cette icône. Nous sommes disponibles de 9h00 à 21h00 (GMT+3).',
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
    this.removeHighlight(); // on supprime l'overlay à la fermeture
  }

  nextStep(): void {
    const modalElements = document.querySelectorAll('.modal.show.d-block, .modal.fade');
    modalElements.forEach(modal => {
      // conversion vers le type HTMLElement pour l'accès à la propriété 'style'
      if (modal instanceof HTMLElement) {
        const currentBgColor = window.getComputedStyle(modal).backgroundColor;
        if (currentBgColor === 'rgba(0, 0, 0, 0.5)') {
          // s'il existe déjà, on le supprime
          modal.style.backgroundColor = 'transparent';
        }
      }
    });
    // passage à l'étape suivante
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
        // à la première étape la modale reste par défaut
        modalDialog.style.position = '';
        modalDialog.style.top = '';
        modalDialog.style.left = '';
        modalDialog.style.transform = ''; // on supprime toute transformation

        // on ne supprime pas le voile, on met à jour sa position
        this.addHighlightOverlay();
      } else {
        // on applique la position à la deuxième étape et suivantes
        modalDialog.style.position = 'absolute';
        modalDialog.style.top = step.position?.top || '0px'; // on utilise les coordonnées de l'étape, si elles existent
        modalDialog.style.left = step.position?.left || '0px';
        modalDialog.style.transform = ''; // on applique toute autre transformation, si nécessaire

        // mise en surbrillance de l'élément sélectionné
        if (step.highlightElementId) {
          this.addHighlightOverlay(step.position);
        } else {
          this.removeHighlight();
        }
      }
    }
  }

  addHighlightOverlay(position?: { top: string; left: string }): void {
    // on supprime l'highlightOverlay existant, s'il y en a un
    let existingHighlightOverlay = document.getElementById('highlight-overlay');
    if (existingHighlightOverlay) {
      existingHighlightOverlay.remove();
    }

    // on crée un nouveau highlightOverlay
    const highlightOverlay = document.createElement('div');
    highlightOverlay.id = 'highlight-overlay';
    highlightOverlay.style.position = 'fixed';
    highlightOverlay.style.top = '0';
    highlightOverlay.style.left = '0';
    highlightOverlay.style.width = '100vw';
    highlightOverlay.style.height = '100vh';
    highlightOverlay.style.background = 'rgba(0, 0, 0, 0.5)'; // couleur de fond permanente
    highlightOverlay.style.zIndex = '1040'; // on s'assure que c'est au-dessus des autres éléments
    highlightOverlay.style.pointerEvents = 'none'; // on laisse passer les clics
    document.body.appendChild(highlightOverlay);

    if (position) {// on calcule les dimensions et la position du "trou"
      let top = parseInt(position.top.replace('px', ''), 10) - 150;
      let left = parseInt(position.left.replace('px', ''), 5);
      let width = 64; // largeur de la zone
      let height = 418; // hauteur de la zone

      // changement de hauteur à la troisième étape
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
