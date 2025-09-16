import { Component, OnInit } from '@angular/core';
import { MaterialService, Material } from '../../services/material.service';
import { HomeworkService, Homework as _Homework, CreateHomeworkRequest as _CreateHomeworkRequest } from '../../services/homework.service';
import { LessonService } from '../../services/lesson.service';
import { AuthService } from '../../services/auth.service';
import { FileUploadService } from '../../services/file-upload.service';
import { NotificationService } from '../../services/notification.service';
import { ActivatedRoute, Router } from '@angular/router';
import { API_ENDPOINTS } from '../../core/constants/api.constants';

interface User {
  id: string;
  name: string;
  role: string;
  [key: string]: unknown;
}

interface Lesson {
  id: string;
  title: string;
  date?: string;
  [key: string]: unknown;
}

interface HomeworkDisplay {
  id: string;
  sourceType: string;
  title: string;
  description: string;
  dueDate: Date;
  status: string;
  itemId: string;
  createdAt: Date;
  lessonId: string;
  createdInClass: boolean;
  sourceItemText?: string;
  grade?: number;
  teacherFeedback?: string;
  studentResponse?: string;
  assignedByName: string;
  assignedBy: string;
  assignedTo: string;
  assignedToName: string;
  assignedAt: Date;
  materialIds: string[];
}

@Component({
  selector: 'app-trainer',
  templateUrl: './trainer.component.html',
  styleUrls: ['./trainer.component.css']
})
export class TrainerComponent implements OnInit {
  // ==================== MATERIALS PROPERTIES ====================
  
  activeTab = 'materials';
  activeHomeworkTab = 'pending'; // For students: 'pending', 'completed', 'overdue'
  activeTeacherHomeworkTab = 'toReview'; // For teachers: 'toReview', 'reviewed'
  activeMaterialTab = 'own'; // 'own' for mes propres matériaux, 'teachers' for matériaux des professeurs
  
  // ==================== MATERIAL DATA ====================
  materials: Material[] = [];
  ownMaterials: Material[] = [];
  teacherMaterials: Material[] = [];
  showCreateMaterialForm = false;
  
  newMaterial = {
    title: '',
    type: 'text' as 'text' | 'audio' | 'video' | 'pdf' | 'image',
    content: '',
    description: '',
    tags: [] as string[]
  };
  
  // File upload for materials
  selectedFile: File | null = null;
  uploadingFile = false;
  uploadProgress = 0;
  isDragOver = false;
  filePreview: string | null = null;
  maxFileSize = 50 * 1024 * 1024; // 50MB
  
  // Homework management
  homeworks: HomeworkDisplay[] = [];
  showCreateHomeworkForm = false;
  newHomework = {
    title: '',
    description: '',
    dueDate: new Date(),
    materialIds: [] as string[],
    lessonId: ''
  };

  // Homework filtering by status
  pendingHomeworks: HomeworkDisplay[] = [];
  completedHomeworks: HomeworkDisplay[] = [];
  overdueHomeworks: HomeworkDisplay[] = [];
  
  // Teacher homework arrays
  homeworksToReview: HomeworkDisplay[] = []; // Для проверки (с ответами студентов)
  reviewedHomeworks: HomeworkDisplay[] = []; // Уже проверенные
  // Homework completion modal
  showHomeworkModal = false;
  selectedHomework: HomeworkDisplay | null = null;
  homeworkResponse = '';
  isSubmittingHomework = false;

  // Grading modal for teachers
  showGradingModal = false;
  selectedHomeworkForGrading: HomeworkDisplay | null = null;
  gradingData = {
    grade: null as number | null,
    teacherFeedback: '',
    maxGrade: 20
  };
  isSubmittingGrade = false;

  // Homework expansion for reviewed section
  selectedExpandedHomework: string | null = null;
  
  // Lesson selection for material attachment
  showAttachModal = false;
  selectedMaterial: Material | null = null;
  availableLessons: Lesson[] = [];
  
  // Current user
  currentUser: User | null = null;

  // Loading states
  loadingHomeworks = false;

  // User type detection
  isTeacher(): boolean {
    return this.currentUser?.role === 'teacher' || 
           this.currentUser?.['type'] === 'teacher' ||
           this.currentUser?.['currentRole'] === 'teacher';
  }

  isStudent(): boolean {
    return this.currentUser?.role === 'student' || 
           this.currentUser?.['type'] === 'student' ||
           this.currentUser?.['currentRole'] === 'student';
  }

  shouldShowMaterialTabs(): boolean {
    // Показываем подвкладки только студентам
    return this.isStudent();
  }

  // Training properties
  activeTrainingTab = 'audio';
  audioTask = 'dictation';
  currentAudio = 'assets/audio/sample.mp3';
  maskedText = "Le ___ est magnifique aujourd'hui.";
  correctDictation = "soleil";
  userDictation = "";
  resultDictation = "";
  choiceOptions = ['Le soleil', 'La lune', 'Les étoiles'];
  correctChoice = 'Le soleil';
  resultChoice = '';
  events = ['Il achète un billet.', 'Il monte dans le train.', 'Il trouve une place.'];
  shuffledEvents = [...this.events].sort(() => Math.random() - 0.5);
  resultSequence = '';
  paraphraseInput = '';
  resultParaphrase = '';
  correctIntonation = 'joy';
  resultIntonation = '';
  
  // Reading
  readingTask = 'matchTitle';
  readingText = 'La pollution est un problème majeur dans le monde moderne...';
  readingOptions = ['L\'environnement', 'Les technologies', 'Le sport'];
  correctReading = 'L\'environnement';
  readingResult: string | undefined;
  analysisText = 'Le réchauffement climatique cause de nombreux changements dans notre environnement...';
  analysisOptions = ['Les conséquences du climat', 'Les progrès scientifiques', 'Les droits humains'];
  correctAnalysis = 'Les conséquences du climat';
  analysisResult: string | undefined;
  paraphraseText = 'Les nouvelles technologies ont transformé notre manière de communiquer.';
  correctParaphraseReading = 'La communication a changé grâce aux avancées technologiques.';
  paraphraseReadingInput = '';
  readingParaphraseResult: string | undefined;
  argumentationText = 'Certains pensent que les voitures électriques sont la meilleure solution pour réduire la pollution.';
  argumentationOptions = ['Opinion personnelle', 'Thèse avec argument', 'Faits historiques'];
  correctArgumentation = 'Thèse avec argument';
  argumentationResult: string | undefined;
  
  // Writing
  writingTask = 'plan';
  essayPlan = '';
  essayFeedback = '';
  essayText = '';
  styleFeedback: string | undefined;
  expressionSentence = '_____ est important de protéger la nature.';
  expressionOptions = ['Il me semble que', 'Il est clair que', 'Il'];
  correctExpression = 'Il est clair que';
  expressionFeedback: string | undefined;
  topics = ['L\'importance de l\'éducation', 'Les nouvelles technologies', 'Le changement climatique'];
  generatedTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
  generatedEssayPlan = '';
  generatedPlanFeedback: string | undefined;
  incorrectSentence = 'Il faut faire attention a les règles grammaticaux.';
  correctSentence = 'Il faut faire attention aux règles grammaticales.';
  correctedSentence = '';
  correctionFeedback: string | undefined;
  
  // Speaking
  speakingTask = 'argumentation';
  speakingQuestion = 'Pourquoi faut-il protéger l\'environnement?';
  recording = false;
  recordingMessage = '';
  improvTopics = ['Faut-il interdire les voitures en centre-ville?', 'Le télétravail est-il une bonne solution?', 'Quelle est l\'importance des langues étrangères?'];
  improvTopic = this.improvTopics[Math.floor(Math.random() * this.improvTopics.length)];
  improvTimer = false;
  improvTimerMessage = '';
  translationSentence = 'The world is changing rapidly due to technological advances.';
  correctTranslation = 'Le monde change rapidement grâce aux avancées technologiques.';
  userTranslation = '';
  translationFeedback: string | undefined;
  dialoguePrompt = 'Comment répondre poliment à un client mécontent?';
  dialogueOptions = ['Désolé pour le désagrément, comment puis-je vous aider?', 'Ce n\'est pas mon problème.', 'Je ne peux rien faire.'];
  correctDialogue = 'Désolé pour le désagrément, comment puis-je vous aider?';
  dialogueFeedback: string | undefined;
  intonationSentence = 'Je suis tellement content de cette nouvelle!';
  intonationFeedback: string | undefined;
  
