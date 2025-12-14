import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { FileUploadService, UploadedFile } from '../../../services/file-upload.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { Router } from '@angular/router';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { CourseService, Course } from '../../../services/course.service';
import { MaterialService, Material } from '../../../services/material.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { HomeworkModalComponent, HomeworkModalData } from '../../../classroom/lesson-material/homework-modal/homework-modal.component';
import { LessonPreviewModalComponent, LessonPreviewModalData } from '../lesson-preview-modal/lesson-preview-modal.component';
import { AddMaterialModalComponent, AddMaterialModalData } from '../add-material-modal/add-material-modal.component';
import { LessonTypeSelectorComponent, LessonType } from '../lesson-type-selector/lesson-type-selector.component';
import { CallLessonSettingsModalComponent, CallLessonSettingsModalData } from '../call-lesson-settings-modal/call-lesson-settings-modal.component';
import { RoleService } from '../../../services/role.service';
import { HomeworkService } from '../../../services/homework.service';
import { forkJoin, firstValueFrom } from 'rxjs';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { PromptDialogComponent, PromptDialogData } from '../prompt-dialog/prompt-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../prompt-dialog/confirm-dialog.component';
import { CourseSettingsModalComponent, CourseSettingsModalData } from './course-settings-modal/course-settings-modal.component';
import { MaterialPreviewModalComponent, MaterialPreviewModalData } from '../material-preview-modal/material-preview-modal.component';

@Component({
  selector: 'app-add-course',
  templateUrl: './add-course.component.html',
  styleUrls: ['./add-course.component.css']
})
export class AddCourseComponent implements OnInit, OnDestroy {
  // Course form data
  courseTitle = '';
  private materialModalListener?: EventListener;
  private materialAddedListener?: EventListener;
  private lessonMaterialsUpdatedListener?: EventListener;
  courseDescription = '';
  courseLevel = '';
  isPublished = false;
  isEditingDescription = false;
  showQuickStructureEditor = false;
  coverImage: string | null = null;
  coverImageFile: File | null = null;
  uploadingCover = false;

  // File upload properties
  selectedFile: File | null = null;
  uploadingFile = false;
  uploadProgress = 0;
  isDragOver = false;
  filePreview: string | null = null;
  maxFileSize = 50 * 1024 * 1024; // 50MB

  // Materials management
  materials: UploadedFile[] = [];
  trainerMaterials: Material[] = []; // Материалы из trainer
  loadingTrainerMaterials = false;
  showCreateMaterialForm = false;
  showExistingMaterials = false; // Показывать ли список существующих материалов
  newMaterial = {
    title: '',
    type: 'text' as 'text' | 'audio' | 'video' | 'pdf' | 'image',
    content: '',
    description: '',
    tag: '',
    coverImage: null as File | null
  };

  // Sections management (like in materials component)
  sections: string[] = [];
  hoveredSection: string | null = null;
  collapsedSections: Set<string> = new Set(); // Свернутые секции (по умолчанию все развернуты)
  subSections: { [key: string]: string[] } = {};
  sectionsOptions = ['Grammaire', 'Phonétique', 'Vocabulaire', 'Conseils'];
  selectedSection: string | null = null;
  selectedSubSection: string | null = null;
  selectedLesson: string | null = null; // Выбранный урок для добавления материалов
  isSupplementaryMaterial: boolean = false; // Флаг для дополнительных материалов
  isUploadModalOpen = false;
  showAddSectionDropdown = false;
  showAddSubSectionInput: { [key: string]: boolean } = {}; // Показывать ли input для добавления подсекции
  newSubSectionName: { [key: string]: string } = {}; // Имя новой подсекции для каждой секции
  // Структура урока: { name: string, type: 'self' | 'call', description?: string }
  lessons: { [key: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } = {}; // Уроки для каждой секции
  lessonsInSubSections: { [section: string]: { [subSection: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } } = {}; // Уроки в sous-section
  collapsedLessons: Set<string> = new Set(); // Свернутые уроки
  draggedLesson: { section: string; subSection: string | null; lesson: string } | null = null; // Перетаскиваемый урок

  // Current user
  currentUser: any = null;
  courseId: string | null = null; // Will be set after course creation
  showCreateCourseForm = false; // Показывать ли форму создания курса
  hasUnsavedChanges = false; // Есть ли несохраненные изменения
  isCourseCardExpanded = false; // Развернута ли карточка курса (по умолчанию скрыта)
  isMaterialsSectionExpanded = false; // Развернута ли секция материалов (по умолчанию скрыта)
  
  // Все курсы преподавателя
  allTeacherCourses: Course[] = [];
  loadingCourses = false;
  
  // Настройки оплаты курса
  coursePrice: number = 0;
  courseCurrency: string = 'EUR';
  coursePaymentMethod: string = 'stripe';
  coursePaymentDescription: string = '';
  isCourseFree: boolean = true; // По умолчанию курс бесплатный

  constructor(
    private fileUploadService: FileUploadService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private courseService: CourseService,
    private materialService: MaterialService,
    private roleService: RoleService,
    private homeworkService: HomeworkService,
    private router: Router,
    private title: Title,
    private meta: Meta,
    private http: HttpClient,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { }

  // Кэш для домашних заданий
  private homeworkCache: { [key: string]: any[] } = {};
  private homeworkCacheLoaded = false;

  ngOnInit(): void {
    // Загружаем кэш домашних заданий
    this.loadHomeworkCache();
    
    // Слушаем событие создания домашнего задания для обновления кэша
    window.addEventListener('homeworkCreated', ((event: CustomEvent) => {
      if (event.detail && event.detail.itemId) {
        // Перезагружаем кэш
        this.loadHomeworkCache();
      }
    }) as EventListener);
    
    // Слушаем событие открытия модалки материалов из lesson-preview-modal
    this.materialModalListener = ((event: CustomEvent) => {
      if (event.detail && event.detail.action === 'addMaterial') {
        const section = event.detail.section;
        const lesson = event.detail.lesson;
        const subSection = event.detail.subSection || null;
        const isSupplementary = event.detail.isSupplementary || false;
        this.openMaterialModal(section, lesson, subSection, isSupplementary);
      }
    }) as EventListener;
    window.addEventListener('openMaterialModal', this.materialModalListener);
    
    // Слушаем событие обновления описания урока
    window.addEventListener('lessonDescriptionUpdated', (event: any) => {
      // Обновляем описание урока в структуре lessons
      const { courseId, section, subSection, lessonName, description } = event.detail;
      if (courseId === this.courseId) {
        if (subSection) {
          // Обновляем описание в lessonsInSubSections
          if (this.lessonsInSubSections[section] && this.lessonsInSubSections[section][subSection]) {
            const lessonIndex = this.lessonsInSubSections[section][subSection].findIndex(l => l.name === lessonName);
            if (lessonIndex !== -1) {
              this.lessonsInSubSections[section][subSection][lessonIndex].description = description;
            }
          }
        } else {
          // Обновляем описание в lessons
          if (this.lessons[section]) {
            const lessonIndex = this.lessons[section].findIndex(l => l.name === lessonName);
            if (lessonIndex !== -1) {
              this.lessons[section][lessonIndex].description = description;
            }
          }
        }
        // Сохраняем изменения в БД
        this.saveSections();
        // Принудительно обновляем представление
        this.cdr.detectChanges();
      }
    });

    // Слушаем событие добавления материала (включая материалы из конструкторов)
    this.materialAddedListener = ((event: CustomEvent) => {
      if (event.detail && event.detail.material) {
        const material = event.detail.material;
        
        // Проверяем, что материал относится к текущему курсу
        if (material.courseId === this.courseId) {
          // Добавляем материал в общий массив, если его там еще нет
          if (!this.materials.find(m => m.id === material.id)) {
            this.materials.push(material);
            
            // Если это материал из конструктора (drill-grid и т.д.), сохраняем его на сервер
            if ((material as any).drillGridData) {
              this.saveConstructorMaterial(material);
            } else {
              // Для обычных файлов материал уже должен быть сохранен на сервер
              // Просто обновляем список
              this.cdr.detectChanges();
            }
          }
        }
      }
    }) as EventListener;
    window.addEventListener('materialAdded', this.materialAddedListener);

    // Слушаем событие обновления материалов урока при закрытии модалки
    this.lessonMaterialsUpdatedListener = ((event: CustomEvent) => {
      const { courseId, materials } = event.detail;
      if (courseId === this.courseId) {
        // Обновляем материалы в общем массиве
        // Используем Map для избежания дублирования по ID
        const materialsMap = new Map<number, UploadedFile>();
        
        // Сначала добавляем существующие материалы
        this.materials.forEach(m => materialsMap.set(m.id, m));
        
        // Затем обновляем/добавляем материалы из события
        materials.forEach((material: UploadedFile) => {
          materialsMap.set(material.id, material);
          
          // Если это материал из конструктора, сохраняем его на сервер
          if ((material as any).drillGridData && !material.url) {
            // Материал еще не сохранен на сервер, сохраняем его
            this.saveConstructorMaterial(material);
          }
        });
        
        // Обновляем массив материалов без дубликатов
        this.materials = Array.from(materialsMap.values());
        this.cdr.detectChanges();
      }
    }) as EventListener;
    window.addEventListener('lessonMaterialsUpdated', this.lessonMaterialsUpdatedListener);
    
    this.updateSEOTags();
    this.currentUser = this.authService.getCurrentUser();
    
    // Загружаем все курсы преподавателя
    this.loadAllTeacherCourses();
    
    // Загружаем сохраненный курс из localStorage
    this.loadSavedCourse();
    
    this.loadSections();
    this.loadTrainerMaterials();
  }

  // Загрузка всех курсов преподавателя
  loadAllTeacherCourses(): void {
    this.loadingCourses = true;
    this.courseService.getCoursesByTeacher().subscribe({
      next: (courses) => {
        this.allTeacherCourses = courses;
        this.loadingCourses = false;
        console.log('📚 Загружены все курсы преподавателя:', this.allTeacherCourses);
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки курсов преподавателя:', error);
        this.allTeacherCourses = [];
        this.loadingCourses = false;
      }
    });
  }

  // Переключение на другой курс
  switchToCourse(courseId: number): void {
    // Проверяем, есть ли несохраненные изменения
    if (this.hasUnsavedChanges) {
      const confirm = window.confirm('Vous avez des modifications non enregistrées. Voulez-vous continuer sans sauvegarder?');
      if (!confirm) {
        return;
      }
    }

    // Сохраняем ID выбранного курса
    localStorage.setItem('currentCourseId', courseId.toString());
    this.courseId = courseId.toString();
    
    // Загружаем данные выбранного курса
    this.loadCourseData(courseId);
  }

  // Загрузка данных курса
  loadCourseData(courseId: number): void {
    this.courseService.getCourseById(courseId).subscribe({
      next: (course) => {
        this.courseTitle = course.title;
        this.courseDescription = course.description || '';
        this.courseLevel = course.level || '';
        this.isPublished = course.isPublished;
        this.coverImage = course.coverImage;
        this.sections = course.sections || [];
        // Загружаем подсекции из БД
        if (course.subSections) {
          this.subSections = course.subSections;
        }
        // Загружаем уроки из БД
        if (course.lessons) {
          this.lessons = course.lessons;
        }
        if (course.lessonsInSubSections) {
          this.lessonsInSubSections = course.lessonsInSubSections;
        }
        // Загружаем настройки оплаты (если они есть в курсе)
        if ((course as any).price !== undefined) {
          this.coursePrice = (course as any).price !== null ? (course as any).price : 0;
        }
        if ((course as any).currency !== undefined) {
          this.courseCurrency = (course as any).currency !== null ? (course as any).currency : 'EUR';
        }
        if ((course as any).paymentMethod !== undefined) {
          this.coursePaymentMethod = (course as any).paymentMethod !== null ? (course as any).paymentMethod : 'stripe';
        }
        if ((course as any).paymentDescription !== undefined) {
          this.coursePaymentDescription = (course as any).paymentDescription !== null ? (course as any).paymentDescription : '';
        }
        // Определяем, бесплатный ли курс - приоритет у поля isFree из БД
        if ((course as any).isFree !== undefined) {
          this.isCourseFree = (course as any).isFree;
        } else {
          // Если isFree не указан, определяем по цене
          const coursePrice = (course as any).price;
          this.isCourseFree = coursePrice === null || coursePrice === undefined || coursePrice === 0;
        }
        
        console.log('💰 Загружены настройки оплаты курса:', {
          price: this.coursePrice,
          currency: this.courseCurrency,
          paymentMethod: this.coursePaymentMethod,
          paymentDescription: this.coursePaymentDescription,
          isFree: this.isCourseFree
        });
        this.hasUnsavedChanges = false;
        this.isCourseCardExpanded = true;
        this.loadFiles();
        // loadCourseConstructors вызывается внутри loadFiles после загрузки файлов
        // Загружаем кэш домашних заданий после загрузки курса
        this.loadHomeworkCache();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error loading course:', error);
        this.notificationService.error('Erreur lors du chargement du cours');
      }
    });
  }

  loadSavedCourse(): void {
    const savedCourseId = localStorage.getItem('currentCourseId');
    if (savedCourseId) {
      this.courseId = savedCourseId;
      // Загружаем данные курса
      this.loadCourseData(parseInt(savedCourseId, 10));
    }
  }

  // ==================== COURSE MANAGEMENT ====================

  async createCourse(): Promise<void> {
    if (!this.courseTitle.trim()) {
      this.notificationService.error('Veuillez saisir un titre pour le cours');
      return;
    }

    const courseData = {
      title: this.courseTitle,
      description: this.courseDescription || undefined,
      level: this.courseLevel || undefined,
      isPublished: this.isPublished,
      // Добавляем данные о цене курса при создании (опционально)
      isFree: this.isCourseFree,
      // Если курс бесплатный, передаем null для price и связанных полей
      price: this.isCourseFree ? null : (this.coursePrice || null),
      currency: this.isCourseFree ? null : (this.courseCurrency || null),
      paymentMethod: this.isCourseFree ? null : (this.coursePaymentMethod || null),
      paymentDescription: this.isCourseFree ? null : (this.coursePaymentDescription || null)
    };

    this.courseService.createCourse(courseData).subscribe({
      next: (course) => {
        this.courseId = course.id.toString();
        // Сохраняем courseId в localStorage
        localStorage.setItem('currentCourseId', this.courseId);
        // Загружаем данные о цене из ответа сервера
        if ((course as any).price !== undefined) {
          this.coursePrice = (course as any).price || 0;
        }
        if ((course as any).currency !== undefined) {
          this.courseCurrency = (course as any).currency || 'EUR';
        }
        if ((course as any).paymentMethod !== undefined) {
          this.coursePaymentMethod = (course as any).paymentMethod || 'stripe';
        }
        if ((course as any).paymentDescription !== undefined) {
          this.coursePaymentDescription = (course as any).paymentDescription || '';
        }
        if ((course as any).isFree !== undefined) {
          this.isCourseFree = (course as any).isFree;
        }
        // Загружаем кэш домашних заданий после создания курса
        this.loadHomeworkCache();
        this.showCreateCourseForm = false;
        this.hasUnsavedChanges = false;
        // Автоматически разворачиваем карточку курса и секцию материалов после создания
        this.isCourseCardExpanded = true;
        this.isMaterialsSectionExpanded = true;
        this.notificationService.success('Cours créé avec succès!');
        // After course creation, enable file uploads
        this.loadFiles();
        // Обновляем список всех курсов
        this.loadAllTeacherCourses();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du cours:', error);
        this.notificationService.error('Erreur lors de la création du cours');
      }
    });
  }

  saveDescription(): void {
    this.isEditingDescription = false;
    this.markAsChanged();
    // Автоматически сохраняем при потере фокуса
    if (this.courseId && this.hasUnsavedChanges) {
      this.updateCourse();
    }
  }

  cancelEditDescription(): void {
    // Восстанавливаем описание из сохраненного курса
    if (this.courseId) {
      this.courseService.getCourseById(parseInt(this.courseId, 10)).subscribe({
        next: (course) => {
          this.courseDescription = course.description || '';
        }
      });
    }
    this.isEditingDescription = false;
  }

  async updateCourse(): Promise<void> {
    if (!this.courseId) {
      this.notificationService.error('Aucun cours sélectionné');
      return;
    }

    const courseData = {
      title: this.courseTitle,
      description: this.courseDescription || undefined,
      level: this.courseLevel || undefined,
      isPublished: this.isPublished,
      // Добавляем данные о цене курса
      isFree: this.isCourseFree,
      // Если курс бесплатный, передаем null для price и связанных полей
      price: this.isCourseFree ? null : (this.coursePrice || null),
      currency: this.isCourseFree ? null : (this.courseCurrency || null),
      paymentMethod: this.isCourseFree ? null : (this.coursePaymentMethod || null),
      paymentDescription: this.isCourseFree ? null : (this.coursePaymentDescription || null)
    };

    console.log('💾 Сохранение курса с данными о цене:', courseData);

    this.courseService.updateCourse(parseInt(this.courseId, 10), courseData).subscribe({
      next: (course) => {
        console.log('✅ Курс обновлен, ответ сервера:', course);
        this.notificationService.success('Cours mis à jour avec succès!');
        // Обновляем данные курса
        this.coverImage = course.coverImage;
        this.sections = course.sections || [];
        this.isPublished = course.isPublished; // Обновляем статус публикации
        // Обновляем данные о цене из ответа сервера
        if ((course as any).price !== undefined) {
          this.coursePrice = (course as any).price !== null ? (course as any).price : 0;
        }
        if ((course as any).currency !== undefined) {
          this.courseCurrency = (course as any).currency !== null ? (course as any).currency : 'EUR';
        }
        if ((course as any).paymentMethod !== undefined) {
          this.coursePaymentMethod = (course as any).paymentMethod !== null ? (course as any).paymentMethod : 'stripe';
        }
        if ((course as any).paymentDescription !== undefined) {
          this.coursePaymentDescription = (course as any).paymentDescription !== null ? (course as any).paymentDescription : '';
        }
        if ((course as any).isFree !== undefined) {
          this.isCourseFree = (course as any).isFree;
        }
        
        console.log('💰 Обновлены настройки оплаты после сохранения:', {
          price: this.coursePrice,
          currency: this.courseCurrency,
          paymentMethod: this.coursePaymentMethod,
          paymentDescription: this.coursePaymentDescription,
          isFree: this.isCourseFree
        });
        
        this.hasUnsavedChanges = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour du cours:', error);
        this.notificationService.error('Erreur lors de la mise à jour du cours');
      }
    });
  }

  // Переключение статуса публикации
  togglePublication(): void {
    if (!this.courseId) {
      return;
    }

    const courseData = {
      isPublished: this.isPublished
    };

    this.courseService.updateCourse(parseInt(this.courseId, 10), courseData).subscribe({
      next: (course) => {
        this.isPublished = course.isPublished;
        if (this.isPublished) {
          this.notificationService.success('Cours publié avec succès!');
        } else {
          this.notificationService.info('Cours retiré de la publication');
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour du statut de publication:', error);
        // Откатываем изменение в случае ошибки
        this.isPublished = !this.isPublished;
        this.notificationService.error('Erreur lors de la mise à jour du statut de publication');
      }
    });
  }

  // Открытие модального окна настроек курса
  openCourseSettings(): void {
    if (!this.courseId) {
      return;
    }

    const dialogRef = this.dialog.open(CourseSettingsModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: {
        courseId: parseInt(this.courseId, 10),
        currentPrice: this.coursePrice,
        currentCurrency: this.courseCurrency,
        currentPaymentMethod: this.coursePaymentMethod,
        currentPaymentDescription: this.coursePaymentDescription,
        isFree: this.isCourseFree
      } as CourseSettingsModalData,
      panelClass: 'course-settings-dialog'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('📚 Результат закрытия модального окна настроек:', result);
        // Обновляем локальные значения настроек из результата модального окна
        this.coursePrice = result.price !== undefined && result.price !== null ? result.price : 0;
        this.courseCurrency = result.currency !== undefined && result.currency !== null ? result.currency : 'EUR';
        this.coursePaymentMethod = result.paymentMethod !== undefined && result.paymentMethod !== null ? result.paymentMethod : 'stripe';
        this.coursePaymentDescription = result.paymentDescription !== undefined && result.paymentDescription !== null ? result.paymentDescription : '';
        this.isCourseFree = result.isFree !== undefined ? result.isFree : (this.coursePrice === 0 || this.coursePrice === null);
        
        console.log('💰 Обновлены настройки оплаты после закрытия модального окна:', {
          price: this.coursePrice,
          currency: this.courseCurrency,
          paymentMethod: this.coursePaymentMethod,
          paymentDescription: this.coursePaymentDescription,
          isFree: this.isCourseFree
        });
        
        this.cdr.detectChanges();
      }
    });
  }

  async deleteCourse(): Promise<void> {
    if (!this.courseId) {
      this.notificationService.error('Aucun cours sélectionné');
      return;
    }

    if (!confirm('Êtes-vous sûr de vouloir supprimer ce cours ? Cette action est irréversible.')) {
      return;
    }

    this.courseService.deleteCourse(parseInt(this.courseId, 10)).subscribe({
      next: (result) => {
        if (result.success) {
          this.notificationService.success('Cours supprimé avec succès!');
          // Очищаем данные
          localStorage.removeItem('currentCourseId');
          this.courseId = null;
          this.courseTitle = '';
          this.courseDescription = '';
          this.courseLevel = '';
          this.isPublished = false;
          // Обновляем список всех курсов
          this.loadAllTeacherCourses();
          this.coverImage = null;
          this.materials = [];
          this.showCreateCourseForm = false;
          this.hasUnsavedChanges = false;
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression du cours:', error);
        this.notificationService.error('Erreur lors de la suppression du cours');
      }
    });
  }

  markAsChanged(): void {
    this.hasUnsavedChanges = true;
  }

  toggleCourseCard(): void {
    this.isCourseCardExpanded = !this.isCourseCardExpanded;
    // При разворачивании карточки автоматически разворачиваем секцию материалов
    if (this.isCourseCardExpanded) {
      this.isMaterialsSectionExpanded = true;
    }
  }

  toggleMaterialsSection(): void {
    const nextState = !this.isMaterialsSectionExpanded;
    console.log('[materials-section] toggle click', {
      prev: this.isMaterialsSectionExpanded,
      next: nextState
    });
    this.isMaterialsSectionExpanded = nextState;
    this.cdr.detectChanges();
  }

  get materialsChevronIcon(): string {
    return this.isMaterialsSectionExpanded ? 'fa-chevron-up' : 'fa-chevron-down';
  }

  get materialsChevronTitle(): string {
    return this.isMaterialsSectionExpanded ? 'Réduire le contenu' : 'Développer le contenu';
  }

  toggleSection(section: string): void {
    if (this.collapsedSections.has(section)) {
      // Секция была свернута, разворачиваем её
      this.collapsedSections.delete(section);
    } else {
      // Секция была развернута, сворачиваем её
      this.collapsedSections.add(section);
    }
  }

  isSectionExpanded(section: string): boolean {
    // По умолчанию все секции развернуты (если секция не в списке свернутых)
    return !this.collapsedSections.has(section);
  }

  onCoverImageSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        this.notificationService.error('Veuillez sélectionner une image');
        return;
      }

      // Проверяем размер файла (макс 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.notificationService.error('L\'image est trop grande (max 5MB)');
        return;
      }

      this.coverImageFile = file;
      
      // Показываем превью
      const reader = new FileReader();
      reader.onload = (e) => {
        this.coverImage = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  async uploadCoverImage(): Promise<void> {
    if (!this.courseId || !this.coverImageFile) {
      this.notificationService.error('Veuillez sélectionner une image');
      return;
    }

    this.uploadingCover = true;

    // Сначала загружаем файл через file-service
    this.fileUploadService.uploadFileAsCourse(this.coverImageFile, this.courseId).subscribe({
      next: (response) => {
        // Затем обновляем курс с URL обложки
        this.courseService.updateCourse(parseInt(this.courseId!, 10), {
          coverImage: response.url
        }).subscribe({
          next: (course) => {
            this.coverImage = course.coverImage;
            this.coverImageFile = null;
            this.uploadingCover = false;
            this.notificationService.success('Image de couverture uploadée avec succès!');
          },
          error: (error) => {
            console.error('❌ Erreur lors de la mise à jour de l\'image:', error);
            this.uploadingCover = false;
            this.notificationService.error('Erreur lors de la mise à jour de l\'image');
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'upload de l\'image:', error);
        this.uploadingCover = false;
        this.notificationService.error('Erreur lors de l\'upload de l\'image');
      }
    });
  }

  removeCoverImage(): void {
    if (!this.courseId) return;

    this.courseService.updateCourse(parseInt(this.courseId, 10), {
      coverImage: null
    }).subscribe({
      next: () => {
        this.coverImage = null;
        this.coverImageFile = null;
        this.notificationService.success('Image de couverture supprimée');
      },
      error: (error) => {
        console.error('❌ Erreur lors de la suppression de l\'image:', error);
        this.notificationService.error('Erreur lors de la suppression de l\'image');
      }
    });
  }

  // ==================== FILE UPLOAD METHODS ====================

  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  handleFileSelection(file: File): void {
    // Validate file type
    if (!this.isValidFileType(file)) {
      this.notificationService.error(`Type de fichier non supporté: ${file.type}`);
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      this.notificationService.error(`Fichier trop volumineux (${this.formatFileSize(file.size)}). Taille maximale: ${this.formatFileSize(this.maxFileSize)}`);
      return;
    }

    this.selectedFile = file;
    console.log('📁 Fichier sélectionné:', file.name, `(${this.formatFileSize(file.size)})`);

    // Auto-detect file type
    if (file.type.startsWith('image/')) {
      this.newMaterial.type = 'image';
    } else if (file.type.startsWith('audio/')) {
      this.newMaterial.type = 'audio';
    } else if (file.type.startsWith('video/')) {
      this.newMaterial.type = 'video';
    } else if (file.type === 'application/pdf') {
      this.newMaterial.type = 'pdf';
    }

    // Generate preview for images
    this.generateFilePreview(file);
  }

  isValidFileType(file: File): boolean {
    const allowedTypes = {
      'audio': ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'],
      'video': ['video/mp4', 'video/webm', 'video/ogg', 'video/avi'],
      'pdf': ['application/pdf'],
      'image': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    };

    if (this.newMaterial.type === 'text') return false;

    const typeKey = this.newMaterial.type as keyof typeof allowedTypes;
    return allowedTypes[typeKey]?.some(type =>
      file.type === type || file.type.startsWith(type.split('/')[0] + '/')
    ) || false;
  }

  generateFilePreview(file: File): void {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreview = 'file-info';
    }
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.filePreview = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  needsFileUpload(): boolean {
    return ['audio', 'video', 'pdf', 'image'].includes(this.newMaterial.type);
  }

  getAcceptedFileTypes(): string {
    switch (this.newMaterial.type) {
      case 'audio': return 'audio/*';
      case 'video': return 'video/*';
      case 'pdf': return 'application/pdf';
      case 'image': return 'image/*';
      default: return '*';
    }
  }

  async uploadFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedFile || !this.courseId) {
        reject('Aucun fichier sélectionné ou cours non créé');
        return;
      }

      this.uploadingFile = true;
      this.uploadProgress = 0;

      const courseIdNumber = Number(this.courseId);
      this.fileUploadService.uploadFile(this.selectedFile, courseIdNumber).subscribe({
        next: (response) => {
          this.uploadingFile = false;
          this.uploadProgress = 100;
          console.log('✅ Fichier uploadé avec succès:', response.url);
          this.notificationService.success('Fichier uploadé avec succès!');
          resolve(response.url);
        },
        error: (error) => {
          this.uploadingFile = false;
          this.uploadProgress = 0;
          console.error('❌ Erreur lors de l\'upload:', error);
          this.notificationService.error('Erreur lors de l\'upload');
          reject(error);
        }
      });
    });
  }

