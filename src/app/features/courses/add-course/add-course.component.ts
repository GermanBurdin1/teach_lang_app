import { Component, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { FileUploadService, UploadedFile } from '../../../services/file-upload.service';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../services/notification.service';
import { Router } from '@angular/router';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { CourseService } from '../../../services/course.service';
import { MaterialService, Material } from '../../../services/material.service';
import { HttpClient } from '@angular/common/http';
import { RoleService } from '../../../services/role.service';

@Component({
  selector: 'app-add-course',
  templateUrl: './add-course.component.html',
  styleUrls: ['./add-course.component.css']
})
export class AddCourseComponent implements OnInit {
  // Course form data
  courseTitle = '';
  courseDescription = '';
  courseLevel = '';
  isPublished = false;
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
  isUploadModalOpen = false;
  showAddSectionDropdown = false;
  showAddSubSectionInput: { [key: string]: boolean } = {}; // Показывать ли input для добавления подсекции
  newSubSectionName: { [key: string]: string } = {}; // Имя новой подсекции для каждой секции

  // Current user
  currentUser: any = null;
  courseId: string | null = null; // Will be set after course creation
  showCreateCourseForm = false; // Показывать ли форму создания курса
  hasUnsavedChanges = false; // Есть ли несохраненные изменения
  isCourseCardExpanded = false; // Развернута ли карточка курса (по умолчанию скрыта)
  isMaterialsSectionExpanded = false; // Развернута ли секция материалов (по умолчанию скрыта)

  constructor(
    private fileUploadService: FileUploadService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private courseService: CourseService,
    private materialService: MaterialService,
    private roleService: RoleService,
    private router: Router,
    private title: Title,
    private meta: Meta,
    private http: HttpClient
  ) { }

  ngOnInit(): void {
    this.updateSEOTags();
    this.currentUser = this.authService.getCurrentUser();
    
    // Загружаем сохраненный курс из localStorage
    this.loadSavedCourse();
    
    this.loadSections();
    this.loadTrainerMaterials();
  }

  loadSavedCourse(): void {
    const savedCourseId = localStorage.getItem('currentCourseId');
    if (savedCourseId) {
      this.courseId = savedCourseId;
      // Загружаем данные курса
      this.courseService.getCourseById(parseInt(savedCourseId, 10)).subscribe({
        next: (course) => {
          this.courseTitle = course.title;
          this.courseDescription = course.description || '';
          this.courseLevel = course.level || '';
          this.isPublished = course.isPublished;
          this.coverImage = course.coverImage;
          this.sections = course.sections || [];
          this.hasUnsavedChanges = false;
          this.loadFiles();
        },
        error: (error) => {
          console.error('❌ Error loading saved course:', error);
          // Если курс не найден, очищаем сохраненный ID
          localStorage.removeItem('currentCourseId');
          this.courseId = null;
        }
      });
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
      isPublished: this.isPublished
    };

    this.courseService.createCourse(courseData).subscribe({
      next: (course) => {
        this.courseId = course.id.toString();
        // Сохраняем courseId в localStorage
        localStorage.setItem('currentCourseId', this.courseId);
        this.showCreateCourseForm = false;
        this.hasUnsavedChanges = false;
        // Автоматически разворачиваем карточку курса и секцию материалов после создания
        this.isCourseCardExpanded = true;
        this.isMaterialsSectionExpanded = true;
        this.notificationService.success('Cours créé avec succès!');
        // After course creation, enable file uploads
        this.loadFiles();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du cours:', error);
        this.notificationService.error('Erreur lors de la création du cours');
      }
    });
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
      isPublished: this.isPublished
    };

    this.courseService.updateCourse(parseInt(this.courseId, 10), courseData).subscribe({
      next: (course) => {
        this.notificationService.success('Cours mis à jour avec succès!');
        // Обновляем данные курса
        this.coverImage = course.coverImage;
        this.sections = course.sections || [];
        this.hasUnsavedChanges = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour du cours:', error);
        this.notificationService.error('Erreur lors de la mise à jour du cours');
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

    if (!this.selectedSection) {
      this.notificationService.error('Veuillez sélectionner une section');
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

      // Формируем tag: если есть подсекция, используем её, иначе используем секцию
      const tag = this.selectedSubSection || this.selectedSection || undefined;
      
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

      this.clearMaterialForm();
      this.notificationService.success('Matériel créé avec succès!');
      // Перезагружаем файлы чтобы обновить список
      this.loadFiles();
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
  }

  // ==================== SECTIONS MANAGEMENT ====================

  toggleDropdown(): void {
    // Toggle dropdown for sections
  }

  addSection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const sectionName = target.value;

    if (sectionName && !this.sections.includes(sectionName)) {
      this.sections.push(sectionName);
      this.subSections[sectionName] = [];
      this.saveSections();
    }
  }

  removeSection(sectionName: string): void {
    this.sections = this.sections.filter(sec => sec !== sectionName);
    delete this.subSections[sectionName];
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
      
      // Сохраняем в БД через API
      this.courseService.updateCourse(parseInt(this.courseId, 10), {
        sections: this.sections.length > 0 ? this.sections : null
      }).subscribe({
        next: () => {
          console.log('✅ Sections saved to database');
        },
        error: (error) => {
          console.error('❌ Error saving sections:', error);
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

      if (savedSections && this.sections.length === 0) {
        this.sections = JSON.parse(savedSections);
      }
      if (savedSubSections) {
        this.subSections = JSON.parse(savedSubSections);
      }
    }
  }

  openAddMaterialForSection(section: string): void {
    // Устанавливаем выбранную секцию и открываем модалку
    this.selectedSection = section;
    this.selectedSubSection = null;
    this.showCreateMaterialForm = true;
  }

  openAddMaterialForSubSection(section: string, subSection: string): void {
    // Устанавливаем выбранную секцию и подсекцию, открываем модалку
    this.selectedSection = section;
    this.selectedSubSection = subSection;
    this.showCreateMaterialForm = true;
  }

  openUploadModal(type: string, section: string, subSection?: string): void {
    this.newMaterial.type = type as 'text' | 'audio' | 'video' | 'pdf' | 'image';
    this.selectedSection = section;
    this.selectedSubSection = subSection || null;
    this.isUploadModalOpen = true;
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

  loadFiles(): void {
    if (!this.courseId) {
      console.log('⚠️ loadFiles: courseId отсутствует');
      return;
    }

    console.log('📥 Загрузка файлов для курса:', this.courseId);
    const currentMaterialsCount = this.materials.length;
    this.fileUploadService.getFiles(this.courseId).subscribe({
      next: (files) => {
        console.log('✅ Полученные файлы курса:', files);
        console.log(`   Найдено файлов: ${files.length}`);
        console.log(`   Текущее количество материалов в массиве до обновления: ${currentMaterialsCount}`);
        
        // Если сервер вернул файлы, обновляем массив
        if (files.length > 0) {
          this.materials = files;
          console.log('✅ Материалы обновлены в UI из сервера');
        } else if (currentMaterialsCount > 0) {
          // Если сервер вернул пустой массив, но у нас есть локальные материалы,
          // не перезаписываем массив - возможно, это проблема синхронизации
          console.log('⚠️ Сервер вернул пустой массив, но есть локальные материалы. Сохраняем локальные данные.');
          console.log('   Локальные материалы:', this.materials.map(m => ({ id: m.id, filename: m.filename })));
        } else {
          // Если и сервер пустой, и локально пусто - это нормально
          this.materials = [];
          console.log('⚠️ Список файлов пуст. Возможно, файлы еще не синхронизированы с БД.');
        }
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

    if (!this.selectedSection) {
      this.notificationService.error('Veuillez sélectionner une section');
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
        
        const tag = this.selectedSubSection || this.selectedSection || undefined;
        this.fileUploadService.uploadFileAsCourse(textFile, courseId, tag).subscribe({
          next: (response) => {
            const uploadedFile: UploadedFile = {
              id: response.id,
              filename: material.title,
              url: response.url,
              mimetype: material.type,
                    tag: this.selectedSubSection || this.selectedSection || undefined, // Сохраняем раздел или подраздел в поле tag
              description: material.description || undefined,
              courseId: courseId,
              createdAt: response.createdAt,
            };

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
        
        const tag = this.selectedSubSection || this.selectedSection || undefined;
        this.fileUploadService.linkFileToCourse(fileUrl, courseIdNum, tag).subscribe({
          next: (response) => {
            console.log('✅ Материал связан с курсом:', response);
            this.notificationService.success(`Matériau "${material.title}" ajouté au cours avec succès!`);
            this.showExistingMaterials = false;
            
            // Добавляем файл в локальный массив сразу для мгновенного обновления UI
            const uploadedFile: UploadedFile = {
              id: response.id,
              filename: material.title,
              url: response.url,
              mimetype: this.getMimeTypeFromExtension(this.getFileExtensionFromUrl(material.content)),
              courseId: courseId,
              createdAt: response.createdAt.toString(),
                    tag: this.selectedSubSection || this.selectedSection || undefined, // Сохраняем раздел или подраздел в поле tag
              description: material.description || undefined,
            };
            
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
        
        const tag = this.selectedSubSection || this.selectedSection || undefined;
        this.fileUploadService.uploadFileAsCourse(file, courseId, tag).subscribe({
          next: (response) => {
            console.log('✅ Материал добавлен в курс:', response);
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce matériau du cours ? Le fichier restera disponible dans Entraînement.')) {
      return;
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

  // Получить материалы без раздела
  getMaterialsWithoutSection(): UploadedFile[] {
    return this.materials.filter(m => !m.tag || !this.sections.includes(m.tag || ''));
  }
}