  // Grammar
  grammarTask = 'connectors';
  sentenceWithBlank = 'Il pleuvait, _____ nous avons annulé le voyage.';
  connectorOptions = ['ainsi', 'néanmoins', 'toutefois'];
  correctConnector = 'ainsi';
  connectorResult: string | undefined;
  correctSentenceOrder = ['Je', 'vais', 'au', 'cinéma', 'ce', 'soir.'];
  shuffledSentenceWords = [...this.correctSentenceOrder].sort(() => Math.random() - 0.5);
  sentenceOrderResult: string | undefined;
  verbQuestion = 'Hier, il _____ (aller) au musée.';
  verbOptions = ['va', 'allait', 'ira'];
  correctVerb = 'allait';
  verbResult: string | undefined;
  contextSentence = 'Il a trouvé une solution très _____ à ce problème.';
  contextOptions = ['efficace', 'inutile', 'compliqué'];
  correctContext = 'efficace';
  contextResult: string | undefined;
  synonymQuestion = 'Quel est le synonyme de "rapide" ?';
  synonymOptions = ['lent', 'vite', 'facile'];
  correctSynonym = 'vite';
  synonymResult: string | undefined;
  
  // Exam
  examStarted = false;
  examStep = 'listening';
  examScore = 0;
  examFeedback: string | undefined;
  examAudio = 'assets/audio/exam_sample.mp3';
  listeningOptions = ['Il fait beau', 'Il pleut', 'Il neige'];
  correctListening = 'Il pleut';
  listeningResult: string | undefined;
  examReadingText = 'Le changement climatique est un problème mondial...';
  examWritingTopic = 'Quel est l\'impact des réseaux sociaux sur la société?';
  examWritingAnswer = '';
  writingResult: string | undefined;
  examSpeakingQuestion = 'Quels sont les avantages et les inconvénients du télétravail?';
  speakingRecording = false;
  speakingRecordingMessage = '';

  constructor(
    private materialService: MaterialService,
    private homeworkService: HomeworkService,
    private lessonService: LessonService,
    private authService: AuthService,
    private fileUploadService: FileUploadService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Загружаем данные пользователя
    this.currentUser = this.authService.getCurrentUser() as unknown as User;
    if (this.currentUser) {
      console.log('👤 Current user loaded:', this.currentUser);
      this.loadMaterials();
      this.loadHomeworks();
      this.loadAvailableLessons();
      
      console.log('🎯 TrainerComponent initialized for role:', this.isTeacher() ? 'teacher' : 'student');
    }

    // Обработка параметров URL
    this.route.queryParams.subscribe(params => {
      console.log('🔄 Query params received:', params);
      if (params['tab']) {
        this.activeTab = params['tab'];
        console.log('📌 Set activeTab to:', this.activeTab);
      }
      if (params['homeworkId']) {
        // Если передан ID домашнего задания, переходим на вкладку домашних заданий
        this.activeTab = 'homework';
        console.log('📌 Set activeTab to homework, homeworkId:', params['homeworkId']);
        setTimeout(() => {
          this.highlightHomework(params['homeworkId']);
        }, 1000); // Увеличиваем задержку чтобы данные успели загрузиться
      }
    });
  }

  // ==================== MATERIALS SECTION ====================
  
  loadMaterials() {
    if (this.currentUser?.id) {
      console.log('🔍 Loading materials for user:', this.currentUser.id);
      console.log('🔍 isTeacher:', this.isTeacher(), 'isStudent:', this.isStudent());
      
      if (this.isTeacher()) {
        console.log('🔍 Loading as teacher...');
        // Преподаватели загружают только свои материалы
        this.materialService.getMaterialsForTeacher(this.currentUser.id).subscribe({
          next: (teacherMaterials) => {
            console.log('✅ Teacher materials loaded:', teacherMaterials);
            this.ownMaterials = teacherMaterials;
            this.materials = this.ownMaterials;
          },
          error: (error) => {
            console.error('❌ Error loading teacher materials:', error);
            console.error('❌ File-service может быть не запущен. Убедитесь что file-service работает на порту 3008');
            this.notificationService.error('Erreur de chargement des matériaux. Vérifiez que le service de fichiers est démarré.');
            this.ownMaterials = [];
            this.materials = [];
          }
        });
      } else if (this.isStudent()) {
        console.log('🔍 Loading as student...');
        // Студенты загружают как свои материалы, так и материалы от преподавателей
        // Собственные материалы студента
        this.materialService.getMaterialsForTeacher(this.currentUser.id).subscribe({
          next: (teacherMaterials) => {
            console.log('✅ Student own materials loaded:', teacherMaterials);
            this.ownMaterials = teacherMaterials;
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          },
          error: (error) => {
            console.error('❌ Error loading student own materials:', error);
            this.ownMaterials = [];
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          }
        });

        // Материалы от преподавателей (прикрепленные к урокам)
        this.materialService.getMaterialsForStudent(this.currentUser.id).subscribe({
          next: (studentMaterials) => {
            console.log('✅ Student teacher materials loaded:', studentMaterials);
            this.teacherMaterials = studentMaterials.filter(m => m.createdBy !== this.currentUser?.id);
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          },
          error: (error) => {
            console.error('❌ Error loading student teacher materials:', error);
            this.teacherMaterials = [];
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          }
        });
      } else {
        console.log('🔍 Role not detected, loading default (student mode)...');
        // Fallback: загружаем как для студента
        this.materialService.getMaterialsForTeacher(this.currentUser.id).subscribe({
          next: (teacherMaterials) => {
            console.log('✅ Fallback own materials loaded:', teacherMaterials);
            this.ownMaterials = teacherMaterials;
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          },
          error: (error) => {
            console.error('❌ Error loading fallback own materials:', error);
            this.ownMaterials = [];
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          }
        });

        this.materialService.getMaterialsForStudent(this.currentUser.id).subscribe({
          next: (studentMaterials) => {
            console.log('✅ Fallback teacher materials loaded:', studentMaterials);
            this.teacherMaterials = studentMaterials.filter(m => m.createdBy !== this.currentUser?.id);
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          },
          error: (error) => {
            console.error('❌ Error loading fallback teacher materials:', error);
            this.teacherMaterials = [];
            this.materials = [...this.ownMaterials, ...this.teacherMaterials];
          }
        });
      }
    }
  }