  async createMaterial(): Promise<void> {
    if (!this.newMaterial.title.trim()) {
      this.notificationService.error('Veuillez saisir un titre pour le matériel');
      return;
    }

    // Проверяем наличие секций
    if (this.sections.length === 0) {
      this.notificationService.error('Veuillez d\'abord ajouter au moins une section au cours');
      return;
    }

    // Если добавляем материал в урок, проверяем наличие урока
    if (this.selectedLesson) {
      // Все хорошо, добавляем материал в урок
    } else if (!this.selectedSection) {
      this.notificationService.error('Veuillez sélectionner une section ou une leçon');
      return;
    }

    if (!this.courseId) {
      this.notificationService.error('Veuillez d\'abord créer le cours');
      return;
    }

    try {
      let contentUrl = this.newMaterial.content;

      if (this.needsFileUpload()) {
        if (!this.selectedFile) {
          this.notificationService.error('Veuillez sélectionner un fichier pour ce type de matériel');
          return;
        }

        if (!this.isValidFileType(this.selectedFile)) {
          this.notificationService.error('Type de fichier non valide');
          return;
        }

        if (this.selectedFile.size > this.maxFileSize) {
          this.notificationService.error('Fichier trop volumineux');
          return;
        }

        contentUrl = await this.uploadFile();
      } else if (this.newMaterial.type === 'text' && !this.newMaterial.content.trim()) {
        this.notificationService.error('Veuillez saisir le contenu du matériel');
        return;
      }

      // Формируем tag: приоритет - урок > подсекция > секция
      // Если это дополнительный материал, добавляем суффикс _supplementary
      let tag = this.selectedLesson || this.selectedSubSection || this.selectedSection || undefined;
      if (tag && this.isSupplementaryMaterial) {
        tag = `${tag}_supplementary`;
      }
      
      const uploadedFile: UploadedFile = {
        id: Date.now(),
        filename: this.newMaterial.title,
        url: contentUrl,
        mimetype: this.newMaterial.type,
        courseId: this.courseId,
        createdAt: new Date().toISOString(),
        tag: tag, // Сохраняем раздел или подраздел в поле tag
        description: this.newMaterial.description || undefined
      };

      // Обновляем материалы в модалке превью урока через событие
      window.dispatchEvent(new CustomEvent('materialAdded', {
        detail: { material: uploadedFile }
      }));

      this.clearMaterialForm();
      this.notificationService.success('Matériel créé avec succès!');
      // Перезагружаем файлы чтобы обновить список
      this.loadFiles();
      // Если материал был добавлен в урок, разворачиваем урок
      if (this.selectedLesson) {
        const lessonId = this.selectedSection + '_' + this.selectedLesson;
        this.collapsedLessons.delete(lessonId);
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création du matériel:', error);
      this.notificationService.error('Erreur lors de la création du matériel');
    }
  }

  clearMaterialForm(): void {
    this.newMaterial = {
      title: '',
      type: 'text',
      content: '',
      description: '',
      tag: '',
      coverImage: null
    };
    this.selectedFile = null;
    this.uploadingFile = false;
    this.uploadProgress = 0;
    this.isDragOver = false;
    this.filePreview = null;
    this.showCreateMaterialForm = false;
    this.showExistingMaterials = false;
    this.selectedSection = null;
    this.selectedSubSection = null;
    this.isSupplementaryMaterial = false;
    this.selectedLesson = null;
  }

  // ==================== SECTIONS MANAGEMENT ====================

  toggleDropdown(): void {
    // Toggle dropdown for sections
  }

  addSection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const sectionName = target.value;

    // Разрешаем добавлять одну и ту же секцию несколько раз
    if (sectionName) {
      // Создаем уникальный ключ для секции, если она уже существует
      let uniqueSectionName = sectionName;
      let counter = 1;
      while (this.sections.includes(uniqueSectionName)) {
        uniqueSectionName = `${sectionName} (${counter})`;
        counter++;
      }
      
      this.sections.push(uniqueSectionName);
      this.subSections[uniqueSectionName] = [];
      this.saveSections();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Закрываем dropdown при клике вне его области
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.add-section-dropdown');
    const button = document.querySelector('.add-section-btn');
    
    if (dropdown && button && !dropdown.contains(target) && !button.contains(target)) {
      this.showAddSectionDropdown = false;
    }
  }

  removeSection(sectionName: string): void {
    this.sections = this.sections.filter(sec => sec !== sectionName);
    delete this.subSections[sectionName];
    delete this.lessons[sectionName];
    this.saveSections();
  }

  toggleAddSubSectionInput(sectionName: string): void {
    this.showAddSubSectionInput[sectionName] = !this.showAddSubSectionInput[sectionName];
    if (this.showAddSubSectionInput[sectionName]) {
      this.newSubSectionName[sectionName] = '';
      // Фокус на input после небольшой задержки для рендеринга
      setTimeout(() => {
        const input = document.getElementById(`subSectionInput_${sectionName}`);
        if (input) {
          input.focus();
        }
      }, 100);
    }
  }

  confirmAddSubSection(sectionName: string): void {
    const subSectionName = this.newSubSectionName[sectionName]?.trim();
    if (!subSectionName) {
      this.notificationService.error('Veuillez entrer un nom pour la sous-section');
      return;
    }

    // Инициализируем массив подсекций, если его еще нет
    if (!this.subSections[sectionName]) {
      this.subSections[sectionName] = [];
    }

    // Проверяем, не существует ли уже такая подсекция
    if (this.subSections[sectionName].includes(subSectionName)) {
      this.notificationService.error('Cette sous-section existe déjà');
      return;
    }

    this.subSections[sectionName].push(subSectionName);
    this.saveSections();
    this.notificationService.success(`Sous-section "${subSectionName}" ajoutée avec succès!`);
    
    // Скрываем input и очищаем поле
    this.showAddSubSectionInput[sectionName] = false;
    this.newSubSectionName[sectionName] = '';
  }

  cancelAddSubSection(sectionName: string): void {
    this.showAddSubSectionInput[sectionName] = false;
    this.newSubSectionName[sectionName] = '';
  }

  addSubSection(sectionName: string): void {
    this.toggleAddSubSectionInput(sectionName);
  }

  removeSubSection(sectionName: string, subSectionName: string): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la sous-section "${subSectionName}"?`)) {
      if (this.subSections[sectionName]) {
        this.subSections[sectionName] = this.subSections[sectionName].filter(
          sub => sub !== subSectionName
        );
        // Если массив подсекций стал пустым, можно удалить ключ (опционально)
        if (this.subSections[sectionName].length === 0) {
          delete this.subSections[sectionName];
        }
        this.saveSections();
        this.notificationService.success(`Sous-section "${subSectionName}" supprimée avec succès!`);
      }
    }
  }

  saveSections(): void {
    if (this.courseId) {
      // Сохраняем в localStorage для быстрого доступа
      localStorage.setItem(`sections_${this.courseId}`, JSON.stringify(this.sections));
      localStorage.setItem(`subSections_${this.courseId}`, JSON.stringify(this.subSections));
      localStorage.setItem(`lessons_${this.courseId}`, JSON.stringify(this.lessons));
      localStorage.setItem(`lessonsInSubSections_${this.courseId}`, JSON.stringify(this.lessonsInSubSections));
      
      // Сохраняем в БД через API
      this.courseService.updateCourse(parseInt(this.courseId, 10), {
        sections: this.sections.length > 0 ? this.sections : null,
        subSections: Object.keys(this.subSections).length > 0 ? this.subSections : null,
        lessons: Object.keys(this.lessons).length > 0 ? this.lessons : null,
        lessonsInSubSections: Object.keys(this.lessonsInSubSections).length > 0 ? this.lessonsInSubSections : null
      }).subscribe({
        next: () => {
          console.log('✅ Sections and lessons saved to database');
        },
        error: (error) => {
          console.error('❌ Error saving sections and lessons:', error);
        }
      });
    }
  }

  loadSections(): void {
    if (this.courseId) {
      // Сначала загружаем из БД (уже загружено в loadSavedCourse)
      // Если нет в БД, загружаем из localStorage как fallback
      const savedSections = localStorage.getItem(`sections_${this.courseId}`);
      const savedSubSections = localStorage.getItem(`subSections_${this.courseId}`);
      const savedLessons = localStorage.getItem(`lessons_${this.courseId}`);

      if (savedSections && this.sections.length === 0) {
        this.sections = JSON.parse(savedSections);
      }
      if (savedSubSections) {
        this.subSections = JSON.parse(savedSubSections);
      }
      if (savedLessons) {
        const parsed = JSON.parse(savedLessons);
        // Миграция: если данные в старом формате (строки), конвертируем в новый формат (объекты)
        if (parsed && typeof parsed === 'object') {
          const migrated: { [key: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } = {};
          Object.keys(parsed).forEach(section => {
            migrated[section] = parsed[section].map((lesson: any) => {
              if (typeof lesson === 'string') {
                return { name: lesson, type: 'self' as const };
              }
              return lesson;
            });
          });
          this.lessons = migrated;
        }
      }
      
      const savedLessonsInSubSections = localStorage.getItem(`lessonsInSubSections_${this.courseId}`);
      if (savedLessonsInSubSections) {
        const parsed = JSON.parse(savedLessonsInSubSections);
        // Миграция: если данные в старом формате (строки), конвертируем в новый формат (объекты)
        if (parsed && typeof parsed === 'object') {
          const migrated: { [section: string]: { [subSection: string]: Array<{ name: string; type: 'self' | 'call'; description?: string }> } } = {};
          Object.keys(parsed).forEach(section => {
            migrated[section] = {};
            Object.keys(parsed[section]).forEach(subSection => {
              migrated[section][subSection] = parsed[section][subSection].map((lesson: any) => {
                if (typeof lesson === 'string') {
                  return { name: lesson, type: 'self' as const };
                }
                return lesson;
              });
            });
          });
          this.lessonsInSubSections = migrated;
        }
      }
    }
  }

  addLesson(section: string, subSection?: string): void {
    // Открываем модальное окно для выбора типа урока
    const dialogRef = this.dialog.open(LessonTypeSelectorComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe((type: LessonType | null) => {
      if (!type) {
        return; // Пользователь отменил
      }
      
      let lessonName: string;
      const lessonObj: { name: string; type: 'self' | 'call'; description?: string } = { name: '', type };
      
      if (subSection) {
        // Добавляем урок в sous-section
        if (!this.lessonsInSubSections[section]) {
          this.lessonsInSubSections[section] = {};
        }
        if (!this.lessonsInSubSections[section][subSection]) {
          this.lessonsInSubSections[section][subSection] = [];
        }
        
        // Автоматически нумеруем уроки в sous-section
        const lessonNumber = this.lessonsInSubSections[section][subSection].length + 1;
        lessonName = `Leçon ${lessonNumber}`;
        lessonObj.name = lessonName;
        
        this.lessonsInSubSections[section][subSection].push(lessonObj);
      } else {
        // Добавляем урок на уровне секции
        if (!this.lessons[section]) {
          this.lessons[section] = [];
        }
        
        // Автоматически нумеруем уроки
        const lessonNumber = this.lessons[section].length + 1;
        lessonName = `Leçon ${lessonNumber}`;
        lessonObj.name = lessonName;
        
        this.lessons[section].push(lessonObj);
      }
      
      this.saveSections();
      this.notificationService.success(`Leçon "${lessonName}" ajoutée avec succès!`);
    });
  }

  removeLesson(section: string, lessonName: string, subSection?: string): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la leçon "${lessonName}"?`)) {
      if (subSection) {
        // Удаляем урок из sous-section
        if (this.lessonsInSubSections[section] && this.lessonsInSubSections[section][subSection]) {
          this.lessonsInSubSections[section][subSection] = this.lessonsInSubSections[section][subSection].filter(
            lesson => lesson.name !== lessonName
          );
          if (this.lessonsInSubSections[section][subSection].length === 0) {
            delete this.lessonsInSubSections[section][subSection];
          }
          if (Object.keys(this.lessonsInSubSections[section]).length === 0) {
            delete this.lessonsInSubSections[section];
          }
        }
      } else {
        // Удаляем урок из секции
        if (this.lessons[section]) {
          this.lessons[section] = this.lessons[section].filter(
            lesson => lesson.name !== lessonName
          );
          if (this.lessons[section].length === 0) {
            delete this.lessons[section];
          }
        }
      }
      this.saveSections();
      this.notificationService.success(`Leçon "${lessonName}" supprimée avec succès!`);
    }
  }

  toggleLesson(lessonId: string): void {
    if (this.collapsedLessons.has(lessonId)) {
      this.collapsedLessons.delete(lessonId);
    } else {
      this.collapsedLessons.add(lessonId);
    }
  }

  isLessonExpanded(lessonId: string): boolean {
    return !this.collapsedLessons.has(lessonId);
  }

  openAddMaterialForLesson(section: string, lessonName: string): void {
    this.openMaterialModal(section, lessonName);
  }

  openAddMaterialForSection(section: string): void {
    this.openMaterialModal(section);
  }

  openAddMaterialForSubSection(section: string, subSection: string): void {
    this.openMaterialModal(section, undefined, subSection);
  }

  openUploadModal(type: string, section: string, subSection?: string): void {
    this.newMaterial.type = type as 'text' | 'audio' | 'video' | 'pdf' | 'image';
    this.selectedSection = section;
    this.selectedSubSection = subSection || null;
    this.isUploadModalOpen = true;
  }

  private openMaterialModal(section: string, lesson?: string, subSection?: string, isSupplementary: boolean = false): void {
    this.isSupplementaryMaterial = isSupplementary;
    const dialogData: AddMaterialModalData = {
      section: section,
      lesson: lesson,
      subSection: subSection,
      courseId: this.courseId || '',
      trainerMaterials: this.trainerMaterials,
      loadingTrainerMaterials: this.loadingTrainerMaterials,
      isSupplementary: isSupplementary
    };

    const dialogConfig: MatDialogConfig = {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: dialogData,
      panelClass: 'add-material-modal-dialog', // Для установки более высокого z-index
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'add-material-modal-backdrop'
    };

    const dialogRef = this.dialog.open(AddMaterialModalComponent, dialogConfig);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.action === 'create') {
          // Создание нового материала
          this.selectedSection = section;
          this.selectedLesson = lesson || null;
          this.selectedSubSection = subSection || null;
          this.isSupplementaryMaterial = isSupplementary;
          this.newMaterial = { ...result.material };
          this.selectedFile = result.material.file || null;
          this.createMaterial();
        } else if (result.action === 'addExisting') {
          // Добавление существующего материала
          this.selectedSection = section;
          this.selectedLesson = lesson || null;
          this.selectedSubSection = subSection || null;
          this.isSupplementaryMaterial = isSupplementary;
          this.addExistingMaterialToCourse(result.material);
        }
      }
    });
  }

  closeUploadModal(): void {
    this.isUploadModalOpen = false;
  }

  selectFile(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.handleFileSelection(target.files[0]);
    }
  }

  selectCoverImage(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.newMaterial.coverImage = target.files[0];
    }
  }

  async confirmUpload(): Promise<void> {
    if (!this.selectedFile || !this.newMaterial.title) {
      this.notificationService.error('Введите название и выберите файл перед загрузкой!');
      return;
    }

    if (!this.courseId) {
      this.notificationService.error('Veuillez d\'abord créer le cours');
      return;
    }

    try {
      const courseIdNumber = Number(this.courseId);
      this.fileUploadService.uploadFile(this.selectedFile, courseIdNumber).subscribe({
        next: (response) => {
          const uploadedFile: UploadedFile = {
            id: response.id,
            filename: this.newMaterial.title,
            url: response.url,
            mimetype: this.newMaterial.type,
            tag: this.newMaterial.tag || undefined,
            description: this.newMaterial.description || undefined,
            courseId: this.courseId!,
            createdAt: response.createdAt,
          };

          this.saveFile(uploadedFile);
          
          // Обновляем материалы в модалке превью урока через событие
          window.dispatchEvent(new CustomEvent('materialAdded', {
            detail: { material: uploadedFile }
          }));
          
          this.closeUploadModal();
          this.clearMaterialForm();
        },
        error: (err) => {
          console.error('Ошибка загрузки файла:', err);
          this.notificationService.error('Ошибка загрузки файла.');
        }
      });
    } catch (error) {
      console.error('Ошибка загрузки файла:', error);
      this.notificationService.error('Ошибка загрузки файла.');
    }
  }

  saveFile(file: UploadedFile): void {
    const sectionKey = this.selectedSection ?? 'default';
    if (!this.materials.find(m => m.id === file.id)) {
      this.materials.push(file);
    }
  }

  // Загрузка конструкторов курса из mindmap-service
  // Загружает конструкторы с courseLessonId (привязанные к урокам) и без (непривязанные)
  loadCourseConstructors(courseId: number): void {
    if (!this.courseId) {
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return;
    }

    const token = this.authService.getAccessToken();
    if (!token) {
      return;
    }
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Загружаем все конструкторы курса типа drill_grid
    this.http.get<any[]>(`${API_ENDPOINTS.CONSTRUCTORS}?type=drill_grid`, { headers }).subscribe({
      next: async (constructors) => {
        // Фильтруем по courseId
        const courseConstructors = constructors.filter(c => c.courseId === courseId);
        
        if (courseConstructors.length === 0) {
          return;
        }

        // Собираем все courseLessonId из структуры уроков для маппинга
        const lessonMap = new Map<string, { lessonName: string; section: string; subSection: string | null }>();
        
        // Уроки в секциях
        Object.entries(this.lessons).forEach(([section, lessonArray]) => {
          lessonArray.forEach(lesson => {
            const courseLessonId = (lesson as any).courseLessonId;
            if (courseLessonId) {
              lessonMap.set(courseLessonId, {
                lessonName: lesson.name,
                section: section,
                subSection: null
              });
            }
          });
        });
        
        // Уроки в подсекциях
        Object.entries(this.lessonsInSubSections).forEach(([section, subSections]) => {
          Object.entries(subSections).forEach(([subSection, lessonArray]) => {
            lessonArray.forEach(lesson => {
              const courseLessonId = (lesson as any).courseLessonId;
              if (courseLessonId) {
                lessonMap.set(courseLessonId, {
                  lessonName: lesson.name,
                  section: section,
                  subSection: subSection
                });
              }
            });
          });
        });

        // Загружаем drill-grid данные для каждого конструктора
        const materialPromises = courseConstructors.map(async (constructor) => {
          try {
            const drillGridResponse = await firstValueFrom(
              this.http.get<any>(`${API_ENDPOINTS.CONSTRUCTORS}/${constructor.id}/drill-grid`, { headers })
            );

            console.log('📥 Загружены данные drill-grid из БД в loadCourseConstructors:', {
              constructorId: constructor.id,
              title: constructor.title,
              cellsCount: Array.isArray(drillGridResponse.cells) ? drillGridResponse.cells.length : 'not array',
              cellsType: typeof drillGridResponse.cells,
              cellsSample: Array.isArray(drillGridResponse.cells) && drillGridResponse.cells.length > 0 
                ? drillGridResponse.cells[0] 
                : drillGridResponse.cells
            });

            // Определяем, к какому уроку привязан конструктор (если привязан)
            let lessonName = '';
            let section = '';
            let subSection: string | null = null;
            let tag = '';

            // Если конструктор привязан к уроку, проверяем, существует ли урок
            if (constructor.courseLessonId) {
              const lessonInfo = lessonMap.get(constructor.courseLessonId);
              if (!lessonInfo) {
                // Конструктор привязан к уроку, но урок не найден - пропускаем этот конструктор
                // Это может произойти, если урок был удален, но конструктор остался привязанным
                return null;
              }
              lessonName = lessonInfo.lessonName;
              section = lessonInfo.section;
              subSection = lessonInfo.subSection;
              tag = `${lessonName}_supplementary`;
            }
            // Если courseLessonId нет - материал будет без тега (попадет в "Matériaux sans section")

            // Проверяем, есть ли уже материал с таким constructorId
            const existingMaterial = this.materials.find(m => 
              (m as any).constructorId === constructor.id
            );

            if (existingMaterial) {
              // Обновляем существующий материал данными из БД
              // Убеждаемся, что cells в правильном формате массива
              let cellsData = drillGridResponse.cells || [];
              if (!Array.isArray(cellsData)) {
                console.warn('⚠️ cells не является массивом, преобразуем:', {
                  constructorId: constructor.id,
                  cellsType: typeof cellsData,
                  cells: cellsData
                });
                cellsData = [];
              }
              
              const updatedMaterial: UploadedFile = {
                ...existingMaterial,
                drillGridData: {
                  type: 'drill_grid',
                  data: {
                    id: drillGridResponse.id || constructor.id,
                    name: constructor.title,
                    rows: drillGridResponse.rows || [],
                    columns: drillGridResponse.columns || [],
                    cells: cellsData,
                    settings: drillGridResponse.settings || null,
                    constructorId: constructor.id
                  }
                },
                constructorId: constructor.id,
                courseLessonId: constructor.courseLessonId || null,
                tag: tag // Обновляем тег на основе данных из БД
              } as UploadedFile;
              
              console.log('✅ Обновлен материал с данными из БД:', {
                filename: updatedMaterial.filename,
                cellsCount: cellsData.length,
                cellsSample: cellsData.length > 0 ? cellsData[0] : 'empty'
              });

              const index = this.materials.indexOf(existingMaterial);
              if (index !== -1) {
                this.materials[index] = updatedMaterial;
              }
              return updatedMaterial;
            }

            // Создаем новый материал из конструктора
            // Убеждаемся, что cells в правильном формате массива
            let cellsData = drillGridResponse.cells || [];
            if (!Array.isArray(cellsData)) {
              console.warn('⚠️ cells не является массивом при создании нового материала, преобразуем:', {
                constructorId: constructor.id,
                cellsType: typeof cellsData,
                cells: cellsData
              });
              cellsData = [];
            }
            
            const newMaterial: UploadedFile = {
              id: Date.now() + Math.random(),
              filename: constructor.title,
              url: '',
              mimetype: 'application/json',
              courseId: this.courseId!,
              createdAt: constructor.createdAt || new Date().toISOString(),
              tag: tag, // Будет пустым, если конструктор не привязан к уроку (попадет в "Matériaux sans section")
              description: constructor.description || `Drill-grid: ${drillGridResponse.rows?.length || 0} lignes × ${drillGridResponse.columns?.length || 0} colonnes`,
              drillGridData: {
                type: 'drill_grid',
                data: {
                  id: drillGridResponse.id || constructor.id,
                  name: constructor.title,
                  rows: drillGridResponse.rows || [],
                  columns: drillGridResponse.columns || [],
                  cells: cellsData,
                  settings: drillGridResponse.settings || null,
                  constructorId: constructor.id
                }
              },
              constructorId: constructor.id,
              courseLessonId: constructor.courseLessonId || null
            } as UploadedFile;
            
            console.log('✅ Создан новый материал из конструктора:', {
              filename: newMaterial.filename,
              cellsCount: cellsData.length,
              cellsSample: cellsData.length > 0 ? cellsData[0] : 'empty'
            });

            return newMaterial;
          } catch (error) {
            return null;
          }
        });

        const newMaterials = (await Promise.all(materialPromises)).filter(m => m !== null) as UploadedFile[];
        
        // Добавляем новые материалы, избегая дубликатов
        // Проверяем не только по constructorId, но и по наличию в materials
        newMaterials.forEach(newMaterial => {
          const constructorId = (newMaterial as any).constructorId;
          if (!constructorId) {
            return; // Пропускаем материалы без constructorId
          }

          // Проверяем наличие материала по constructorId
          const existingByConstructorId = this.materials.findIndex(m => 
            (m as any).constructorId === constructorId
          );
          
          // Также проверяем по ID файла (если материал был создан из файла)
          const existingByFileId = newMaterial.id ? this.materials.findIndex(m => 
            m.id === newMaterial.id
          ) : -1;

          // Проверяем по filename и tag (для случаев, когда файл уже был загружен из file-service)
          const existingByFilenameAndTag = this.materials.findIndex(m => 
            m.filename === newMaterial.filename && 
            m.tag === newMaterial.tag &&
            m.mimetype === 'application/json'
          );
          
          if (existingByConstructorId !== -1) {
            // Материал уже существует по constructorId - обновляем его данными из БД
            this.materials[existingByConstructorId] = newMaterial;
          } else if (existingByFileId !== -1) {
            // Материал уже существует по ID файла - обновляем его данными из БД
            this.materials[existingByFileId] = newMaterial;
          } else if (existingByFilenameAndTag !== -1) {
            // Материал уже существует по filename и tag - обновляем его данными из БД и добавляем constructorId
            const existing = this.materials[existingByFilenameAndTag];
            this.materials[existingByFilenameAndTag] = {
              ...existing,
              ...newMaterial,
              id: existing.id, // Сохраняем оригинальный ID файла
              constructorId: constructorId // Добавляем constructorId если его не было
            } as UploadedFile;
          } else {
            // Материал действительно новый - добавляем
            this.materials.push(newMaterial);
          }
        });

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Ошибка загрузки конструкторов курса:', error);
      }
    });
  }

  loadFiles(): void {
    if (!this.courseId) {
      console.log('⚠️ loadFiles: courseId отсутствует');
      return;
    }

    const currentMaterialsCount = this.materials.length;
    console.log('📥 Загрузка файлов для курса:', this.courseId);
    this.fileUploadService.getFiles(this.courseId).subscribe({
      next: async (files) => {
        console.log('✅ Получены файлы с сервера:', files.length, 'файлов');
        console.log('   Полный список файлов с деталями:', files.map(f => ({ 
          id: f.id, 
          filename: f.filename, 
          tag: f.tag, 
          mimetype: f.mimetype,
          url: f.url,
          courseId: f.courseId
        })));
        
        // Проверяем наличие JSON файлов
        const jsonFiles = files.filter(f => f.mimetype === 'application/json');
        console.log(`📄 Найдено JSON файлов: ${jsonFiles.length}`, jsonFiles.map(f => ({
          id: f.id,
          filename: f.filename,
          tag: f.tag,
          url: f.url
        })));
        
        // Проверяем наличие файлов с тегом _supplementary
        const supplementaryFiles = files.filter(f => f.tag && f.tag.includes('_supplementary'));
        console.log(`📦 Найдено файлов с тегом _supplementary: ${supplementaryFiles.length}`, supplementaryFiles.map(f => ({
          id: f.id,
          filename: f.filename,
          tag: f.tag,
          mimetype: f.mimetype
        })));
        
        // Восстанавливаем данные drill-grid из JSON файлов или БД
        const filesWithData = await Promise.all(files.map(async (file) => {
          console.log(`🔍 Обработка файла: ${file.filename}, mimetype: ${file.mimetype}, tag: ${file.tag}`);
          
          // Если это JSON файл с drill-grid данными
          if (file.mimetype === 'application/json' && file.url) {
            console.log(`📄 Обнаружен JSON файл: ${file.filename}, пытаемся загрузить данные...`);
            try {
              const fileUrl = this.getFileUrl(file.url);
              const response = await fetch(fileUrl);
              if (response.ok) {
                const jsonData = await response.json();
                
                // Проверяем, что это данные drill-grid
                if (jsonData.type === 'drill_grid' && jsonData.data) {
                  // Извлекаем constructorId из JSON данных
                  const constructorId = jsonData.data?.constructorId || jsonData.data?.id;
                  if (constructorId) {
                    try {
                      const currentUser = this.authService.getCurrentUser();
                      const token = this.authService.getAccessToken();
                      if (currentUser?.id && token) {
                        const headers = new HttpHeaders({
                          'Authorization': `Bearer ${token}`
                        });
                        
                        const dbData = await firstValueFrom(
                          this.http.get(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}/drill-grid`, { headers })
                        );
                        
                        console.log('📥 Загружены данные drill-grid из БД:', {
                          constructorId,
                          filename: file.filename,
                          cellsCount: Array.isArray((dbData as any).cells) ? (dbData as any).cells.length : 'not array',
                          cellsType: typeof (dbData as any).cells,
                          cellsSample: Array.isArray((dbData as any).cells) && (dbData as any).cells.length > 0 
                            ? (dbData as any).cells[0] 
                            : (dbData as any).cells
                        });
                        
                        // Используем данные из БД
                        let cellsData = (dbData as any).cells || [];
                        if (!Array.isArray(cellsData)) {
                          console.warn('⚠️ cells из БД не является массивом, преобразуем:', {
                            constructorId,
                            filename: file.filename,
                            cellsType: typeof cellsData
                          });
                          cellsData = [];
                        }
                        
                        console.log('📥 Загружены данные drill-grid из БД (loadFiles):', {
                          constructorId,
                          filename: file.filename,
                          cellsCount: cellsData.length,
                          cellsSample: cellsData.length > 0 ? cellsData[0] : 'empty'
                        });
                        
                        return {
                          ...file,
                          drillGridData: {
                            type: 'drill_grid',
                            data: {
                              id: (dbData as any).id,
                              name: file.filename,
                              rows: (dbData as any).rows || [],
                              columns: (dbData as any).columns || [],
                              cells: cellsData,
                              settings: (dbData as any).settings || null,
                              constructorId: constructorId
                            }
                          },
                          constructorId: constructorId
                        } as UploadedFile;
                      }
                    } catch (dbError) {
                      // Продолжаем с данными из файла
                    }
                  }
                  
                  // Используем данные из JSON файла
                  const constructorIdFromJson = jsonData.data?.constructorId || jsonData.data?.id;
                  
                  return {
                    ...file,
                    drillGridData: {
                      ...jsonData,
                      data: {
                        ...jsonData.data,
                        constructorId: constructorIdFromJson
                      }
                    },
                    constructorId: constructorIdFromJson
                  } as UploadedFile;
                }
              }
              } catch (error) {
                console.error(`❌ Ошибка загрузки данных drill-grid из файла ${file.filename}:`, error);
                // Даже если не удалось загрузить JSON, возвращаем файл как есть
                return file;
              }
          } else if (file.mimetype === 'application/json') {
            // JSON файл без URL - возможно, он еще не загружен на сервер
            console.warn(`⚠️ JSON файл ${file.filename} не имеет URL, пропускаем загрузку данных`);
          }
          return file;
        }));
        
        // Если сервер вернул файлы, обновляем массив
        if (filesWithData.length > 0) {
          // Убираем дубликаты по ID перед обновлением
          const uniqueFiles = Array.from(
            new Map(filesWithData.map(f => [f.id, f])).values()
          );
          console.log('✅ Обновление массива материалов:', uniqueFiles.length, 'уникальных файлов');
          console.log('   Материалы с тегами:', uniqueFiles.map(f => ({ 
            filename: f.filename, 
            tag: f.tag, 
            mimetype: f.mimetype,
            hasDrillGridData: !!(f as any).drillGridData,
            constructorId: (f as any).constructorId,
            drillGridConstructorId: (f as any).drillGridData?.data?.constructorId
          })));
          
          // Проверяем наличие дополнительных материалов (supplementary)
          const supplementaryFiles = uniqueFiles.filter(f => 
            f.tag && f.tag.includes('_supplementary')
          );
          console.log(`📦 Найдено дополнительных материалов: ${supplementaryFiles.length}`, 
            supplementaryFiles.map(f => ({ 
              filename: f.filename, 
              tag: f.tag,
              constructorId: (f as any).constructorId,
              drillGridConstructorId: (f as any).drillGridData?.data?.constructorId
            }))
          );
          
          this.materials = uniqueFiles;
        } else if (currentMaterialsCount > 0) {
          // Если сервер вернул пустой массив, но у нас есть локальные материалы,
          // не перезаписываем массив - возможно, это проблема синхронизации
          console.warn('⚠️ Сервер вернул пустой массив, но есть локальные материалы:', currentMaterialsCount);
        } else {
          // Если и сервер пустой, и локально пусто - это нормально
          console.log('📭 Нет материалов для курса');
          this.materials = [];
        }
        
        // Обновляем кэш домашних заданий после загрузки файлов
        this.loadHomeworkCache();
        
        // Загружаем конструкторы курса из mindmap-service ПОСЛЕ загрузки файлов
        // чтобы можно было сопоставить конструкторы с файлами по constructorId
        if (this.courseId) {
          this.loadCourseConstructors(parseInt(this.courseId, 10));
        }
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Ошибка загрузки файлов:', err);
        // При ошибке не трогаем локальный массив, если там есть данные
        if (currentMaterialsCount === 0) {
          this.notificationService.error('Erreur lors du chargement des fichiers du cours');
        } else {
          console.log('⚠️ Ошибка загрузки, но сохраняем локальные материалы');
        }
      }
    });
  }

  getFileUrl(url: string | null | undefined): string {
    if (!url) {
      return '#';
    }
    // Заменяем удаленный сервер на локальный
    if (url.includes('135.125.107.45:3011')) {
      // Заменяем удаленный сервер на локальный, сохраняя путь
      return url.replace('http://135.125.107.45:3011', 'http://localhost:3011');
    }
    if (url.includes('localhost:3008')) {
      return url.replace('http://localhost:3008', `${API_ENDPOINTS.FILES}`);
    }
    return url;
  }

  // ==================== TRAINER MATERIALS ====================

  loadTrainerMaterials(): void {
    if (!this.currentUser?.id) return;

    this.loadingTrainerMaterials = true;
    
    // Загружаем материалы в зависимости от роли
    if (this.roleService.isTeacher()) {
      this.materialService.getMaterialsForTeacher(this.currentUser.id).subscribe({
        next: (materials) => {
          this.trainerMaterials = materials;
          this.loadingTrainerMaterials = false;
          console.log('✅ Trainer materials loaded:', materials);
        },
        error: (error) => {
          console.error('❌ Error loading trainer materials:', error);
          this.loadingTrainerMaterials = false;
          this.trainerMaterials = [];
        }
      });
    } else {
      // Для студентов загружаем свои материалы
      this.materialService.getMaterialsForTeacher(this.currentUser.id).subscribe({
        next: (materials) => {
          this.trainerMaterials = materials;
          this.loadingTrainerMaterials = false;
        },
        error: (error) => {
          console.error('❌ Error loading materials:', error);
          this.loadingTrainerMaterials = false;
          this.trainerMaterials = [];
        }
      });
    }
  }

  toggleExistingMaterials(): void {
    // Проверяем наличие секций перед открытием модального окна
    if (this.sections.length === 0) {
      this.notificationService.error('Veuillez d\'abord ajouter au moins une section au cours');
      return;
    }

    this.showExistingMaterials = !this.showExistingMaterials;
    if (this.showExistingMaterials && this.trainerMaterials.length === 0) {
      this.loadTrainerMaterials();
    }
  }

  async addExistingMaterialToCourse(material: Material): Promise<void> {
    // Проверяем наличие секций
    if (this.sections.length === 0) {
      this.notificationService.error('Veuillez d\'abord ajouter au moins une section au cours');
      this.showExistingMaterials = false;
      return;
    }

    // Если добавляем материал в урок, проверяем наличие урока
    if (this.selectedLesson) {
      // Все хорошо, добавляем материал в урок
    } else if (!this.selectedSection) {
      this.notificationService.error('Veuillez sélectionner une section ou une leçon');
      return;
    }
    if (!this.courseId) {
      this.notificationService.error('Veuillez d\'abord créer le cours');
      return;
    }

    const courseId = this.courseId.toString();

    try {
      // Для текстовых материалов создаем файл напрямую
      if (material.type === 'text') {
        const textBlob = new Blob([material.content], { type: 'text/plain' });
        const textFile = new File([textBlob], `${material.title}.txt`, { type: 'text/plain' });
        
        let tag = this.selectedLesson || this.selectedSubSection || this.selectedSection || undefined;
        if (tag && this.isSupplementaryMaterial) {
          tag = `${tag}_supplementary`;
        }
        this.fileUploadService.uploadFileAsCourse(textFile, courseId, tag).subscribe({
          next: (response) => {
            const uploadedFile: UploadedFile = {
              id: response.id,
              filename: material.title,
              url: response.url,
              mimetype: material.type,
              tag: tag, // Сохраняем раздел или подраздел в поле tag
              description: material.description || undefined,
              courseId: courseId,
              createdAt: response.createdAt,
            };

            // Обновляем материалы в модалке превью урока через событие
            window.dispatchEvent(new CustomEvent('materialAdded', {
              detail: { material: uploadedFile }
            }));

            this.notificationService.success(`Matériau "${material.title}" ajouté au cours avec succès!`);
            this.showExistingMaterials = false;
            // Перезагружаем файлы чтобы обновить список
            this.loadFiles();
          },
          error: (error) => {
            console.error('❌ Erreur lors de l\'ajout du matériau au cours:', error);
            this.notificationService.error('Erreur lors de l\'ajout du matériau au cours');
          }
        });
        return;
      }

      // Для файловых материалов связываем существующий файл с курсом
      if (material.content) {
        // Используем оригинальный URL из material.content как есть
        // Метод linkFileToCourseByUrl умеет извлекать имя файла из любого формата URL
        const fileUrl = material.content;
        
        console.log('🔗 Связывание файла с курсом по URL:', fileUrl);
        
        // Используем новый метод для связывания существующего файла с курсом
        const courseIdNum = parseInt(courseId, 10);
        if (isNaN(courseIdNum)) {
          this.notificationService.error('ID курса некорректен');
          return;
        }
        
        let tag = this.selectedLesson || this.selectedSubSection || this.selectedSection || undefined;
        if (tag && this.isSupplementaryMaterial) {
          tag = `${tag}_supplementary`;
        }
        this.fileUploadService.linkFileToCourse(fileUrl, courseIdNum, tag).subscribe({
          next: (response) => {
            console.log('✅ Материал связан с курсом:', response);
            
            // Добавляем файл в локальный массив сразу для мгновенного обновления UI
            const uploadedFile: UploadedFile = {
              id: response.id,
              filename: material.title,
              url: response.url,
              mimetype: this.getMimeTypeFromExtension(this.getFileExtensionFromUrl(material.content)),
              courseId: courseId,
              createdAt: response.createdAt.toString(),
              tag: tag, // Сохраняем урок, подсекцию или секцию в поле tag
              description: material.description || undefined,
            };
            
            // Обновляем материалы в модалке превью урока через событие
            window.dispatchEvent(new CustomEvent('materialAdded', {
              detail: { material: uploadedFile }
            }));
            
            this.notificationService.success(`Matériau "${material.title}" ajouté au cours avec succès!`);
            this.showExistingMaterials = false;
            
            // Проверяем, нет ли уже такого файла в списке
            if (!this.materials.find(m => m.id === uploadedFile.id)) {
              this.materials.push(uploadedFile);
              console.log('✅ Файл добавлен в локальный список материалов');
            }
            
            // Перезагружаем файлы через небольшую задержку для синхронизации с сервером
            setTimeout(() => {
              this.loadFiles();
            }, 500);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la liaison du matériau au cours:', error);
            // Если связывание не удалось, пробуем загрузить файл заново
            console.log('⚠️ Tentative de téléchargement du fichier...');
            this.downloadAndUploadFile(material, courseId);
          }
        });
      } else {
        this.notificationService.error('Le matériau n\'a pas de contenu');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'ajout du matériau:', error);
      this.notificationService.error('Erreur lors de l\'ajout du matériau');
    }
  }

  private downloadAndUploadFile(material: Material, courseId: string): void {
    // Преобразуем URL если нужно (добавляем префикс API Gateway если отсутствует)
    let fileUrl = material.content;
    
    // Если URL относительный или начинается с /files, добавляем базовый URL
    if (fileUrl.startsWith('/files') || !fileUrl.startsWith('http')) {
      // Убираем /files если есть, так как API_ENDPOINTS.FILES уже содержит его
      if (fileUrl.startsWith('/files')) {
        fileUrl = fileUrl.substring(6); // Убираем '/files'
      }
      fileUrl = `${API_ENDPOINTS.FILES}${fileUrl}`;
    }
    
    console.log('📥 Загрузка файла по URL:', fileUrl);
    
    // Используем HttpClient для правильной обработки CORS и аутентификации
    this.http.get(fileUrl, { 
      responseType: 'blob',
      headers: {
        // Добавляем токен авторизации если нужно
      }
    }).subscribe({
      next: (blob) => {
        console.log('✅ Файл загружен, размер:', blob.size);
        const fileExtension = this.getFileExtensionFromUrl(material.content);
        const fileName = `${material.title}${fileExtension}`;
        
        // Определяем MIME тип из blob или по расширению
        let mimeType = blob.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          mimeType = this.getMimeTypeFromExtension(fileExtension);
        }
        
        const file = new File([blob], fileName, { type: mimeType });
        console.log('📤 Загрузка файла в курс:', fileName, 'тип:', mimeType);
        
        const tag = this.selectedLesson || this.selectedSubSection || this.selectedSection || undefined;
        this.fileUploadService.uploadFileAsCourse(file, courseId, tag).subscribe({
          next: (response) => {
            console.log('✅ Материал добавлен в курс:', response);
            
            const uploadedFile: UploadedFile = {
              id: response.id,
              filename: material.title,
              url: response.url,
              mimetype: mimeType,
              tag: tag,
              description: material.description || undefined,
              courseId: courseId,
              createdAt: response.createdAt,
            };
            
            // Обновляем материалы в модалке превью урока через событие
            window.dispatchEvent(new CustomEvent('materialAdded', {
              detail: { material: uploadedFile }
            }));
            
            this.notificationService.success(`Matériau "${material.title}" ajouté au cours avec succès!`);
            this.showExistingMaterials = false;
            // Перезагружаем файлы чтобы обновить список
            this.loadFiles();
          },
          error: (error) => {
            console.error('❌ Erreur lors de l\'ajout du matériau au cours:', error);
            this.notificationService.error('Erreur lors de l\'ajout du matériau au cours');
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors du téléchargement du fichier:', error);
        console.error('URL использованный:', fileUrl);
        this.notificationService.error(`Impossible de télécharger le fichier: ${error.message || 'Erreur de connexion'}`);
      }
    });
  }

  private getFileExtensionFromUrl(url: string): string {
    const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
    return match ? `.${match[1]}` : '';
  }

  getMaterialTypeIcon(type: string): string {
    switch (type) {
      case 'text': return 'fas fa-file-text';
      case 'audio': return 'fas fa-volume-up';
      case 'video': return 'fas fa-video';
      case 'pdf': return 'fas fa-file-pdf';
      case 'image': return 'fas fa-image';
      default: return 'fas fa-file';
    }
  }

  getMaterialTypeFromMime(mimetype: string): string {
    if (!mimetype) return 'file';
    if (mimetype.includes('text')) return 'text';
    if (mimetype.includes('audio')) return 'audio';
    if (mimetype.includes('video')) return 'video';
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('image')) return 'image';
    return mimetype;
  }

  getMimeTypeFromExtension(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
      '.mp4': 'video/mp4',
      '.avi': 'video/x-msvideo',
      '.mov': 'video/quicktime',
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  async deleteMaterial(material: UploadedFile): Promise<void> {
    // Проверяем, является ли это материалом конструктора
    const constructorId = (material as any).constructorId;
    const isConstructorMaterial = !!constructorId;

    if (isConstructorMaterial) {
      // Для материалов конструктора предлагаем отвязать от курса или удалить полностью
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '500px',
        data: {
          title: 'Suppression de matériau',
          message: 'Ce matériau provient d\'un constructeur. Voulez-vous le supprimer complètement ou simplement l\'enlever du cours ?',
          confirmText: 'Supprimer complètement',
          cancelText: 'Enlever du cours seulement'
        }
      });

      dialogRef.afterClosed().subscribe(action => {
        if (action === undefined) {
          return; // Пользователь закрыл диалог без выбора
        }

        if (!this.courseId) {
          this.notificationService.error('Aucun cours sélectionné');
          return;
        }

        const currentUser = this.authService.getCurrentUser();
        const token = this.authService.getAccessToken();
        if (!currentUser?.id || !token) {
          this.notificationService.error('Erreur d\'authentification');
          return;
        }

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });

        // Сохраняем копию материала на случай ошибки
        const materialCopy = { ...material };
        const materialIndex = this.materials.findIndex(m => m.id === material.id);
        
        if (action) {
          // Удаляем конструктор полностью - запрашиваем подтверждение
          const confirmDeleteRef = this.dialog.open(ConfirmDialogComponent, {
            width: '500px',
            data: {
              title: 'Confirmation de suppression',
              message: 'Êtes-vous sûr de vouloir supprimer définitivement ce constructeur ? Cette action est irréversible.',
              confirmText: 'Supprimer',
              cancelText: 'Annuler'
            }
          });

          confirmDeleteRef.afterClosed().subscribe(confirmed => {
            if (!confirmed) {
              return; // Пользователь отменил удаление
            }

            // Удаляем из массива сразу
            if (materialIndex !== -1) {
              this.materials.splice(materialIndex, 1);
            }

            this.http.delete(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, { headers }).subscribe({
              next: () => {
                // Также удаляем файл, если он есть
                if (material.id) {
                  this.fileUploadService.deleteFile(material.id, this.courseId!).subscribe({
                    next: () => {},
                    error: () => {} // Игнорируем ошибку удаления файла
                  });
                }
                this.notificationService.success('Constructeur supprimé avec succès');
                this.cdr.detectChanges();
              },
              error: (error) => {
                console.error('❌ Erreur lors de la suppression du constructeur:', error);
                // В случае ошибки возвращаем элемент обратно
                if (materialIndex !== -1) {
                  this.materials.splice(materialIndex, 0, materialCopy);
                }
                this.notificationService.error('Erreur lors de la suppression du constructeur');
              }
            });
          });
        } else {
          // Отвязываем от курса (убираем courseId и courseLessonId)
          if (materialIndex !== -1) {
            this.materials.splice(materialIndex, 1);
          }

          this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, {
            courseId: null,
            courseLessonId: null
          }, { headers }).subscribe({
            next: () => {
              // Также удаляем файл из курса
              if (material.id) {
                this.fileUploadService.deleteFile(material.id, this.courseId!).subscribe({
                  next: () => {},
                  error: () => {} // Игнорируем ошибку удаления файла
                });
              }
              this.notificationService.success('Matériau retiré du cours avec succès');
              this.cdr.detectChanges();
            },
            error: (error) => {
              console.error('❌ Erreur lors du retrait du matériau du cours:', error);
              // В случае ошибки возвращаем элемент обратно
              if (materialIndex !== -1) {
                this.materials.splice(materialIndex, 0, materialCopy);
              }
              this.notificationService.error('Erreur lors du retrait du matériau du cours');
            }
          });
        }
      });
    } else {
      // Обычный файл - удаляем как раньше
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        width: '500px',
        data: {
          title: 'Suppression de matériau',
          message: 'Êtes-vous sûr de vouloir supprimer ce matériau du cours ? Le fichier restera disponible dans Entraînement.',
          confirmText: 'Supprimer',
          cancelText: 'Annuler'
        }
      });

      dialogRef.afterClosed().subscribe(confirmed => {
        if (!confirmed) {
          return; // Пользователь отменил удаление
        }

        if (!this.courseId) {
          this.notificationService.error('Aucun cours sélectionné');
          return;
        }

        // Сохраняем копию материала на случай ошибки
        const materialCopy = { ...material };
        
        // Удаляем элемент из массива сразу для мгновенного обновления UI
        const materialIndex = this.materials.findIndex(m => m.id === material.id);
        if (materialIndex !== -1) {
          this.materials.splice(materialIndex, 1);
        }

        // Удаляем только связь с курсом, файл остается в системе
        this.fileUploadService.deleteFile(material.id, this.courseId).subscribe({
          next: () => {
            // Успешно удалено из курса - список уже обновлен
            this.notificationService.success('Matériau supprimé du cours avec succès! Le fichier reste disponible dans Entraînement.');
            // Опционально: перезагружаем файлы для синхронизации с сервером
            setTimeout(() => {
              this.loadFiles();
            }, 500);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la suppression du matériau du cours:', error);
            // В случае ошибки возвращаем элемент обратно в массив
            if (materialIndex !== -1) {
              this.materials.splice(materialIndex, 0, materialCopy);
            }
            this.notificationService.error('Erreur lors de la suppression du matériau du cours');
          }
        });
      });
    }
  }

  // Отвязать материал конструктора от урока (убрать courseLessonId)
  async detachConstructorMaterialFromLesson(material: UploadedFile): Promise<void> {
    const constructorId = (material as any).constructorId;
    if (!constructorId) {
      this.notificationService.error('Ce matériau n\'est pas un constructeur');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Retirer le matériau',
        message: 'Voulez-vous retirer ce matériau de ce cours ? Il restera disponible dans vos constructeurs.',
        confirmText: 'Retirer',
        cancelText: 'Annuler'
      }
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return; // Пользователь отменил действие
      }

      const currentUser = this.authService.getCurrentUser();
      const token = this.authService.getAccessToken();
      if (!currentUser?.id || !token) {
        this.notificationService.error('Erreur d\'authentification');
        return;
      }

      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });

      // Сохраняем копию материала на случай ошибки
      const materialCopy = { ...material };
      const materialIndex = this.materials.findIndex(m => m.id === material.id);
      
      // Удаляем из массива сразу
      if (materialIndex !== -1) {
        this.materials.splice(materialIndex, 1);
      }

      // Убираем courseLessonId (отвязываем от урока), но оставляем courseId
      this.http.put(`${API_ENDPOINTS.CONSTRUCTORS}/${constructorId}`, {
        courseLessonId: null
      }, { headers }).subscribe({
        next: () => {
          this.notificationService.success('Matériau retiré de la leçon avec succès');
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur lors du retrait du matériau de la leçon:', error);
          // В случае ошибки возвращаем элемент обратно
          if (materialIndex !== -1) {
            this.materials.splice(materialIndex, 0, materialCopy);
          }
          this.notificationService.error('Erreur lors du retrait du matériau de la leçon');
        }
      });
    });
  }

  private updateSEOTags(): void {
    const pageTitle = 'Ajouter un cours | LINGUACONNECT';
    const pageDescription = 'Créez et gérez vos cours en ligne avec des matériaux pédagogiques.';

    this.title.setTitle(pageTitle);
    this.meta.updateTag({ name: 'description', content: pageDescription });
    this.meta.updateTag({ property: 'og:title', content: pageTitle });
    this.meta.updateTag({ property: 'og:description', content: pageDescription });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
  }

  // Получить материалы для конкретного раздела
  getMaterialsBySection(section: string | null): UploadedFile[] {
    if (!section) {
      return [];
    }
    return this.materials.filter(m => m.tag === section);
  }

  // Получить материалы для конкретного урока (включая дополнительные материалы)
  // Получить courseLessonId из объекта урока
  getCourseLessonId(lessonObj: any): string | undefined {
    return lessonObj?.courseLessonId;
  }

  getMaterialsByLesson(lessonName: string, section?: string, subSection?: string | null, courseLessonId?: string): UploadedFile[] {
    // Обычные материалы с тегом равным имени урока
    const regularMaterials = this.materials.filter(m => m.tag === lessonName);
    
    // Дополнительные материалы с тегом `${lessonName}_supplementary`
    // Для конструкторов проверяем courseLessonId для точной идентификации урока
    const supplementaryMaterials = this.materials.filter(m => {
      if (!m.tag || !m.tag.includes('_supplementary')) {
        return false;
      }
      
      const materialLessonName = m.tag.replace('_supplementary', '');
      
      // Если это материал конструктора и есть courseLessonId - проверяем точное совпадение
      if ((m as any).courseLessonId && courseLessonId) {
        return (m as any).courseLessonId === courseLessonId;
      }
      
      // Для обычных материалов проверяем только имя урока
      return materialLessonName === lessonName;
    });
    
    // Объединяем оба типа материалов и убираем дубликаты по ID
    const allMaterialsMap = new Map<number, UploadedFile>();
    [...regularMaterials, ...supplementaryMaterials].forEach(m => {
      if (!allMaterialsMap.has(m.id)) {
        allMaterialsMap.set(m.id, m);
      }
    });
    const allMaterials = Array.from(allMaterialsMap.values());
    
    // Логирование только для диагностики (можно убрать после исправления)
    // if (allMaterials.length === 0 && this.materials.length > 0) {
    //   console.log(`🔍 Поиск материалов для урока "${lessonName}":`, {
    //     totalMaterials: this.materials.length,
    //     regularMaterialsCount: regularMaterials.length,
    //     supplementaryMaterialsCount: supplementaryMaterials.length,
    //     materialTags: this.materials.map(m => ({ 
    //       filename: m.filename, 
    //       tag: m.tag, 
    //       mimetype: m.mimetype,
    //       hasDrillGridData: !!(m as any).drillGridData
    //     }))
    //   });
    // }
    
    return allMaterials;
  }

  // Получить уроки в sous-section
  getLessonsInSubSection(section: string, subSection: string): Array<{ name: string; type: 'self' | 'call'; description?: string }> {
    if (this.lessonsInSubSections[section] && this.lessonsInSubSections[section][subSection]) {
      return this.lessonsInSubSections[section][subSection];
    }
    return [];
  }

  // Получить уроки в секции (не в sous-section)
  getLessonsInSection(section: string): Array<{ name: string; type: 'self' | 'call'; description?: string }> {
    // Получаем все имена уроков из sous-section для этой секции
    const lessonNamesInSubSections: string[] = [];
    if (this.lessonsInSubSections[section]) {
      Object.values(this.lessonsInSubSections[section]).forEach(lessonArray => {
        lessonArray.forEach(lesson => lessonNamesInSubSections.push(lesson.name));
      });
    }
    
    // Возвращаем только уроки, которые не находятся в sous-section
    if (this.lessons[section]) {
      return this.lessons[section].filter(lesson => !lessonNamesInSubSections.includes(lesson.name));
    }
    return [];
  }

  // Получить тип урока
  getLessonType(section: string, lessonName: string, subSection?: string): 'self' | 'call' {
    if (subSection) {
      const lessons = this.getLessonsInSubSection(section, subSection);
      const lesson = lessons.find(l => l.name === lessonName);
      return lesson?.type || 'self';
    } else {
      const lessons = this.getLessonsInSection(section);
      const lesson = lessons.find(l => l.name === lessonName);
      return lesson?.type || 'self';
    }
  }

  // Drag-n-Drop handlers
  onDragStart(event: DragEvent, section: string, subSection: string | null, lesson: string): void {
    this.draggedLesson = { section, subSection, lesson };
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', '');
    }
    if (event.target) {
      (event.target as HTMLElement).style.opacity = '0.5';
    }
  }

  onDragEnd(event: DragEvent): void {
    if (event.target) {
      (event.target as HTMLElement).style.opacity = '1';
    }
    // Убираем класс drag-over со всех элементов
    document.querySelectorAll('.subsection-item').forEach(el => {
      el.classList.remove('drag-over');
    });
    document.querySelectorAll('.lessons-container').forEach(el => {
      el.classList.remove('drag-over');
    });
  }

  onLessonDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onLessonDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (event.currentTarget) {
      (event.currentTarget as HTMLElement).classList.add('drag-over');
    }
  }

  onLessonDragLeave(event: DragEvent): void {
    if (event.currentTarget) {
      (event.currentTarget as HTMLElement).classList.remove('drag-over');
    }
  }

  onDropLesson(event: DragEvent, targetSection: string, targetSubSection: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.currentTarget) {
      (event.currentTarget as HTMLElement).classList.remove('drag-over');
    }

    if (!this.draggedLesson) {
      return;
    }

    const { section: sourceSection, subSection: sourceSubSection, lesson } = this.draggedLesson;

    // Если урок уже в этой sous-section, ничего не делаем
    if (sourceSection === targetSection && sourceSubSection === targetSubSection) {
      this.draggedLesson = null;
      return;
    }

    // Удаляем урок из исходного места и сохраняем его объект
    let lessonObj: { name: string; type: 'self' | 'call'; description?: string } | undefined;
    
    if (sourceSubSection) {
      // Удаляем из sous-section
      if (this.lessonsInSubSections[sourceSection] && this.lessonsInSubSections[sourceSection][sourceSubSection]) {
        const lessons = [...this.lessonsInSubSections[sourceSection][sourceSubSection]];
        lessonObj = lessons.find(l => l.name === lesson);
        this.lessonsInSubSections[sourceSection][sourceSubSection] = 
          this.lessonsInSubSections[sourceSection][sourceSubSection].filter(l => l.name !== lesson);
        if (this.lessonsInSubSections[sourceSection][sourceSubSection].length === 0) {
          delete this.lessonsInSubSections[sourceSection][sourceSubSection];
        }
      }
    } else {
      // Удаляем из секции
      if (this.lessons[sourceSection]) {
        const lessons = [...this.lessons[sourceSection]];
        lessonObj = lessons.find(l => l.name === lesson);
        this.lessons[sourceSection] = this.lessons[sourceSection].filter(l => l.name !== lesson);
        if (this.lessons[sourceSection].length === 0) {
          delete this.lessons[sourceSection];
        }
      }
    }

    // Добавляем урок в целевую sous-section
    if (!this.lessonsInSubSections[targetSection]) {
      this.lessonsInSubSections[targetSection] = {};
    }
    if (!this.lessonsInSubSections[targetSection][targetSubSection]) {
      this.lessonsInSubSections[targetSection][targetSubSection] = [];
    }
    
    if (lessonObj) {
      this.lessonsInSubSections[targetSection][targetSubSection].push(lessonObj);
    } else {
      // Fallback: создаем новый объект урока
      this.lessonsInSubSections[targetSection][targetSubSection].push({ name: lesson, type: 'self' });
    }

    this.saveSections();
    this.notificationService.success(`Leçon "${lesson}" déplacée vers "${targetSubSection}" avec succès!`);
    this.draggedLesson = null;
  }

  // Drag-n-Drop для перемещения урока обратно на уровень секции
  onSectionDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onSectionDragEnter(event: DragEvent): void {
    event.preventDefault();
    if (event.currentTarget) {
      (event.currentTarget as HTMLElement).classList.add('drag-over');
    }
  }

  onSectionDragLeave(event: DragEvent): void {
    // Проверяем, что мы действительно покинули контейнер, а не перешли на дочерний элемент
    const currentTarget = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as HTMLElement;
    
    if (currentTarget && (!relatedTarget || !currentTarget.contains(relatedTarget))) {
      currentTarget.classList.remove('drag-over');
    }
  }

  // Получить список связанных подсекций для CDK drag-drop
  getConnectedSubsectionLists(section: string): string[] {
    if (!this.subSections[section] || this.subSections[section].length === 0) {
      return [];
    }
    return this.subSections[section].map(subSection => `subsection-${section}-${subSection}`);
  }

  // Получить список связанных списков для подсекции (секция + другие подсекции)
  getConnectedListsForSubsection(section: string, currentSubSection: string): string[] {
    const connected: string[] = [`section-${section}`];
    if (this.subSections[section] && this.subSections[section].length > 0) {
      this.subSections[section].forEach(subSection => {
        if (subSection !== currentSubSection) {
          connected.push(`subsection-${section}-${subSection}`);
        }
      });
    }
    return connected;
  }

  // CDK DragDrop для изменения порядка уроков внутри подсекции или перемещения между подсекцией и секцией
  dropLessonInSubSection(event: CdkDragDrop<any[]>, section: string, subSection: string): void {
    // Если перемещение внутри той же подсекции - просто меняем порядок
    if (event.previousContainer === event.container) {
      const lessons = this.getLessonsInSubSection(section, subSection);
      moveItemInArray(lessons, event.previousIndex, event.currentIndex);
      
      if (!this.lessonsInSubSections[section]) {
        this.lessonsInSubSections[section] = {};
      }
      this.lessonsInSubSections[section][subSection] = lessons;
      this.saveSections();
      return;
    }

    // Если перемещение из другой подсекции или из секции
    const previousContainerId = event.previousContainer.id;
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;

    let lessonObj: { name: string; type: 'self' | 'call'; description?: string } | undefined;

    // Определяем источник
    if (previousContainerId === `section-${section}`) {
      // Перемещение из секции в подсекцию (внутри той же секции)
      const lessons = this.getLessonsInSection(section);
      lessonObj = lessons[previousIndex];
      lessons.splice(previousIndex, 1);
      this.lessons[section] = lessons;
    } else if (previousContainerId.startsWith(`subsection-${section}-`)) {
      // Перемещение из другой подсекции в эту подсекцию
      const sourceSubSection = previousContainerId.replace(`subsection-${section}-`, '');
      const lessons = this.getLessonsInSubSection(section, sourceSubSection);
      lessonObj = lessons[previousIndex];
      lessons.splice(previousIndex, 1);
      this.lessonsInSubSections[section][sourceSubSection] = lessons;
      if (lessons.length === 0) {
        delete this.lessonsInSubSections[section][sourceSubSection];
      }
    }

    // Добавляем урок в целевую подсекцию
    if (lessonObj) {
      if (!this.lessonsInSubSections[section]) {
        this.lessonsInSubSections[section] = {};
      }
      if (!this.lessonsInSubSections[section][subSection]) {
        this.lessonsInSubSections[section][subSection] = [];
      }
      const targetLessons = this.lessonsInSubSections[section][subSection];
      targetLessons.splice(currentIndex, 0, lessonObj);
      this.saveSections();
    }
  }

  // CDK DragDrop для изменения порядка уроков внутри секции или перемещения из подсекции в секцию
  dropLessonInSection(event: CdkDragDrop<any[]>, section: string): void {
    // Если перемещение внутри той же секции - просто меняем порядок
    if (event.previousContainer === event.container) {
      const lessons = this.getLessonsInSection(section);
      moveItemInArray(lessons, event.previousIndex, event.currentIndex);
      this.lessons[section] = lessons;
      this.saveSections();
      return;
    }

    // Если перемещение из подсекции в секцию (внутри той же секции)
    const previousContainerId = event.previousContainer.id;
    const previousIndex = event.previousIndex;
    const currentIndex = event.currentIndex;

    // Проверяем, что перемещение происходит внутри той же секции
    if (previousContainerId.startsWith(`subsection-${section}-`)) {
      const sourceSubSection = previousContainerId.replace(`subsection-${section}-`, '');
      const lessons = this.getLessonsInSubSection(section, sourceSubSection);
      const lessonObj = lessons[previousIndex];
      
      // Удаляем из подсекции
      lessons.splice(previousIndex, 1);
      this.lessonsInSubSections[section][sourceSubSection] = lessons;
      if (lessons.length === 0) {
        delete this.lessonsInSubSections[section][sourceSubSection];
      }

      // Добавляем в секцию
      if (!this.lessons[section]) {
        this.lessons[section] = [];
      }
      const sectionLessons = this.lessons[section];
      sectionLessons.splice(currentIndex, 0, lessonObj);
      this.saveSections();
    }
  }

  // Перемещение подсекций внутри секции (structure-tree)
  dropSubSectionQuick(event: CdkDragDrop<string[]>, section: string): void {
    const subs = this.subSections[section];
    if (!subs) {
      return;
    }
    moveItemInArray(subs, event.previousIndex, event.currentIndex);
    this.subSections[section] = [...subs];
    this.saveSections();
  }

  // Перемещение уроков внутри подсекции (structure-tree)
  dropLessonQuickInSubSection(event: CdkDragDrop<any[]>, section: string, subSection: string): void {
    if (event.previousContainer !== event.container) {
      // В быстром редакторе поддерживаем только перестановку внутри одной подсекции
      return;
    }

    const lessons = this.getLessonsInSubSection(section, subSection);
    moveItemInArray(lessons, event.previousIndex, event.currentIndex);

    if (!this.lessonsInSubSections[section]) {
      this.lessonsInSubSections[section] = {};
    }
    this.lessonsInSubSections[section][subSection] = [...lessons];
    this.saveSections();
  }

  // Перемещение уроков внутри секции (structure-tree)
  dropLessonQuickInSection(event: CdkDragDrop<any[]>, section: string): void {
    if (event.previousContainer !== event.container) {
      // В быстром редакторе поддерживаем только перестановку внутри секции
      return;
    }

    const lessons = this.getLessonsInSection(section);
    moveItemInArray(lessons, event.previousIndex, event.currentIndex);
    this.lessons[section] = [...lessons];
    this.saveSections();
  }

  // Перемещение секций целиком (structure-tree)
  dropSectionQuick(event: CdkDragDrop<string[]>): void {
    moveItemInArray(this.sections, event.previousIndex, event.currentIndex);
    this.sections = [...this.sections];
    this.saveSections();
  }

  onDropLessonToSection(event: DragEvent, targetSection: string): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.currentTarget) {
      (event.currentTarget as HTMLElement).classList.remove('drag-over');
    }

    if (!this.draggedLesson) {
      console.log('⚠️ Нет перетаскиваемого урока');
      return;
    }

    const { section: sourceSection, subSection: sourceSubSection, lesson } = this.draggedLesson;
    
    console.log('📦 Перемещение урока:', {
      lesson,
      from: { section: sourceSection, subSection: sourceSubSection },
      to: { section: targetSection, subSection: null }
    });

    // Если урок уже в этой секции (не в sous-section), ничего не делаем
    if (sourceSection === targetSection && !sourceSubSection) {
      console.log('ℹ️ Урок уже находится на уровне секции');
      this.draggedLesson = null;
      return;
    }

    // Удаляем урок из исходного места и сохраняем его объект
    let lessonObj: { name: string; type: 'self' | 'call'; description?: string } | undefined;
    
    if (sourceSubSection) {
      // Удаляем из sous-section
      if (this.lessonsInSubSections[sourceSection] && this.lessonsInSubSections[sourceSection][sourceSubSection]) {
        const lessons = [...this.lessonsInSubSections[sourceSection][sourceSubSection]];
        lessonObj = lessons.find(l => l.name === lesson);
        this.lessonsInSubSections[sourceSection][sourceSubSection] = 
          this.lessonsInSubSections[sourceSection][sourceSubSection].filter(l => l.name !== lesson);
        if (this.lessonsInSubSections[sourceSection][sourceSubSection].length === 0) {
          delete this.lessonsInSubSections[sourceSection][sourceSubSection];
        }
        if (Object.keys(this.lessonsInSubSections[sourceSection]).length === 0) {
          delete this.lessonsInSubSections[sourceSection];
        }
      }
    } else {
      // Удаляем из другой секции
      if (this.lessons[sourceSection]) {
        const lessons = [...this.lessons[sourceSection]];
        lessonObj = lessons.find(l => l.name === lesson);
        this.lessons[sourceSection] = this.lessons[sourceSection].filter(l => l.name !== lesson);
        if (this.lessons[sourceSection].length === 0) {
          delete this.lessons[sourceSection];
        }
      }
    }

    // Добавляем урок в целевую секцию (на уровень секции, не в sous-section)
    if (!this.lessons[targetSection]) {
      this.lessons[targetSection] = [];
    }
    if (lessonObj) {
      this.lessons[targetSection].push(lessonObj);
    } else {
      // Fallback: создаем новый объект урока
      this.lessons[targetSection].push({ name: lesson, type: 'self' });
    }

    this.saveSections();
    this.notificationService.success(`Leçon "${lesson}" déplacée vers "${targetSection}" avec succès!`);
    this.draggedLesson = null;
  }

  // Получить сводку по урокам по секциям
  getLessonsSummary(): { section: string; count: number }[] {
    const summary: { section: string; count: number }[] = [];
    
    this.sections.forEach(section => {
      let count = 0;
      
      // Уроки на уровне секции (только те, которые не находятся в sous-section)
      const lessonsInSection = this.getLessonsInSection(section);
      count += lessonsInSection.length;
      
      // Уроки в sous-section этой секции
      if (this.lessonsInSubSections[section]) {
        Object.values(this.lessonsInSubSections[section]).forEach(lessonArray => {
          count += lessonArray.length;
        });
      }
      
      if (count > 0) {
        summary.push({ section, count });
      }
    });
    
    return summary;
  }

  // Загрузить кэш домашних заданий (шаблоны курсов)
  loadHomeworkCache(): void {
    if (!this.courseId) return;
    
    // Собираем все sourceItemId для урока и всех материалов
    const sourceItemIds: string[] = [];
    
    // Добавляем sourceItemId для каждого урока в каждой секции
    this.sections.forEach(section => {
      // Уроки на уровне секции
      const lessonsInSection = this.getLessonsInSection(section);
      lessonsInSection.forEach(lesson => {
        const lessonItemId = `${this.courseId}_${section}_${lesson.name}`;
        sourceItemIds.push(lessonItemId);
        
        // Материалы для этого урока
        const lessonObj = this.lessons[section]?.find(l => l.name === lesson.name);
        const courseLessonId = (lessonObj as any)?.courseLessonId;
        const materials = this.getMaterialsByLesson(lesson.name, section, null, courseLessonId);
        materials.forEach(material => {
          const materialItemId = `${this.courseId}_${section}_${lesson.name}_material_${material.id}`;
          sourceItemIds.push(materialItemId);
        });
      });
      
      // Уроки в sous-section
      if (this.lessonsInSubSections[section]) {
        Object.keys(this.lessonsInSubSections[section]).forEach(subSection => {
          const lessonsInSubSection = this.getLessonsInSubSection(section, subSection);
          lessonsInSubSection.forEach(lesson => {
            const lessonItemId = `${this.courseId}_${section}_${subSection}_${lesson.name}`;
            sourceItemIds.push(lessonItemId);
            
            // Материалы для этого урока
            const lessonObjSub = this.lessonsInSubSections[section]?.[subSection]?.find(l => l.name === lesson.name);
            const courseLessonIdSub = (lessonObjSub as any)?.courseLessonId;
            const materials = this.getMaterialsByLesson(lesson.name, section, subSection, courseLessonIdSub);
            materials.forEach(material => {
              const materialItemId = `${this.courseId}_${section}_${subSection}_${lesson.name}_material_${material.id}`;
              sourceItemIds.push(materialItemId);
            });
          });
        });
      }
    });
    
    if (sourceItemIds.length === 0) {
      this.homeworkCache = {};
      this.homeworkCacheLoaded = true;
      return;
    }
    
    // Загружаем шаблоны курсов для всех sourceItemId
    const homeworkObservables = sourceItemIds.map(itemId => 
      this.homeworkService.getCourseTemplateHomeworkBySourceItemId(itemId)
    );
    
    forkJoin(homeworkObservables).subscribe({
        next: (homeworkArrays) => {
          // Группируем задания по itemId
          this.homeworkCache = {};
          homeworkArrays.forEach((homeworkList, index) => {
            const itemId = sourceItemIds[index];
            if (!this.homeworkCache[itemId]) {
              this.homeworkCache[itemId] = [];
            }
            this.homeworkCache[itemId].push(...homeworkList);
          });
          this.homeworkCacheLoaded = true;
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Ошибка загрузки домашних заданий:', error);
          this.homeworkCache = {};
          this.homeworkCacheLoaded = true;
        }
      });
  }

  // Получить количество заданий для материала
  getHomeworkCountForMaterial(materialId: number, lessonName: string, section: string, subSection?: string): number {
    if (!this.courseId) return 0;
    
    // Формируем itemId в том же формате, что и в loadHomeworkCache
    const subSectionPart = subSection ? `${subSection}_` : '';
    const itemId = `${this.courseId}_${section}_${subSectionPart}${lessonName}_material_${materialId}`;
    
    return this.homeworkCache[itemId]?.length || 0;
  }

  // Получить количество общих заданий для урока
  getHomeworkCountForLesson(lessonName: string, section: string, subSection?: string): number {
    if (!this.courseId) return 0;
    
    // Формируем itemId для урока (без _material_)
    const subSectionPart = subSection ? `${subSection}_` : '';
    const itemId = `${this.courseId}_${section}_${subSectionPart}${lessonName}`;
    
    return this.homeworkCache[itemId]?.length || 0;
  }

  // Получить планируемую длительность для урока типа 'call'
  getPlannedDurationMinutes(lessonObj: any): number | null {
    return lessonObj?.plannedDurationMinutes || null;
  }

  // ==================== QUICK STRUCTURE EDITOR METHODS ====================

  private async openTextPrompt(data: PromptDialogData): Promise<string | undefined> {
    const dialogRef = this.dialog.open(PromptDialogComponent, {
      width: '420px',
      data
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    if (typeof result === 'string' && result.trim()) {
      return result.trim();
    }
    return undefined;
  }

  private async openConfirmDialog(data: ConfirmDialogData): Promise<boolean> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data
    });
    const result = await firstValueFrom(dialogRef.afterClosed());
    return !!result;
  }

  async addSectionQuick(): Promise<void> {
    const sectionName = await this.openTextPrompt({
      title: 'Nom de la section',
      label: 'Nom',
      placeholder: 'Ex: Section 1'
    });
    if (!sectionName) return;

    let uniqueSectionName = sectionName;
    let counter = 1;
    while (this.sections.includes(uniqueSectionName)) {
      uniqueSectionName = `${sectionName} (${counter})`;
      counter++;
    }
    this.sections.push(uniqueSectionName);
    this.subSections[uniqueSectionName] = [];
    this.saveSections();
  }

  async editSectionQuick(section: string): Promise<void> {
    const newName = await this.openTextPrompt({
      title: 'Nouveau nom de la section',
      label: 'Nom',
      defaultValue: section
    });
    if (newName && newName !== section) {
      const index = this.sections.indexOf(section);
      if (index !== -1) {
        this.sections[index] = newName;
        if (this.subSections[section]) {
          this.subSections[newName] = this.subSections[section];
          delete this.subSections[section];
        }
        if (this.lessons[section]) {
          this.lessons[newName] = this.lessons[section];
          delete this.lessons[section];
        }
        if (this.lessonsInSubSections[section]) {
          this.lessonsInSubSections[newName] = this.lessonsInSubSections[section];
          delete this.lessonsInSubSections[section];
        }
        this.saveSections();
      }
    }
  }

  async removeSectionQuick(section: string): Promise<void> {
    const confirmed = await this.openConfirmDialog({
      title: 'Supprimer la section',
      message: `Êtes-vous sûr de vouloir supprimer la section "${section}" et tout son contenu ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (confirmed) {
      this.removeSection(section);
    }
  }

  async addSubSectionQuick(section: string): Promise<void> {
    const subSectionName = await this.openTextPrompt({
      title: 'Nom de la sous-section',
      label: 'Sous-section',
      placeholder: 'Ex: Introduction'
    });
    if (subSectionName) {
      if (!this.subSections[section]) {
        this.subSections[section] = [];
      }
      let uniqueSubSectionName = subSectionName;
      let counter = 1;
      while (this.subSections[section].includes(uniqueSubSectionName)) {
        uniqueSubSectionName = `${subSectionName} (${counter})`;
        counter++;
      }
      this.subSections[section].push(uniqueSubSectionName);
      this.saveSections();
    }
  }

  async editSubSectionQuick(section: string, subSection: string): Promise<void> {
    const newName = await this.openTextPrompt({
      title: 'Nouveau nom de la sous-section',
      label: 'Sous-section',
      defaultValue: subSection
    });
    if (newName && newName !== subSection) {
      const index = this.subSections[section].indexOf(subSection);
      if (index !== -1) {
        this.subSections[section][index] = newName;
        if (this.lessonsInSubSections[section] && this.lessonsInSubSections[section][subSection]) {
          this.lessonsInSubSections[section][newName] = this.lessonsInSubSections[section][subSection];
          delete this.lessonsInSubSections[section][subSection];
        }
        this.saveSections();
      }
    }
  }

  async removeSubSectionQuick(section: string, subSection: string): Promise<void> {
    const confirmed = await this.openConfirmDialog({
      title: 'Supprimer la sous-section',
      message: `Êtes-vous sûr de vouloir supprimer la sous-section "${subSection}" et tout son contenu ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (confirmed) {
      this.subSections[section] = this.subSections[section].filter(sub => sub !== subSection);
      if (this.lessonsInSubSections[section] && this.lessonsInSubSections[section][subSection]) {
        delete this.lessonsInSubSections[section][subSection];
      }
      this.saveSections();
    }
  }

  async addLessonQuick(section: string, subSection?: string): Promise<void> {
    const lessonName = await this.openTextPrompt({
      title: 'Nom de la leçon',
      label: 'Leçon',
      placeholder: 'Ex: Leçon 1'
    });
    if (lessonName) {
      const dialogRef = this.dialog.open(LessonTypeSelectorComponent, {
        width: '400px',
        data: {}
      });

      dialogRef.afterClosed().subscribe(async (lessonType: LessonType | null) => {
        if (lessonType) {
          const description = await this.openTextPrompt({
            title: 'Description de la leçon (optionnel)',
            label: 'Description',
            defaultValue: ''
          });
          const lessonData = {
            name: lessonName,
            type: lessonType,
            description: description || undefined
          };

          if (subSection) {
            if (!this.lessonsInSubSections[section]) {
              this.lessonsInSubSections[section] = {};
            }
            if (!this.lessonsInSubSections[section][subSection]) {
              this.lessonsInSubSections[section][subSection] = [];
            }
            this.lessonsInSubSections[section][subSection].push(lessonData);
          } else {
            if (!this.lessons[section]) {
              this.lessons[section] = [];
            }
            this.lessons[section].push(lessonData);
          }
          this.saveSections();
        }
      });
    }
  }

  async editLessonQuick(section: string, subSection: string | null, lesson: { name: string; type: 'self' | 'call'; description?: string }): Promise<void> {
    const newName = await this.openTextPrompt({
      title: 'Nouveau nom de la leçon',
      label: 'Leçon',
      defaultValue: lesson.name
    });
    if (!newName) return;

    const newDescription = await this.openTextPrompt({
      title: 'Description de la leçon (optionnel)',
      label: 'Description',
      defaultValue: lesson.description || ''
    });
    
    if (subSection) {
      const lessonIndex = this.lessonsInSubSections[section][subSection].findIndex(l => l.name === lesson.name);
      if (lessonIndex !== -1) {
        this.lessonsInSubSections[section][subSection][lessonIndex].name = newName;
        this.lessonsInSubSections[section][subSection][lessonIndex].description = newDescription || undefined;
      }
    } else {
      const lessonIndex = this.lessons[section].findIndex(l => l.name === lesson.name);
      if (lessonIndex !== -1) {
        this.lessons[section][lessonIndex].name = newName;
        this.lessons[section][lessonIndex].description = newDescription || undefined;
      }
    }
    this.saveSections();
  }

  async removeLessonQuick(section: string, subSection: string | null, lessonName: string): Promise<void> {
    const confirmed = await this.openConfirmDialog({
      title: 'Supprimer la leçon',
      message: `Êtes-vous sûr de vouloir supprimer la leçon "${lessonName}" ?`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler'
    });
    if (!confirmed) return;

    if (subSection) {
      if (this.lessonsInSubSections[section] && this.lessonsInSubSections[section][subSection]) {
        this.lessonsInSubSections[section][subSection] = this.lessonsInSubSections[section][subSection].filter(l => l.name !== lessonName);
      }
    } else {
      if (this.lessons[section]) {
        this.lessons[section] = this.lessons[section].filter(l => l.name !== lessonName);
      }
    }
    this.saveSections();
  }

  // Открыть модалку для добавления домашнего задания
  openAddHomeworkForLesson(section: string, lesson: string): void {
    const dialogData: HomeworkModalData = {
      type: 'material',
      title: lesson,
      itemId: `${this.courseId}_${section}_${lesson}`
    };

    const dialogRef = this.dialog.open(HomeworkModalComponent, {
      width: '700px',
      maxWidth: '90vw',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('✅ Devoir créé:', result);
        this.notificationService.success(`Devoir "${result.title}" créé avec succès!`);
        // Обновляем кэш
        this.loadHomeworkCache();
      }
    });
  }

  openLessonPreview(section: string, lesson: string, subSection?: string): void {
    // Убеждаемся, что материалы загружены перед открытием модалки
    if (this.courseId && this.materials.length === 0) {
      console.log('📥 Материалы не загружены, загружаем перед открытием модалки...');
      this.loadFiles();
      // Ждем загрузки файлов перед открытием модалки
      setTimeout(() => {
        this.openLessonPreviewModal(section, lesson, subSection);
      }, 500);
      return;
    }
    
    this.openLessonPreviewModal(section, lesson, subSection);
  }

  private openLessonPreviewModal(section: string, lesson: string, subSection?: string): void {
    // Находим courseLessonId для точной идентификации урока
    let courseLessonId: string | undefined;
    if (subSection) {
      const lessonObj = this.lessonsInSubSections[section]?.[subSection]?.find(l => l.name === lesson);
      courseLessonId = (lessonObj as any)?.courseLessonId;
    } else {
      const lessonObj = this.lessons[section]?.find(l => l.name === lesson);
      courseLessonId = (lessonObj as any)?.courseLessonId;
    }
    
    const materials = this.getMaterialsByLesson(lesson, section, subSection || null, courseLessonId);
    console.log(`📋 Открытие модалки для урока "${lesson}":`, {
      foundMaterials: materials.length,
      totalMaterials: this.materials.length,
      materials: materials.map(m => ({ filename: m.filename, tag: m.tag, mimetype: m.mimetype }))
    });
    const description = this.getLessonDescription(section, subSection || null, lesson);
    
    // Находим тип урока и его настройки
    let lessonType: 'self' | 'call' = 'self';
    let plannedDurationMinutes: number | null = null;
    let courseLessonIdForType: string | undefined;
    
    if (subSection) {
      const lessonObj = this.lessonsInSubSections[section]?.[subSection]?.find(l => l.name === lesson);
      if (lessonObj) {
        lessonType = lessonObj.type;
        courseLessonIdForType = (lessonObj as any).courseLessonId;
        plannedDurationMinutes = (lessonObj as any).plannedDurationMinutes || null;
      }
    } else {
      const lessonObj = this.lessons[section]?.find(l => l.name === lesson);
      if (lessonObj) {
        lessonType = lessonObj.type;
        courseLessonIdForType = (lessonObj as any).courseLessonId;
        plannedDurationMinutes = (lessonObj as any).plannedDurationMinutes || null;
      }
    }
    
    // Для уроков типа 'call' открываем модалку настроек
    if (lessonType === 'call') {
      // Находим описание из структуры урока
      let lessonDescription: string | null = null;
      if (subSection) {
        const lessonObj = this.lessonsInSubSections[section]?.[subSection]?.find(l => l.name === lesson);
        if (lessonObj) {
          lessonDescription = lessonObj.description || null;
        }
      } else {
        const lessonObj = this.lessons[section]?.find(l => l.name === lesson);
        if (lessonObj) {
          lessonDescription = lessonObj.description || null;
        }
      }
      
      const callLessonData: CallLessonSettingsModalData = {
        courseId: this.courseId || '',
        courseLessonId: courseLessonId,
        lessonName: lesson,
        section: section,
        subSection: subSection,
        plannedDurationMinutes: plannedDurationMinutes,
        description: lessonDescription
      };

      const dialogRef = this.dialog.open(CallLessonSettingsModalComponent, {
        width: '700px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: callLessonData
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('✅ Call lesson settings saved:', result);
          // Обновляем данные урока в локальной структуре
          if (subSection) {
            const lessonObj = this.lessonsInSubSections[section]?.[subSection]?.find(l => l.name === lesson);
            if (lessonObj) {
              lessonObj.description = result.description || undefined;
              (lessonObj as any).plannedDurationMinutes = result.plannedDurationMinutes;
            }
          } else {
            const lessonObj = this.lessons[section]?.find(l => l.name === lesson);
            if (lessonObj) {
              lessonObj.description = result.description || undefined;
              (lessonObj as any).plannedDurationMinutes = result.plannedDurationMinutes;
            }
          }
          // Обновляем курс в БД (не ждем завершения, так как updateCourse асинхронный)
          this.updateCourse();
          
          // Перезагружаем курс из БД после небольшой задержки, чтобы получить актуальные данные
          setTimeout(() => {
            if (this.courseId) {
              this.courseService.getCourseById(parseInt(this.courseId, 10)).subscribe({
                next: (course) => {
                  // Обновляем уроки из БД
                  if (course.lessons) {
                    this.lessons = course.lessons;
                  }
                  if (course.lessonsInSubSections) {
                    this.lessonsInSubSections = course.lessonsInSubSections;
                  }
                  // Перезагружаем файлы и домашние задания
                  this.loadFiles();
                  this.loadHomeworkCache();
                  // Принудительно обновляем представление
                  this.cdr.detectChanges();
                },
                error: (error) => {
                  console.error('❌ Ошибка перезагрузки курса:', error);
                  // Принудительно обновляем представление даже при ошибке
                  this.cdr.detectChanges();
                }
              });
            } else {
              // Если нет courseId, просто обновляем представление
              this.cdr.detectChanges();
            }
          }, 500);
        }
      });
    } else {
      // Для уроков типа 'self' открываем обычную модалку предпросмотра
      const dialogData: LessonPreviewModalData = {
        lessonName: lesson,
        section: section,
        subSection: subSection,
        materials: materials,
        courseId: this.courseId || '',
        courseLessonId: courseLessonId,
        description: description,
        lessonType: lessonType
      };

      const dialogRef = this.dialog.open(LessonPreviewModalComponent, {
        width: '900px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        data: dialogData
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          console.log('✅ Превью урока закрыто:', result);
          // Перезагружаем файлы после закрытия модалки для обновления списка материалов
          if (this.courseId) {
            setTimeout(() => {
              this.loadFiles();
            }, 300);
          }
        }
      });
    }
  }

  /**
   * Сохраняет материал из конструктора (drill-grid и т.д.) в БД через API конструкторов
   */
  private saveConstructorMaterial(material: UploadedFile): void {
    if (!this.courseId) {
      console.error('⚠️ Нельзя сохранить материал: courseId отсутствует');
      return;
    }

    const drillGridData = (material as any).drillGridData;
    if (!drillGridData || !drillGridData.data) {
      console.warn('⚠️ Материал не содержит drillGridData:', material);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      console.error('⚠️ Пользователь не авторизован');
      return;
    }

    console.log('💾 Сохранение drill-grid в БД:', {
      filename: material.filename,
      tag: material.tag,
      courseId: this.courseId,
      userId: currentUser.id
    });

    // Извлекаем данные drill-grid из структуры drillGridData.data
    // Преобразуем в правильный формат согласно entity
    let rows = drillGridData.data.rows || [];
    let columns = drillGridData.data.columns || [];
    let cells = drillGridData.data.cells || [];
    
    // Если данные в старом формате (массивы строк), преобразуем их
    if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'string') {
      rows = rows.map((row: string, index: number) => ({
        id: `row_${index}`,
        label: row || `Ligne ${index + 1}`,
        examples: []
      }));
    }
    
    if (Array.isArray(columns) && columns.length > 0 && typeof columns[0] === 'string') {
      columns = columns.map((col: string, index: number) => ({
        id: `col_${index}`,
        label: col || `Colonne ${index + 1}`,
        examples: []
      }));
    }
    
    // Если cells в формате объекта { "0-0": "value" } или { "0_1": "value" }, преобразуем в массив
    if (cells && typeof cells === 'object' && !Array.isArray(cells)) {
      cells = Object.keys(cells).map(key => {
        // Поддерживаем оба формата: "0-0" (дефис) и "0_1" (подчеркивание)
        let rowIdx: number, colIdx: number;
        if (key.includes('-')) {
          [rowIdx, colIdx] = key.split('-').map(Number);
        } else if (key.includes('_')) {
          [rowIdx, colIdx] = key.split('_').map(Number);
        } else {
          // Если формат не распознан, пропускаем эту ячейку
          console.warn('⚠️ Неизвестный формат ключа ячейки:', key);
          return null;
        }
        
        const cellValue = cells[key];
        const content = typeof cellValue === 'string' ? cellValue : (cellValue?.content || '');
        
        return {
          rowId: `row_${rowIdx}`,
          colId: `col_${colIdx}`,
          content: content,
          correctAnswer: typeof cellValue === 'object' && cellValue?.correctAnswer ? cellValue.correctAnswer : undefined,
          hints: typeof cellValue === 'object' && cellValue?.hints ? cellValue.hints : [],
          difficulty: undefined as 'easy' | 'medium' | 'hard' | undefined
        };
      }).filter(cell => cell !== null); // Убираем null значения
    }
    
    // Если cells уже массив, убеждаемся что он в правильном формате
    if (Array.isArray(cells)) {
      cells = cells.map((cell: any) => {
        // Если ячейка уже в правильном формате, возвращаем как есть
        if (cell && typeof cell === 'object' && 'rowId' in cell && 'colId' in cell) {
          return {
            rowId: cell.rowId,
            colId: cell.colId,
            content: cell.content || '',
            correctAnswer: cell.correctAnswer,
            hints: cell.hints || [],
            difficulty: cell.difficulty
          };
        }
        // Если формат не распознан, возвращаем null
        return null;
      }).filter(cell => cell !== null);
    }
    
    const drillGridPayload = {
      rows,
      columns,
      cells,
      settings: drillGridData.data.settings || null,
      purpose: 'info' as const // По умолчанию сохраняем как info (read-only шаблон)
    };

    // Сначала создаем конструктор
    const constructorPayload = {
      title: material.filename || 'Drill-grid',
      type: 'drill_grid' as const,
      courseId: parseInt(this.courseId, 10),
      courseLessonId: (material as any).courseLessonId || null, // Связь с уроком курса
      description: material.description || null,
      userId: currentUser.id // Добавляем userId для бэкенда
    };

    // Создаем конструктор и затем drill-grid
    const token = this.authService.getAccessToken();
    if (!token) {
      console.error('⚠️ Токен доступа отсутствует');
      this.notificationService.error('Erreur d\'authentification');
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    console.log('📤 Отправка запроса на создание конструктора:', {
      url: `${API_ENDPOINTS.CONSTRUCTORS}`,
      payload: constructorPayload,
      userId: currentUser.id,
      hasUserId: !!constructorPayload.userId,
      courseLessonId: constructorPayload.courseLessonId,
      materialCourseLessonId: (material as any).courseLessonId
    });

    this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}`, constructorPayload, { headers }).subscribe({
      next: (constructor: any) => {
        console.log('✅ Конструктор создан:', constructor);
        console.log('📋 Тип ответа:', typeof constructor);
        console.log('📋 Ключи объекта:', constructor ? Object.keys(constructor) : 'null');
        console.log('📋 ID конструктора:', constructor?.id);
        
        // Проверяем наличие ошибки
        if (constructor?.error) {
          console.error('❌ Ошибка при создании конструктора:', constructor.error);
          this.notificationService.error(`Erreur: ${constructor.error}`);
          return;
        }
        
        // Проверяем наличие сообщения об ошибке в ответе
        if (constructor?.message && constructor.message.includes('User ID not found')) {
          console.error('❌ Ошибка: User ID not found in request');
          console.error('📋 Отправленный payload:', constructorPayload);
          this.notificationService.error('Erreur: ID utilisateur manquant dans la requête');
          return;
        }
        
        // Извлекаем ID из ответа (может быть напрямую в объекте или вложен)
        const actualId = constructor?.id || constructor?.data?.id;
        
        if (!actualId) {
          console.error('❌ Конструктор создан, но ID отсутствует:', {
            constructor,
            keys: constructor ? Object.keys(constructor) : [],
            hasError: constructor?.error,
            stringified: JSON.stringify(constructor, null, 2)
          });
          this.notificationService.error('Erreur: ID du constructeur manquant');
          return;
        }
        
        console.log('✅ ID конструктора извлечен:', actualId);
        
        // Теперь создаем drill-grid
        console.log('📤 Отправка запроса на создание drill-grid:', {
          url: `${API_ENDPOINTS.CONSTRUCTORS}/${actualId}/drill-grid`,
          payload: drillGridPayload,
          constructorId: actualId
        });

        this.http.post(`${API_ENDPOINTS.CONSTRUCTORS}/${actualId}/drill-grid`, drillGridPayload, { headers }).subscribe({
          next: (drillGrid: any) => {
            console.log('✅ Drill-grid сохранен в БД:', drillGrid);
            
            // Также создаем JSON файл для отображения в списке материалов урока
            if (!this.courseId) {
              console.error('⚠️ courseId отсутствует при сохранении файла');
              return;
            }

            // Добавляем constructorId в drillGridData для последующей загрузки
            const drillGridDataWithConstructorId = {
              ...drillGridData,
              data: {
                ...drillGridData.data,
                constructorId: actualId // Сохраняем ID конструктора
              }
            };

            const jsonContent = JSON.stringify(drillGridDataWithConstructorId);
            const blob = new Blob([jsonContent], { type: 'application/json' });
            const file = new File([blob], material.filename || 'drill-grid.json', { type: 'application/json' });

            console.log('💾 Сохранение JSON файла drill-grid:', {
              filename: material.filename,
              tag: material.tag,
              courseId: this.courseId,
              fileSize: file.size,
              constructorId: actualId,
              drillGridData: drillGridDataWithConstructorId
            });

            // Сохраняем файл для отображения в списке материалов
            this.fileUploadService.uploadFileAsCourse(file, this.courseId, material.tag || '').subscribe({
              next: (fileResponse) => {
                console.log('✅ JSON файл drill-grid успешно сохранен на сервер:', {
                  fileId: fileResponse.id,
                  url: fileResponse.url,
                  filename: material.filename,
                  tag: material.tag,
                  constructorId: actualId
                });
                
                // Обновляем материал с реальным ID и URL с сервера
                const index = this.materials.findIndex(m => 
                  m.id === material.id || (m.filename === material.filename && m.tag === material.tag)
                );
                
                const updatedMaterial: UploadedFile = {
                  ...material,
                  id: fileResponse.id,
                  url: fileResponse.url,
                  createdAt: fileResponse.createdAt,
                  courseId: this.courseId,
                  drillGridData: drillGridDataWithConstructorId,
                  // Сохраняем ID конструктора и courseLessonId для связи с БД
                  constructorId: actualId,
                  courseLessonId: (material as any).courseLessonId || null
                } as UploadedFile;
                
                if (index !== -1) {
                  console.log(`🔄 Обновление существующего материала с индексом ${index}`);
                  this.materials[index] = updatedMaterial;
                } else {
                  console.log('➕ Добавление нового материала в массив');
                  this.materials.push(updatedMaterial);
                }
                
                console.log(`📦 Всего материалов после сохранения: ${this.materials.length}`);
                console.log(`📦 Материалы с тегом "${material.tag}":`, 
                  this.materials.filter(m => m.tag === material.tag).map(m => ({
                    id: m.id,
                    filename: m.filename,
                    tag: m.tag,
                    hasDrillGridData: !!(m as any).drillGridData
                  }))
                );
                
                // Отправляем событие для обновления материала в модалке урока
                // Это гарантирует, что модалка получит обновленный материал с правильным ID и URL
                window.dispatchEvent(new CustomEvent('materialUpdated', {
                  detail: {
                    oldId: material.id,
                    newMaterial: updatedMaterial
                  }
                }));
                
                this.cdr.detectChanges();
                this.notificationService.success('Drill-grid sauvegardé avec succès');
              },
              error: (fileError) => {
                console.error('❌ Ошибка сохранения файла для отображения:', fileError);
                console.error('❌ Детали ошибки сохранения файла:', {
                  status: fileError.status,
                  statusText: fileError.statusText,
                  message: fileError.message,
                  error: fileError.error,
                  filename: material.filename,
                  tag: material.tag,
                  courseId: this.courseId
                });
                // Drill-grid уже сохранен в БД, но файл для отображения не сохранился
                // Это может привести к тому, что материал не будет отображаться при следующей загрузке
                this.notificationService.error('Erreur lors de la sauvegarde du fichier d\'affichage. Le drill-grid est sauvegardé dans la base de données, mais peut ne pas apparaître lors du rechargement.');
              }
            });
          },
          error: (drillGridError) => {
            console.error('❌ Ошибка сохранения drill-grid в БД:', drillGridError);
            console.error('❌ Детали ошибки:', {
              status: drillGridError.status,
              statusText: drillGridError.statusText,
              message: drillGridError.message,
              error: drillGridError.error,
              url: drillGridError.url
            });
            this.notificationService.error(`Erreur lors de la sauvegarde du drill-grid: ${drillGridError.status || 'Unknown'} - ${drillGridError.message || 'Erreur inconnue'}`);
          }
        });
      },
      error: (constructorError) => {
        console.error('❌ Ошибка создания конструктора:', constructorError);
        console.error('❌ Детали ошибки:', {
          status: constructorError.status,
          statusText: constructorError.statusText,
          message: constructorError.message,
          error: constructorError.error,
          url: constructorError.url
        });
        this.notificationService.error(`Erreur lors de la création du constructeur: ${constructorError.status || 'Unknown'} - ${constructorError.message || 'Erreur inconnue'}`);
      }
    });
  }

  ngOnDestroy(): void {
    // Удаляем слушатели событий при уничтожении компонента
    if (this.materialModalListener) {
      window.removeEventListener('openMaterialModal', this.materialModalListener);
    }
    if (this.materialAddedListener) {
      window.removeEventListener('materialAdded', this.materialAddedListener);
    }
    if (this.lessonMaterialsUpdatedListener) {
      window.removeEventListener('lessonMaterialsUpdated', this.lessonMaterialsUpdatedListener);
    }
  }

  // Получить материалы без раздела
  getMaterialsWithoutSection(): UploadedFile[] {
    // Получаем все имена уроков
    const allLessons: string[] = [];
    Object.values(this.lessons).forEach(lessonArray => {
      lessonArray.forEach(lesson => allLessons.push(lesson.name));
    });
    
    // Получаем все уроки из sous-section
    Object.values(this.lessonsInSubSections).forEach(sectionLessons => {
      Object.values(sectionLessons).forEach(lessonArray => {
        lessonArray.forEach(lesson => allLessons.push(lesson.name));
      });
    });
    
    return this.materials.filter(m => {
      if (!m.tag) return true;
      
      // Проверяем, привязан ли материал к секции
      if (this.sections.includes(m.tag)) {
        return false;
      }
      
      // Проверяем, привязан ли материал к уроку (обычный материал)
      if (allLessons.includes(m.tag)) {
        return false;
      }
      
      // Проверяем, привязан ли материал к уроку как дополнительный материал (_supplementary)
      const isSupplementary = m.tag.includes('_supplementary');
      if (isSupplementary) {
        const lessonName = m.tag.replace('_supplementary', '');
        if (allLessons.includes(lessonName)) {
          return false; // Материал привязан к уроку, не показываем в "Matériaux sans section"
        }
      }
      
      // Если материал не привязан ни к секции, ни к уроку - показываем в "Matériaux sans section"
      return true;
    });
  }

  // Получить описание урока из структуры lessons
  getLessonDescription(section: string, subSection: string | null, lesson: string): string {
    if (subSection) {
      const lessons = this.getLessonsInSubSection(section, subSection);
      const lessonObj = lessons.find(l => l.name === lesson);
      return lessonObj?.description || '';
    } else {
      const lessons = this.getLessonsInSection(section);
      const lessonObj = lessons.find(l => l.name === lesson);
      return lessonObj?.description || '';
    }
  }

  // Получить длительность материалов урока
  getLessonDuration(section: string, subSection: string | null, lesson: string): number {
    // Находим courseLessonId для точной идентификации урока
    let courseLessonId: string | undefined;
    if (subSection) {
      const lessonObj = this.lessonsInSubSections[section]?.[subSection]?.find(l => l.name === lesson);
      courseLessonId = (lessonObj as any)?.courseLessonId;
    } else {
      const lessonObj = this.lessons[section]?.find(l => l.name === lesson);
      courseLessonId = (lessonObj as any)?.courseLessonId;
    }
    
    const materials = this.getMaterialsByLesson(lesson, section, subSection, courseLessonId);
    let totalDuration = 0;
    
    materials.forEach(material => {
      const type = this.getMaterialTypeFromMime(material.mimetype);
      if (type === 'audio' || type === 'video') {
        // Получаем длительность из кэша или вычисляем
        const duration = this.getMaterialDuration(material);
        if (duration > 0) {
          totalDuration += duration;
        }
      }
    });
    
    return totalDuration;
  }

  // Кэш для длительности материалов
  private materialDurations: Map<number, number> = new Map();

  // Получить длительность материала (аудио/видео)
  getMaterialDuration(material: UploadedFile): number {
    if (this.materialDurations.has(material.id)) {
      return this.materialDurations.get(material.id) || 0;
    }
    
    const type = this.getMaterialTypeFromMime(material.mimetype);
    if (type !== 'audio' && type !== 'video') {
      return 0;
    }
    
    // Создаем скрытый элемент для получения метаданных
    const element = type === 'audio' 
      ? document.createElement('audio') 
      : document.createElement('video');
    
    element.preload = 'metadata';
    element.src = this.getFileUrl(material.url);
    
    element.addEventListener('loadedmetadata', () => {
      if (element.duration && isFinite(element.duration)) {
        this.materialDurations.set(material.id, element.duration);
        // Обновляем компонент после загрузки метаданных
        this.cdr.detectChanges();
      }
    });
    
    element.load();
    
    return 0; // Возвращаем 0 до загрузки метаданных
  }

  // Форматировать длительность в читаемый формат
  formatDuration(seconds: number): string {
    if (seconds === 0) return '';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    } else if (minutes > 0) {
      return `${minutes}min ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Получить метку типа материала
  getMaterialTypeLabel(mimetype: string): string {
    const type = this.getMaterialTypeFromMime(mimetype);
    const labels: { [key: string]: string } = {
      'audio': 'audio',
      'video': 'video',
      'image': 'image',
      'pdf': 'PDF',
      'text': 'texte',
      'file': 'fichier'
    };
    return labels[type] || 'fichier';
  }

  // Проверить, является ли материал конструктором
  isConstructorMaterial(material: UploadedFile): boolean {
    return !!(material as any).constructorId || !!(material as any).drillGridData;
  }

  // Получить тип конструктора
  getConstructorType(material: UploadedFile): string | null {
    if (!this.isConstructorMaterial(material)) {
      return null;
    }

    const drillGridData = (material as any).drillGridData;
    if (drillGridData) {
      if (drillGridData.type === 'drill_grid') {
        return 'drill-grid';
      }
      if (drillGridData.type === 'mindmap') {
        return 'mindmap';
      }
      if (drillGridData.type === 'pattern_card') {
        return 'pattern-card';
      }
      if (drillGridData.type === 'flowchart') {
        return 'flowchart';
      }
    }

    // Если есть constructorId, но нет drillGridData, пытаемся определить по mimetype
    if (material.mimetype === 'application/json') {
      return 'drill-grid'; // По умолчанию для JSON файлов
    }

    return 'constructeur';
  }

  // Получить обычные материалы (не конструкторы)
  getRegularMaterials(materials: UploadedFile[]): UploadedFile[] {
    return materials.filter(m => !this.isConstructorMaterial(m));
  }

  // Получить материалы конструкторов
  getConstructorMaterials(materials: UploadedFile[]): UploadedFile[] {
    return materials.filter(m => this.isConstructorMaterial(m));
  }

  // Получить метку типа конструктора для отображения
  getConstructorTypeLabel(material: UploadedFile): string {
    const type = this.getConstructorType(material);
    const labels: { [key: string]: string } = {
      'drill-grid': 'Drill-grid',
      'mindmap': 'Mindmap',
      'pattern-card': 'Carte de pattern',
      'flowchart': 'Organigramme',
      'constructeur': 'Constructeur'
    };
    return labels[type || 'constructeur'] || 'Constructeur';
  }

  // Открыть предпросмотр материала
  openMaterialPreview(material: UploadedFile, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const dialogRef = this.dialog.open(MaterialPreviewModalComponent, {
      width: '90vw',
      maxWidth: '1200px',
      maxHeight: '90vh',
      data: {
        material: material
      } as MaterialPreviewModalData,
      panelClass: 'material-preview-modal-dialog'
    });
  }
}