  loadHomeworks() {
    console.log('🔍 Chargement des devoirs', this.currentUser?.id);
    if (!this.currentUser?.id) {
      console.error('❌ User not authenticated');
      return;
    }

    this.loadingHomeworks = true;

    console.log('👤 Current user:', {
      id: this.currentUser.id,
      role: this.currentUser.role,
      isTeacher: this.isTeacher()
    });

    const loadMethod = this.isTeacher() 
      ? this.homeworkService.getHomeworkForTeacher(this.currentUser.id)
      : this.homeworkService.getHomeworkForStudent(this.currentUser.id);

    console.log('🔄 Starting homework load for', this.isTeacher() ? 'teacher' : 'student');

    loadMethod.subscribe({
      next: (homeworks) => {
        console.log('✅ Homeworks loaded successfully:', {
          count: homeworks.length,
          homeworks: homeworks
        });

        console.log('🔍 Raw homework data from API:', homeworks.map(hw => ({
          id: hw.id,
          title: hw.title,
          studentResponse: hw.studentResponse,
          studentResponseType: typeof hw.studentResponse,
          studentResponseLength: hw.studentResponse?.length,
          hasStudentResponse: hw.studentResponse != null,
          status: hw.status,
          rawData: hw
        })));

        console.log('🔍 Specific check for d097ef72-7d65-409a-946a-264a620d5b1f:', 
          homeworks.find(hw => hw.id === 'd097ef72-7d65-409a-946a-264a620d5b1f'));

        // Преобразуем Homework[] в HomeworkDisplay[]
        this.homeworks = homeworks.map(hw => ({
          id: hw.id,
          sourceType: hw.sourceType || '',
          title: hw.title,
          description: hw.description,
          dueDate: new Date(hw.dueDate), // Принудительно преобразуем в Date
          status: hw.status,
          itemId: hw.sourceItemId || '',
          createdAt: new Date(hw.assignedAt),
          lessonId: hw.lessonId || '',
          createdInClass: hw.createdInClass || false,
          sourceItemText: hw.sourceItemText,
          grade: hw.grade,
          teacherFeedback: hw.teacherFeedback,
          studentResponse: hw.studentResponse,
          assignedByName: hw.assignedByName || 'Enseignant inconnu',
          assignedBy: hw.assignedBy,
          assignedTo: hw.assignedTo,
          assignedToName: hw.assignedToName || 'Nom manquant',
          assignedAt: new Date(hw.assignedAt),
          materialIds: hw.materialIds || []
        } as HomeworkDisplay));

        console.log('📋 After mapping to HomeworkDisplay:');
        this.homeworks.forEach(hw => {
          console.log(`Homework ${hw.id}:`, {
            title: hw.title,
            studentResponse: hw.studentResponse,
            hasStudentResponse: hw.studentResponse != null,
            status: hw.status
          });
        });

        this.filterHomeworksByStatus();
        this.loadingHomeworks = false;
      },
      error: (error) => {
        console.error('❌ Error loading homeworks:', {
          error,
          userId: this.currentUser?.id,
          role: this.currentUser?.role,
          isTeacher: this.isTeacher(),
          status: error.status,
          url: error.url
        });
        this.notificationService.error('Erreur lors du chargement des devoirs');
        this.homeworks = []; // Set empty array on error
        this.loadingHomeworks = false;
      }
    });
  }

  loadAvailableLessons() {
    if (this.currentUser?.id) {
      console.log('🔍 Chargement des cours disponibles...');
      
      // Загружаем уроки для студента или преподавателя
      if (this.isStudent()) {
        // Для студента: загружаем подтвержденные уроки
        this.lessonService.getConfirmedLessons(this.currentUser.id).subscribe({
          next: (lessons: unknown[]) => {
            // Фильтруем только будущие уроки для прикрепления материалов
            this.availableLessons = lessons.filter((lesson: unknown) => {
              const lessonData = lesson as {status?: string, scheduledAt?: string};
              return lessonData.status === 'confirmed' && 
                     lessonData.scheduledAt && 
                     new Date(lessonData.scheduledAt) >= new Date();
            }) as Lesson[];
            console.log('✅ Уроки студента загружены:', this.availableLessons);
          },
          error: (error: unknown) => {
            console.error('❌ Ошибка загрузки уроков студента:', error);
            this.availableLessons = [];
          }
        });
      } else if (this.isTeacher()) {
        // Для преподавателя: загружаем все подтвержденные уроки
        this.lessonService.getAllConfirmedLessonsForTeacher(this.currentUser.id).subscribe({
          next: (lessons: unknown[]) => {
            // Фильтруем только будущие уроки для прикрепления материалов
            this.availableLessons = lessons.filter((lesson: unknown) => {
              const lessonData = lesson as {status?: string, scheduledAt?: string};
              return lessonData.status === 'confirmed' && 
                     lessonData.scheduledAt && 
                     new Date(lessonData.scheduledAt) >= new Date();
            }) as Lesson[];
            console.log('✅ Уроки преподавателя загружены:', this.availableLessons);
          },
          error: (error: unknown) => {
            console.error('❌ Ошибка загрузки уроков преподавателя:', error);
            this.availableLessons = [];
          }
        });
      }
    }
  }

  // ==================== FILE UPLOAD METHODS ====================
  
  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      this.handleFileSelection(file);
    }
  }

  // ==================== DRAG & DROP METHODS ====================
  
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFileSelection(files[0]);
    }
  }

  handleFileSelection(file: File) {
    // Validate file type
    if (!this.isValidFileType(file)) {
      this.notificationService.error(`Type de fichier non supporté: ${file.type}. Types autorisés: ${this.getAcceptedFileTypes()}`);
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

  generateFilePreview(file: File) {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.filePreview = 'file-info'; // Indicator for non-image files
    }
  }

  removeSelectedFile() {
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

  isFileTooLarge(): boolean {
    return this.selectedFile ? this.selectedFile.size > this.maxFileSize : false;
  }

  uploadFile(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.selectedFile) {
        reject('Aucun fichier sélectionné');
        return;
      }

      this.uploadingFile = true;
      this.uploadProgress = 0;

      // Определяем courseId - используем числовой ID или ID по умолчанию
      let courseId: string;
      if (this.currentUser?.['courseId'] && !isNaN(Number(this.currentUser['courseId']))) {
        // Если есть числовой courseId в профиле пользователя
        courseId = this.currentUser['courseId'].toString();
      } else if (this.currentUser?.id && !isNaN(Number(this.currentUser.id))) {
        // Используем ID пользователя как courseId
        courseId = this.currentUser.id.toString();
      } else {
        // ID по умолчанию для общих материалов
        courseId = '1';
      }

      console.log('📤 Загрузка файла с courseId:', courseId);

      this.fileUploadService.uploadFile(this.selectedFile, courseId).subscribe({
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

  async createMaterial() {
    if (!this.newMaterial.title.trim()) {
      this.notificationService.error('Veuillez saisir un titre pour le matériel');
      return;
    }

    try {
      let contentUrl = this.newMaterial.content;

      if (this.needsFileUpload()) {
        if (!this.selectedFile) {
          this.notificationService.error('Veuillez sélectionner un fichier pour ce type de matériel');
          return;
        }

        // Final validation before upload
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

      const materialData = {
        ...this.newMaterial,
        content: contentUrl,
        createdBy: this.currentUser?.id || '',
        createdByName: `${this.currentUser?.name || ''} ${this.currentUser?.['surname'] || ''}`.trim(),
        tags: this.newMaterial.tags.filter(tag => tag.trim() !== '')
      };

      this.materialService.createMaterial(materialData).subscribe({
        next: (material) => {
          this.materials.push(material);
          this.clearMaterialForm();
          console.log('✅ Matériel créé avec succès');
          this.notificationService.success('Matériel créé avec succès!');
        },
        error: (error) => {
          console.error('❌ Erreur lors de la création du matériel:', error);
          this.notificationService.error('Erreur lors de la création du matériel');
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la création du matériel:', error);
      this.notificationService.error('Erreur lors de la création du matériel');
    }
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

  clearMaterialForm() {
    this.newMaterial = {
      title: '',
      type: 'text',
      content: '',
      description: '',
      tags: []
    };
    this.selectedFile = null;
    this.uploadingFile = false;
    this.uploadProgress = 0;
    this.isDragOver = false;
    this.filePreview = null;
    this.showCreateMaterialForm = false;
  }

  // ==================== HOMEWORK SECTION ====================

  openCreateHomeworkForm() {
    this.showCreateHomeworkForm = true;
    this.loadAvailableLessons();
    
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.newHomework.dueDate = tomorrow;
  }

  createHomework() {
    console.log('🔍 Création de devoir - DÉBUT');
    
    console.log('📝 Données actuelles:', {
      title: this.newHomework.title,
      description: this.newHomework.description,
      lessonId: this.newHomework.lessonId,
      dueDate: this.newHomework.dueDate
    });

    if (!this.newHomework.title.trim() || !this.newHomework.description.trim()) {
      console.log('❌ Titre ou description vide');
      return;
    }
    console.log('✅ Titre et description OK');

    if (!this.newHomework.lessonId) {
      console.log('❌ Aucun cours sélectionné');
      this.notificationService.error('Veuillez sélectionner un cours');
      return;
    }
    console.log('✅ Cours sélectionné:', this.newHomework.lessonId);

    if (!this.currentUser?.id) {
      console.log('❌ Utilisateur non authentifié');
      this.notificationService.error('Utilisateur non authentifié');
      return;
    }
    console.log('✅ Utilisateur authentifié:', this.currentUser.id);

    console.log('🔍 Recherche du cours dans availableLessons:', {
      lessonId: this.newHomework.lessonId,
      availableLessons: this.availableLessons
    });

    // Obtenir l'étudiant du cours sélectionné
    const selectedLesson = this.availableLessons.find(lesson => lesson.id === this.newHomework.lessonId);
    if (!selectedLesson) {
      console.log('❌ Cours sélectionné non trouvé dans availableLessons');
      this.notificationService.error('Cours sélectionné non trouvé');
      return;
    }
    console.log('✅ Cours trouvé:', selectedLesson);

    const homeworkData = {
      title: this.newHomework.title,
      description: this.newHomework.description,
      dueDate: this.newHomework.dueDate,
      assignedBy: this.currentUser.id,
      assignedTo: this.isTeacher() ? (selectedLesson as {studentId?: string})['studentId'] || '' : (selectedLesson as {teacherId?: string})['teacherId'] || '',
      lessonId: this.newHomework.lessonId,
      materialIds: this.newHomework.materialIds
    };

    console.log('📚 Préparation des données du devoir:', homeworkData);
    console.log('🚀 Appel du service createHomeworkFromTraining...');

    this.homeworkService.createHomeworkFromTraining(homeworkData).subscribe({
      next: (homework) => {
        console.log('✅ Devoir créé avec succès:', homework);
        this.notificationService.success('Devoir créé avec succès');
        this.clearHomeworkForm();
        this.loadHomeworks(); // Recharger la liste
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du devoir:', error);
        this.notificationService.error('Erreur lors de la création du devoir');
      }
    });
    
    console.log('🔍 Création de devoir - FIN (méthode appelée)');
  }

  clearHomeworkForm() {
    this.newHomework = {
      title: '',
      description: '',
      dueDate: new Date(),
      materialIds: [],
      lessonId: ''
    };
    this.showCreateHomeworkForm = false;
  }

  // ==================== MATERIAL ATTACHMENT ====================

  openAttachModal(material: Material) {
    this.selectedMaterial = material;
    this.showAttachModal = true;
  }

  attachMaterialToLesson(lessonId: string) {
    if (!this.selectedMaterial) return;

    const lesson = this.availableLessons.find(l => l.id === lessonId);
    if (!lesson) {
      this.notificationService.error('Cours introuvable');
      return;
    }

    const request = {
      materialId: this.selectedMaterial.id,
      lessonId: lessonId,
      teacherId: this.currentUser?.id || '',
      studentId: (lesson as {studentId?: string}).studentId || ''
    };

    console.log('🔗 Попытка прикрепить материал:', {
      materialTitle: this.selectedMaterial.title,
      materialId: this.selectedMaterial.id,
      lessonId: lessonId,
      request: request
    });

    this.materialService.attachMaterialToLesson(request).subscribe({
      next: () => {
        console.log('✅ Matériel attaché au cours avec succès');
        console.log('🔗 Материал успешно прикреплен:', request);
        this.notificationService.success(`Matériel "${this.selectedMaterial?.title}" attaché au cours avec succès!`);
        
        // Уведомляем другие компоненты о прикреплении материала
        this.materialService.notifyMaterialAttached(this.selectedMaterial!.id, lessonId);
        
        this.closeAttachModal();
        this.loadMaterials();
      },
      error: (error: unknown) => {
        console.error('❌ Erreur lors de l\'attachement:', error);
        console.error('❌ Детали ошибки прикрепления:', {
          request: request,
          error: error,
          errorMessage: (error as {message?: string}).message || 'Unknown error',
          errorStatus: (error as {status?: number}).status || 0
        });
        this.notificationService.error('Erreur lors de l\'attachement du matériel au cours');
      }
    });
  }

  closeAttachModal() {
    this.selectedMaterial = null;
    this.showAttachModal = false;
  }

  // ==================== UTILITY METHODS ====================

  // Функция для преобразования localhost URL в правильный URL через API Gateway
  getFileUrl(url: string): string {
    if (url.includes('localhost:3008')) {
      return url.replace('http://localhost:3008', `${API_ENDPOINTS.FILES}`);
    }
    return url;
  }

  addTag(event: Event) {
    const target = event.target as HTMLInputElement;
    const tag = target.value.trim();
    if (tag && !this.newMaterial.tags.includes(tag)) {
      this.newMaterial.tags.push(tag);
      target.value = '';
    }
  }

  removeTag(index: number) {
    this.newMaterial.tags.splice(index, 1);
  }

  showFullContent(material: Material) {
    // Здесь можно открыть модальное окно с полным текстом
    // Или использовать матовые Material Design dialog
    this.notificationService.info(`Contenu complet: ${material.content}`);
  }

  onImageError(event: Event) {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.src = 'assets/images/placeholder.png';
    }
  }

  // ==================== HOMEWORK HELPERS ====================

  toggleMaterialForHomework(materialId: string, event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.checked) {
      if (!this.newHomework.materialIds.includes(materialId)) {
        this.newHomework.materialIds.push(materialId);
      }
    } else {
      this.newHomework.materialIds = this.newHomework.materialIds.filter(id => id !== materialId);
    }
  }

  getMaterialTitle(materialId: string): string {
    const material = this.materials.find(m => m.id === materialId);
    return material ? material.title : 'Matériau introuvable';
  }

  getHomeworkStatusText(status: string): string {
    const statusTexts = {
      'assigned': 'Assigné',
      'submitted': 'Soumis',
      'completed': 'Terminé',
      'overdue': 'En retard'
    };
    return statusTexts[status as keyof typeof statusTexts] || status;
  }

  // ==================== TRAINING METHODS ====================

  setActiveTab(tab: string) {
    this.activeTab = tab;
  }

  setActiveMaterialTab(tab: 'own' | 'teachers') {
    this.activeMaterialTab = tab;
  }

  getCurrentMaterials(): Material[] {
    if (this.isTeacher()) {
      // Преподаватели видят только свои материалы
      return this.ownMaterials;
    } else {
      // Студенты видят материалы в зависимости от активной подвкладки
      return this.activeMaterialTab === 'own' ? this.ownMaterials : this.teacherMaterials;
    }
  }

  setAudioTask(task: string) {
    this.audioTask = task;
  }

  checkDictation() {
    this.resultDictation = this.userDictation.toLowerCase().trim() === this.correctDictation
      ? '✅ Верно!' : '❌ Неверно, попробуйте ещё раз.';
  }

  checkChoice(option: string) {
    this.resultChoice = option === this.correctChoice
      ? '✅ Верно!' : '❌ Ошибка, попробуйте ещё раз.';
  }

  reorder(event: string) {
    const index = this.shuffledEvents.indexOf(event);
    if (index > 0) {
      [this.shuffledEvents[index - 1], this.shuffledEvents[index]] =
        [this.shuffledEvents[index], this.shuffledEvents[index - 1]];
    }
  }

  checkSequence() {
    const isCorrect = JSON.stringify(this.shuffledEvents) === JSON.stringify(this.events);
    this.resultSequence = isCorrect
      ? '✅ Всё в правильном порядке!'
      : '❌ Ошибка, попробуйте переставить.';
  }

  checkParaphrase() {
    this.resultParaphrase = this.paraphraseInput.length > 10
      ? '✅ Хороший пересказ!' : '❌ Нужно подробнее.';
  }

  checkIntonation(selectedEmotion: string) {
    this.resultIntonation = selectedEmotion === this.correctIntonation
      ? '✅ Верно!' : '❌ Ошибка.';
  }

  setReadingTask(task: string) {
    this.readingTask = task;
  }

  checkReading(option: string) {
    this.readingResult = option === this.correctReading ? '✅ Верно!' : '❌ Неверно.';
  }

  checkMainIdea(option: string) {
    this.analysisResult = option === this.correctAnalysis ? '✅ Верно!' : '❌ Ошибка, попробуйте ещё раз.';
  }

  checkReadingParaphrase() {
    this.readingParaphraseResult = this.paraphraseReadingInput.toLowerCase().trim() === this.correctParaphraseReading.toLowerCase()
      ? '✅ Хороший пересказ!' : '❌ Нужно подробнее.';
  }

  checkArgumentation(option: string) {
    this.argumentationResult = option === this.correctArgumentation ? '✅ Верно!' : '❌ Ошибка, попробуйте снова.';
  }

  setWritingTask(task: string) {
    this.writingTask = task;
  }

  checkEssayPlan() {
    this.essayFeedback = this.essayPlan.length > 20 ? '✅ Хороший план!' : '❌ Нужно подробнее.';
  }

  checkStyle() {
    const wordCount = this.essayText.split(' ').length;
    if (wordCount < 10) {
      this.styleFeedback = '❌ Текст слишком короткий.';
    } else if (this.essayText.includes('très très') || this.essayText.includes('beaucoup beaucoup')) {
      this.styleFeedback = '⚠️ Используйте более точные выражения.';
    } else {
      this.styleFeedback = '✅ Стиль хороший!';
    }
  }

  checkExpression(option: string) {
    this.expressionFeedback = option === this.correctExpression ? '✅ Верно!' : '❌ Ошибка.';
  }

  generateTopic() {
    this.generatedTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
  }

  checkGeneratedPlan() {
    this.generatedPlanFeedback = this.generatedEssayPlan.length > 20 ? '✅ Хороший план!' : '❌ Нужно подробнее.';
  }

  checkCorrection() {
    this.correctionFeedback = this.correctedSentence.toLowerCase().trim() === this.correctSentence.toLowerCase()
      ? '✅ Верно!' : '❌ Попробуйте снова.';
  }

  setSpeakingTask(task: string) {
    this.speakingTask = task;
  }

  startRecording() {
    this.recording = true;
    this.recordingMessage = '🎙 Запись началась...';
    setTimeout(() => {
      this.recording = false;
      this.recordingMessage = '✔️ Запись завершена!';
    }, 5000);
  }

  generateImprovTopic() {
    this.improvTopic = this.improvTopics[Math.floor(Math.random() * this.improvTopics.length)];
  }

  startImprovTimer() {
    this.improvTimer = true;
    this.improvTimerMessage = '⏳ Время пошло...';
    setTimeout(() => {
      this.improvTimer = false;
      this.improvTimerMessage = '✔️ Время подготовки закончилось!';
    }, 60000);
  }

  checkTranslation() {
    this.translationFeedback = this.userTranslation.toLowerCase().trim() === this.correctTranslation.toLowerCase()
      ? '✅ Отличный перевод!' : '❌ Ошибка, попробуйте ещё раз.';
  }

  checkDialogue(option: string) {
    this.dialogueFeedback = option === this.correctDialogue ? '✅ Хороший ответ!' : '❌ Ошибка, попробуйте снова.';
  }

  setGrammarTask(task: string) {
    this.grammarTask = task;
  }

  checkConnector(option: string) {
    this.connectorResult = option === this.correctConnector ? '✅ Верно!' : '❌ Ошибка.';
  }

  reorderSentence(word: string) {
    const index = this.shuffledSentenceWords.indexOf(word);
    if (index > 0) {
      [this.shuffledSentenceWords[index - 1], this.shuffledSentenceWords[index]] =
        [this.shuffledSentenceWords[index], this.shuffledSentenceWords[index - 1]];
    }
  }

  checkSentenceOrder() {
    const isCorrect = JSON.stringify(this.shuffledSentenceWords) === JSON.stringify(this.correctSentenceOrder);
    this.sentenceOrderResult = isCorrect ? '✅ Всё верно!' : '❌ Ошибка, попробуйте снова.';
  }

  checkVerb(option: string) {
    this.verbResult = option === this.correctVerb ? '✅ Верно!' : '❌ Ошибка.';
  }

  checkContext(option: string) {
    this.contextResult = option === this.correctContext ? '✅ Верно!' : '❌ Ошибка.';
  }

  checkSynonym(option: string) {
    this.synonymResult = option === this.correctSynonym ? '✅ Верно!' : '❌ Ошибка.';
  }

  startExam() {
    this.examStarted = true;
    this.examStep = 'listening';
    this.examScore = 0;
    this.examFeedback = '';
  }

  checkListening(option: string) {
    if (option === this.correctListening) {
      this.examScore += 25;
    }
    this.examStep = 'reading';
  }

  checkWriting() {
    if (this.examWritingAnswer.length > 20) {
      this.examScore += 25;
    }
    this.examStep = 'speaking';
  }

  startSpeakingExam() {
    this.speakingRecording = true;
    this.speakingRecordingMessage = '🎙 Запись началась...';
    setTimeout(() => {
      this.speakingRecording = false;
      this.speakingRecordingMessage = '✔️ Запись завершена!';
      this.examScore += 25;
      this.examStep = 'results';
      this.calculateExamResults();
    }, 5000);
  }

  calculateExamResults() {
    if (this.examScore >= 80) {
      this.examFeedback = '🎉 Поздравляем! Вы сдали экзамен.';
    } else {
      this.examFeedback = '❌ К сожалению, вы не набрали достаточно баллов. Попробуйте снова!';
    }
  }

  restartExam() {
    this.examStarted = false;
    this.examScore = 0;
    this.examStep = 'listening';
  }

  // ==================== AUDIO DEBUG METHODS ====================

  onAudioLoadStart(material: Material) {
    console.log('🎵 Début du chargement audio:', material.title, material.content);
  }

  onAudioLoaded(material: Material) {
    console.log('✅ Audio chargé avec succès:', material.title);
    this.notificationService.success(`Audio "${material.title}" prêt à jouer`);
  }

  onAudioError(event: Event, material: Material) {
    console.error('❌ Erreur de chargement audio:', material.title, event);
    this.notificationService.error(`Impossible de charger l'audio "${material.title}"`);
  }

  onAudioCanPlay(material: Material) {
    console.log('🎵 Audio peut être lu:', material.title);
  }

  onAudioPlay(material: Material) {
    console.log('▶️ Audio démarré:', material.title);
    this.notificationService.success(`Lecture démarrée: ${material.title}`);
  }

  onAudioPause(material: Material) {
    console.log('⏸️ Audio mis en pause:', material.title);
  }

  playAudioManually(audioElement: unknown, material: Material): void {
    console.log('🎵 Forçage lecture audio pour:', material.title);
    const audioElementRef = audioElement as {nativeElement?: HTMLAudioElement};
    if (audioElementRef && audioElementRef.nativeElement) {
      const audio = audioElementRef.nativeElement;
      audio.play().catch((error: unknown) => {
        console.error('❌ Erreur lecture audio:', error);
        this.notificationService.error('Erreur lors de la lecture audio');
      });
    }
  }

  async fullAudioDiagnostic(audioElement: HTMLAudioElement, material: Material) {
    console.log('🔍 === DIAGNOSTIC AUDIO COMPLET ===');
    
    // 1. Informations sur le fichier
    console.log('📁 Fichier:', material.content);
    console.log('📁 Type:', material.type);
    
    // 2. État de l'élément audio
    console.log('🎵 Audio Element State:', {
      readyState: audioElement.readyState,
      networkState: audioElement.networkState,
      currentTime: audioElement.currentTime,
      duration: audioElement.duration,
      volume: audioElement.volume,
      muted: audioElement.muted,
      paused: audioElement.paused,
      ended: audioElement.ended,
      src: audioElement.src
    });
    
    // 3. Support du navigateur
    const mp3Support = audioElement.canPlayType('audio/mpeg');
    const wavSupport = audioElement.canPlayType('audio/wav');
    console.log('🎵 Support formats:', { mp3: mp3Support, wav: wavSupport });
    
    // 4. Audio Context (Web Audio API)
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        const audioContext = new (window.AudioContext || (window as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext || AudioContext)();
        console.log('🎵 AudioContext State:', audioContext.state);
        console.log('🎵 AudioContext Sample Rate:', audioContext.sampleRate);
        
        if (audioContext.state === 'suspended') {
          console.log('⚠️ AudioContext suspendu - tentative de reprise...');
          await audioContext.resume();
          console.log('✅ AudioContext repris:', audioContext.state);
        }
      }
    } catch (contextError) {
      console.error('❌ Erreur AudioContext:', contextError);
    }
    
    // 5. Permissions et politiques
    if ('permissions' in navigator) {
      try {
        const result = await (navigator.permissions as {query: (descriptor: {name: string}) => Promise<{state: string}>}).query({ name: 'autoplay' });
        console.log('🔒 Permission autoplay:', result.state);
      } catch {
        console.log('🔒 Impossible de vérifier les permissions autoplay');
      }
    }
    
    // 6. Test CORS
    try {
      console.log('🌐 Test CORS...');
      const corsResponse = await fetch(material.content, { 
        method: 'HEAD',
        mode: 'cors' 
      });
      console.log('✅ CORS OK:', corsResponse.status);
    } catch (corsError) {
      console.log('❌ CORS Problem:', corsError);
      console.log('💡 Ceci peut être la cause du problème!');
      
      // Test no-cors
      try {
        const _noCorsResponse = await fetch(material.content, { 
          method: 'HEAD',
          mode: 'no-cors' 
        });
        console.log('✅ No-CORS fonctionne');
      } catch {
        console.log('❌ No-CORS aussi échoue');
      }
    }
    
    // 7. Informations URL
    const urlInfo = new URL(material.content);
    console.log('🔗 URL Info:', {
      protocol: urlInfo.protocol,
      host: urlInfo.host,
      pathname: urlInfo.pathname,
      sameOrigin: urlInfo.origin === window.location.origin
    });
    
    console.log('🔍 === FIN DIAGNOSTIC ===');
  }

  getDiagnosticInfo(audioElement: HTMLAudioElement, error: unknown): string {
    const diagnostics = [];
    
    // État de l'élément audio
    diagnostics.push(`ReadyState: ${audioElement.readyState}`);
    diagnostics.push(`NetworkState: ${audioElement.networkState}`);
    diagnostics.push(`Volume: ${audioElement.volume}`);
    diagnostics.push(`Muted: ${audioElement.muted}`);
    diagnostics.push(`Duration: ${audioElement.duration}`);
    
    // Type d'erreur
    const errorObj = error as {name?: string, message?: string};
    if (errorObj.name) diagnostics.push(`Error: ${errorObj.name}`);
    if (errorObj.message) diagnostics.push(`Message: ${errorObj.message}`);
    
    return diagnostics.join(' | ');
  }

  async tryAlternativePlayback(audioElement: HTMLAudioElement, material: Material) {
    console.log('🔄 Tentative d\'approche alternative...');
    
    try {
      // Recharger l'audio
      audioElement.load();
      
      // Attendre le chargement
      await new Promise((resolve) => {
        const onCanPlay = () => {
          audioElement.removeEventListener('canplay', onCanPlay);
          resolve(true);
        };
        audioElement.addEventListener('canplay', onCanPlay);
      });
      
      // Essayer à nouveau
      await audioElement.play();
      console.log('✅ Approche alternative réussie!');
      this.notificationService.success('Lecture alternative réussie!');
      
    } catch (alternativeError) {
      console.error('❌ Approche alternative échouée:', alternativeError);
      this.notificationService.warning('Utilisez "Ouvrir directement" pour écouter le fichier');
    }
  }

  getAudioDebugInfo(material: Material): string {
    const url = material.content;
    const isLocalhost = url.includes('localhost');
    const isHttp = url.startsWith('http');
    const extension = url.split('.').pop()?.toLowerCase();
    
    return `${extension?.toUpperCase() || 'UNKNOWN'} | ${isLocalhost ? 'LOCAL' : 'REMOTE'} | ${isHttp ? 'HTTP' : 'FILE'}`;
  }

  testAudioPlayback(material: Material) {
    console.log('🧪 Test de lecture audio:', material.content);
    
    // Créer un nouvel élément audio pour tester
    const testAudio = new Audio();
    testAudio.preload = 'metadata';
    
    testAudio.addEventListener('loadeddata', () => {
      console.log('✅ Test: Audio chargé');
      this.notificationService.success('Audio test: Fichier chargé correctement');
      
      // Tester la lecture
      testAudio.play().then(() => {
        console.log('✅ Test: Lecture démarrée');
        this.notificationService.success('Audio test: Lecture réussie!');
        
        // Arrêter après 2 secondes
        setTimeout(() => {
          testAudio.pause();
          testAudio.currentTime = 0;
        }, 2000);
      }).catch(error => {
        console.error('❌ Test: Erreur de lecture:', error);
        this.notificationService.error('Audio test: Erreur de lecture - ' + error.message);
      });
    });
    
    testAudio.addEventListener('error', (error) => {
      console.error('❌ Test: Erreur de chargement:', error);
      this.notificationService.error('Audio test: Impossible de charger le fichier');
    });
    
    testAudio.src = material.content;
    testAudio.load();
  }

  // Получение информации о прикрепленных уроках для tooltip
  getAttachedLessonsInfo(material: Material): string {
    if (!material.attachedLessons || material.attachedLessons.length === 0) {
      return 'Aucun cours attaché';
    }

    const lessonInfos: string[] = [];
    
    for (const lessonId of material.attachedLessons) {
      const lesson = this.availableLessons.find(l => l.id === lessonId);
      if (lesson) {
        const lessonData = lesson as {scheduledAt?: string, teacherName?: string, studentName?: string};
        const date = new Date(lessonData.scheduledAt || new Date()).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        const time = new Date(lessonData.scheduledAt || new Date()).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const teacherName = lessonData.teacherName || lessonData.studentName || 'Inconnu';
        lessonInfos.push(`${date} à ${time} avec ${teacherName}`);
      }
    }

    if (lessonInfos.length === 0) {
      return `Attaché à ${material.attachedLessons.length} cours`;
    }

    return `Attaché aux cours:\n${lessonInfos.join('\n')}`;
  }

  // Фильтрация домашних заданий по статусу
  private filterHomeworksByStatus(): void {
    console.log('🔄 Filtering homeworks by status for role:', this.isTeacher() ? 'teacher' : 'student');
    console.log('🔍 Raw homeworks data:', this.homeworks.map(hw => ({
      id: hw.id,
      title: hw.title,
      status: hw.status,
      dueDate: hw.dueDate,
      studentResponse: hw.studentResponse,
      grade: hw.grade,
      isOverdue: this.isOverdue(hw.dueDate)
    })));
    
    const now = new Date();
    console.log('⏰ Current time:', now.toISOString());
    
    if (this.isStudent()) {
      // Student filtering logic
      // Сначала фильтруем завершенные
      this.completedHomeworks = this.homeworks.filter(hw => {
        const isCompleted = hw.status === 'completed' || hw.status === 'submitted' || hw.status === 'finished';
        console.log(`✅ ${hw.title}: status=${hw.status}, isCompleted=${isCompleted}`);
        return isCompleted;
      });
      
      // Затем фильтруем просроченные (unfinished/assigned которые просрочены)
      this.overdueHomeworks = this.homeworks.filter(hw => {
        const dueDate = new Date(hw.dueDate);
        const isPending = hw.status === 'assigned' || hw.status === 'unfinished';
        const isOverdue = now > dueDate;
        const result = isPending && isOverdue;
        console.log(`⏰ ${hw.title}: status=${hw.status}, dueDate=${dueDate.toISOString()}, now=${now.toISOString()}, isOverdue=${isOverdue}, result=${result}`);
        return result;
      });
      
      // Наконец, pending (unfinished/assigned которые не просрочены)
      this.pendingHomeworks = this.homeworks.filter(hw => {
        const dueDate = new Date(hw.dueDate);
        const isPending = hw.status === 'assigned' || hw.status === 'unfinished';
        const isNotOverdue = now <= dueDate;
        const result = isPending && isNotOverdue;
        console.log(`📝 ${hw.title}: status=${hw.status}, dueDate=${dueDate.toISOString()}, now=${now.toISOString()}, isNotOverdue=${isNotOverdue}, result=${result}`);
        return result;
      });
      
      console.log('📊 Student homework filtered by status:');
      console.log('📝 Pending count:', this.pendingHomeworks.length);
      console.log('✅ Completed count:', this.completedHomeworks.length);
      console.log('⏰ Overdue count:', this.overdueHomeworks.length);
    } else if (this.isTeacher()) {
      // Teacher filtering logic
      this.homeworksToReview = this.homeworks.filter(hw => {
        const hasResponse = hw.studentResponse && hw.studentResponse.trim().length > 0;
        const isNotGraded = hw.grade === null || hw.grade === undefined;
        const isFinishedWithResponse = hw.status === 'finished' && hasResponse && isNotGraded;
        const isSubmitted = hw.status === 'submitted';
        const isOverdueUnfinished = hw.status === 'unfinished' && this.isOverdue(hw.dueDate);
        
        const shouldReview = isFinishedWithResponse || isSubmitted || isOverdueUnfinished;
        
        console.log(`🔍 ${hw.title}: status=${hw.status}, hasResponse=${hasResponse}, isNotGraded=${isNotGraded}, shouldReview=${shouldReview}`);
        return shouldReview;
      });
      
      this.reviewedHomeworks = this.homeworks.filter(hw => {
        const isGraded = hw.grade !== null && hw.grade !== undefined;
        console.log(`📊 ${hw.title}: grade=${hw.grade}, isGraded=${isGraded}`);
        return isGraded;
      });

      console.log('📊 Teacher homework filtered by status:');
      console.log('🔍 To review count:', this.homeworksToReview.length);
      console.log('✅ Reviewed count:', this.reviewedHomeworks.length);
      console.log('📊 Breakdown:', {
        finishedWithResponse: this.homeworks.filter(hw => hw.status === 'finished' && hw.studentResponse).length,
        finishedWithResponseNoGrade: this.homeworks.filter(hw => hw.status === 'finished' && hw.studentResponse && !hw.grade).length,
        submitted: this.homeworks.filter(hw => hw.status === 'submitted').length,
        graded: this.homeworks.filter(hw => hw.grade !== null).length
      });
    }
  }

  // Подсветка конкретного домашнего задания
  private highlightHomework(homeworkId: string): void {
    console.log('🎯 Highlighting homework:', homeworkId);
    console.log('📝 Available homeworks count:', this.homeworks.length);
    console.log('📝 Available homeworks IDs:', this.homeworks.map(h => h.id));
    console.log('🔍 Pending homeworks:', this.pendingHomeworks.length);
    console.log('✅ Completed homeworks:', this.completedHomeworks.length);
    console.log('⏰ Overdue homeworks:', this.overdueHomeworks.length);
    
    const homework = this.homeworks.find(hw => hw.id === homeworkId);
    if (homework) {
      console.log('✅ Found homework:', {
        id: homework.id,
        title: homework.title,
        status: homework.status,
        dueDate: homework.dueDate
      });
      
      // Определяем, на какую подвкладку перейти
      if (homework.status === 'completed' || homework.status === 'submitted') {
        this.activeHomeworkTab = 'completed';
      } else if (this.isOverdue(homework.dueDate)) {
        this.activeHomeworkTab = 'overdue';
      } else {
        this.activeHomeworkTab = 'pending';
      }
      
      console.log('📌 Set activeHomeworkTab to:', this.activeHomeworkTab);
      
      // НЕ открываем модалку автоматически, а только прокручиваем к карточке
      // Пользователь должен нажать "Faire le devoir" чтобы открыть модалку
      
      // Прокручиваем к элементу
      setTimeout(() => {
        const element = document.getElementById(`homework-${homeworkId}`);
        if (element) {
          console.log('🎯 Found homework element, scrolling to it');
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('highlighted');
          setTimeout(() => element.classList.remove('highlighted'), 3000);
        } else {
          console.warn('⚠️ Homework element not found in DOM:', `homework-${homeworkId}`);
        }
      }, 500); // Увеличиваем задержку для полной загрузки карточек
    } else {
      console.warn('⚠️ Homework not found:', homeworkId);
      console.log('🔍 All homework data:', this.homeworks);
    }
  }

  // Открытие модали для выполнения домашнего задания
  openHomeworkModal(homework: HomeworkDisplay): void {
    this.selectedHomework = homework;
    this.homeworkResponse = '';
    this.showHomeworkModal = true;
  }

  // Закрытие модали
  closeHomeworkModal(): void {
    this.showHomeworkModal = false;
    this.selectedHomework = null;
    this.homeworkResponse = '';
    this.isSubmittingHomework = false;
  }

  // Завершение домашнего задания
  completeHomework(): void {
    console.log('🚀 COMPLETE HOMEWORK - СТАРТ:', {
      selectedHomework: this.selectedHomework?.id,
      homeworkResponse: this.homeworkResponse,
      responseLength: this.homeworkResponse?.length,
      responseTrimmed: this.homeworkResponse?.trim(),
      trimmedLength: this.homeworkResponse?.trim()?.length
    });

    if (!this.selectedHomework || !this.homeworkResponse.trim()) {
      console.error('❌ No homework selected or empty response:', {
        selectedHomework: this.selectedHomework?.id,
        responseLength: this.homeworkResponse?.length,
        responseValue: this.homeworkResponse,
        trimmedLength: this.homeworkResponse?.trim()?.length
      });
      return;
    }

    console.log('📝 Starting homework completion:', {
      homeworkId: this.selectedHomework.id,
      homeworkTitle: this.selectedHomework.title,
      studentResponse: this.homeworkResponse,
      responseLength: this.homeworkResponse.length,
      responsePreview: this.homeworkResponse.substring(0, 100) + '...'
    });

    this.isSubmittingHomework = true;
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      console.error('❌ Пользователь не авторизован');
      this.isSubmittingHomework = false;
      return;
    }

    console.log('👤 Current user:', currentUser.id);
    console.log('📤 Calling completeHomeworkItem with:', {
      homeworkId: this.selectedHomework.id,
      userId: currentUser.id,
      studentResponse: this.homeworkResponse
    });

    // Используем правильный endpoint для завершения homework с ответом студента
    this.homeworkService.completeHomeworkItem(
      this.selectedHomework.id, 
      currentUser.id, 
      this.homeworkResponse
    ).subscribe({
      next: (response) => {
        console.log('✅ Домашнее задание завершено:', response);
        this.closeHomeworkModal();
        this.loadHomeworks(); // Перезагружаем список для обновления статуса
        
        // Уведомляем об обновлении домашнего задания
        this.homeworkService.notifyHomeworkUpdated();
        
        // Показываем уведомление об успехе
        // this.notificationService.success('Devoir terminé avec succès !');
      },
      error: (error: Error) => {
        console.error('❌ Ошибка при завершении домашнего задания:', error);
        this.isSubmittingHomework = false;
        // this.notificationService.error('Erreur lors de la soumission du devoir');
      }
    });
  }

  // Method to set homework tab
  setHomeworkTab() {
    console.log('🖱️ Clicked homework tab - method called!');
    this.activeTab = 'homework';
    console.log('📌 activeTab set to:', this.activeTab);
  }

  // Method to set materials tab
  setMaterialsTab() {
    console.log('🖱️ Clicked materials tab - method called!');
    this.activeTab = 'materials';
    console.log('📌 activeTab set to:', this.activeTab);
  }

  // Method to set homework subtab for students
  setActiveHomeworkTab(tab: string) {
    this.activeHomeworkTab = tab;
    console.log('🎯 Switched to homework subtab:', tab);
  }

  // Method to set teacher homework subtab
  setActiveTeacherHomeworkTab(tab: string) {
    this.activeTeacherHomeworkTab = tab;
    console.log('🎯 Switched to teacher homework subtab:', tab);
  }

  getDaysUntilDue(dueDate: Date): number {
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  getDaysOverdue(dueDate: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isOverdue(dueDate: Date): boolean {
    const now = new Date();
    const due = new Date(dueDate);
    const isOverdueResult = due < now;
    console.log('🕒 isOverdue check:', {
      dueDate: due.toISOString(),
      now: now.toISOString(),
      isOverdue: isOverdueResult
    });
    return isOverdueResult;
  }

  getCompletedDate(homework: HomeworkDisplay): Date | null {
    // Для завершенных заданий используем дату назначения как заглушку
    // В будущем здесь может быть отдельное поле completedAt
    return homework.assignedAt || null;
  }

  formatCompletedDate(homework: HomeworkDisplay): string | null {
    const date = this.getCompletedDate(homework);
    if (!date) return null;
    
    // Проверяем валидность даты
    if (isNaN(date.getTime())) {
      console.warn('⚠️ Invalid date for homework:', homework.id, date);
      return null;
    }
    
    return date.toLocaleDateString('fr-FR');
  }

  // ==================== TEACHER METHODS FOR GRADING ====================
  
  openGradingModal(homework: HomeworkDisplay): void {
    this.selectedHomeworkForGrading = homework;
    this.gradingData = {
      grade: homework.grade || null,
      teacherFeedback: homework.teacherFeedback || '',
      maxGrade: 20
    };
    this.showGradingModal = true;
    this.isSubmittingGrade = false;
    
    console.log('🎯 Opening grading modal for homework:', {
      id: homework.id,
      title: homework.title,
      student: homework.assignedToName,
      currentGrade: homework.grade,
      currentFeedback: homework.teacherFeedback,
      studentResponse: homework.studentResponse
    });
  }

  closeGradingModal(): void {
    this.showGradingModal = false;
    this.selectedHomeworkForGrading = null;
    this.gradingData = {
      grade: null,
      teacherFeedback: '',
      maxGrade: 20
    };
    this.isSubmittingGrade = false;
  }

  onGradeChange(value: unknown): void {
    // Убеждаемся что grade это число, а не строка
    this.gradingData.grade = value === null || value === undefined || value === '' ? null : Number(value);
    console.log('🎯 Grade changed:', {
      originalValue: value,
      originalType: typeof value,
      convertedValue: this.gradingData.grade,
      convertedType: typeof this.gradingData.grade,
      isValid: this.gradingData.grade !== null && !isNaN(this.gradingData.grade)
    });
  }

  isGradeValid(): boolean {
    return this.gradingData.grade !== null && 
           this.gradingData.grade !== undefined && 
           !isNaN(this.gradingData.grade) &&
           this.gradingData.grade >= 0 && 
           this.gradingData.grade <= this.gradingData.maxGrade;
  }

  submitGrade(): void {
    console.log('🎯 submitGrade called with data:', {
      selectedHomework: this.selectedHomeworkForGrading?.id,
      grade: this.gradingData.grade,
      gradeType: typeof this.gradingData.grade,
      feedback: this.gradingData.teacherFeedback,
      isSubmitting: this.isSubmittingGrade
    });

    if (!this.selectedHomeworkForGrading) {
      console.error('❌ Cannot submit grade: missing homework');
      return;
    }

    if (!this.isGradeValid()) {
      console.error('❌ Cannot submit grade: invalid grade', {
        grade: this.gradingData.grade,
        gradeType: typeof this.gradingData.grade,
        isValid: this.isGradeValid()
      });
      return;
    }

    this.isSubmittingGrade = true;
    
    console.log('📝 Submitting grade:', {
      homeworkId: this.selectedHomeworkForGrading.id,
      grade: this.gradingData.grade,
      teacherFeedback: this.gradingData.teacherFeedback
    });

    this.homeworkService.gradeHomeworkItem(
      this.selectedHomeworkForGrading.id,
      this.gradingData.grade!,
      this.gradingData.teacherFeedback.trim() || undefined
    ).subscribe({
      next: (response) => {
        console.log('✅ Grade submitted successfully:', response);
        this.closeGradingModal();
        this.loadHomeworks(); // Reload homework to see updated grade
        
        // Notify about homework update
        this.homeworkService.notifyHomeworkUpdated();
        
        // TODO: Show success notification
        // this.notificationService.success('Évaluation enregistrée avec succès !');
      },
      error: (error) => {
        console.error('❌ Error submitting grade:', error);
        this.isSubmittingGrade = false;
        // TODO: Show error notification
        // this.notificationService.error('Erreur lors de l\'enregistrement de l\'évaluation');
      }
    });
  }

  goToHomeworkReview(homework: HomeworkDisplay): void {
    // Open the grading modal for detailed review
    this.openGradingModal(homework);
  }

  // ==================== HOMEWORK EXPANSION METHODS ====================
  
  toggleHomeworkExpansion(homeworkId: string): void {
    if (this.selectedExpandedHomework === homeworkId) {
      this.selectedExpandedHomework = null;
    } else {
      this.selectedExpandedHomework = homeworkId;
    }
  }

  getGradedDate(homework: HomeworkDisplay): string {
    // TODO: В будущем можно добавить поле gradedAt в entity
    // Пока используем дату создания как примерную дату оценивания
    if (homework.createdAt) {
      return new Date(homework.createdAt).toLocaleDateString('fr-FR');
    }
    if (homework.assignedAt) {
      return new Date(homework.assignedAt).toLocaleDateString('fr-FR');
    }
    return 'Date inconnue';
  }

  getGradeClass(grade: number | undefined): string {
    if (!grade) return '';
    if (grade >= 16) return 'excellent';
    if (grade >= 12) return 'good';
    if (grade >= 8) return 'average';
    return 'poor';
  }

  getGradeLabel(grade: number | undefined): string {
    if (!grade) return '';
    if (grade >= 16) return 'Excellent';
    if (grade >= 12) return 'Bien';
    if (grade >= 8) return 'Passable';
    return 'Insuffisant';
  }

  viewHomeworkHistory(homework: HomeworkDisplay): void {
    // TODO: Implement homework history modal
    console.log('📋 Viewing homework history for:', homework.id);
    // For now, just log the information
    console.log('Homework details:', {
      title: homework.title,
      student: homework.assignedToName,
      grade: homework.grade,
      feedback: homework.teacherFeedback,
      dueDate: homework.dueDate,
      assignedAt: homework.assignedAt
    });
  }

  // Helper методы для форматирования дат в шаблоне
  getFormattedDate(date: unknown): string {
    if (!date) return '';
    try {
      return new Date(date as string | Date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }

  getFormattedDateTime(date: unknown): string {
    if (!date) return '';
    try {
      return new Date(date as string | Date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  }
}
